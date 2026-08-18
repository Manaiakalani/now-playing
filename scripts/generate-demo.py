#!/usr/bin/env python3
"""Generate the bundled CC0-style demo loop (no third-party samples)."""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 22050
BPM = 120
SECONDS = 32


def env_exp(t: float, attack: float = 0.002, decay: float = 0.2) -> float:
    if t < 0:
        return 0.0
    if t < attack:
        return t / attack
    return math.exp(-(t - attack) / decay)


def main() -> None:
    random.seed(7)
    beat = 60 / BPM
    n = SR * SECONDS
    samples = [0.0] * n

    def add_tone(start: float, dur: float, freq: float, amp: float, decay: float, shape: str = "sin") -> None:
        length = int(dur * SR)
        s0 = int(start * SR)
        for i in range(length):
            idx = s0 + i
            if idx >= n:
                break
            t = i / SR
            e = env_exp(t, 0.004, decay)
            ph = 2 * math.pi * freq * t
            if shape == "sin":
                v = math.sin(ph)
            elif shape == "tri":
                v = 2 * abs(2 * ((freq * t) % 1) - 1) - 1
            else:
                v = 1.0 if math.sin(ph) > 0 else -1.0
            samples[idx] += amp * e * v

    def add_noise(start: float, dur: float, amp: float, decay: float) -> None:
        length = int(dur * SR)
        s0 = int(start * SR)
        prev = 0.0
        for i in range(length):
            idx = s0 + i
            if idx >= n:
                break
            t = i / SR
            e = env_exp(t, 0.001, decay)
            w = random.uniform(-1, 1) - prev
            prev = w
            samples[idx] += amp * e * w

    prog = [110.0, 146.83, 164.81, 130.81]
    arp = [0, 3, 7, 10, 12, 10, 7, 3]
    bar = 4 * beat
    t = 0.0
    bar_i = 0
    while t < SECONDS - 0.2:
        root = prog[bar_i % 4]
        for k in (0, 2):
            add_tone(t + k * beat, 0.35, 55, 0.9, 0.12)
            add_tone(t + k * beat, 0.12, 90, 0.35, 0.05)
        for k in (1, 3):
            add_noise(t + k * beat, 0.18, 0.45, 0.06)
            add_tone(t + k * beat, 0.12, 180, 0.18, 0.04)
        for s in range(8):
            add_noise(t + s * beat / 2, 0.05, 0.12 if s % 2 == 0 else 0.07, 0.02)
        for k in range(4):
            add_tone(t + k * beat, 0.42, root * (1 if k < 3 else 1.5), 0.38, 0.18, "tri")
        for s in range(8):
            freq = root * 2 * (2 ** (arp[s % len(arp)] / 12))
            add_tone(t + s * beat / 2, 0.22, freq, 0.16, 0.10)
        add_tone(t, bar, root * 2, 0.05, 0.9)
        add_tone(t, bar, root * 3, 0.03, 0.9)
        t += bar
        bar_i += 1

    peak = max(abs(x) for x in samples) or 1.0
    out = Path(__file__).resolve().parents[1] / "public" / "demo.wav"
    with wave.open(str(out), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        frames = bytearray()
        for x in samples:
            v = max(-1.0, min(1.0, x / peak * 0.9))
            frames += struct.pack("<h", int(v * 32767))
        wav.writeframes(frames)
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
