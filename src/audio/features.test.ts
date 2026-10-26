import { describe, expect, it } from "vitest";
import {
  analyzeFrame,
  applyEnvelopes,
  attenuate,
  compress,
  createAudioFrame,
  createBeatState,
  createEnvelopeState,
  formatTime,
  logSpectrum,
} from "./features.ts";

describe("compress", () => {
  it("maps zero and negatives to zero", () => {
    expect(compress(0)).toBe(0);
    expect(compress(-2)).toBe(0);
  });

  it("soft-clips large values toward 1", () => {
    expect(compress(0.2)).toBeCloseTo(0.2 / (0.62 + 0.2), 5);
    expect(compress(8)).toBeLessThan(1);
    expect(compress(8)).toBeGreaterThan(compress(1));
  });
});

describe("attenuate", () => {
  it("rises faster than it falls", () => {
    const up = attenuate(0.1, 1);
    const down = attenuate(1, 0.1);
    expect(up).toBeCloseTo(0.1 * 0.78 + 1 * 0.22, 5);
    expect(down).toBeCloseTo(1 * 0.9 + 0.1 * 0.1, 5);
    expect(up - 0.1).toBeGreaterThan(1 - down);
  });
});

describe("formatTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(9.9)).toBe("0:09");
  });

  it("guards invalid input", () => {
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(-4)).toBe("0:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
  });
});

describe("logSpectrum", () => {
  it("interpolates and clamps", () => {
    const freq = new Uint8Array([0, 127, 255]);
    expect(logSpectrum(freq, -1)).toBeGreaterThanOrEqual(0);
    expect(logSpectrum(freq, 2)).toBeLessThanOrEqual(1);
    expect(logSpectrum(freq, 1)).toBeCloseTo(1, 5);
  });

  it("is continuous across the linear/log warp boundary", () => {
    const freq = new Uint8Array(256);
    for (let i = 0; i < freq.length; i++) freq[i] = i;
    const below = logSpectrum(freq, 0.18 - 1e-4);
    const above = logSpectrum(freq, 0.18 + 1e-4);
    expect(Math.abs(above - below)).toBeLessThan(0.01);
  });
});

describe("analyzeFrame", () => {
  it("does not fire a beat on silence", () => {
    const frame = createAudioFrame(32);
    const beat = createBeatState(16);
    analyzeFrame(frame, beat, 44100);
    expect(frame.rms).toBe(0);
    expect(frame.beat.isBeat).toBe(false);
    expect(frame.bass).toBe(0);
  });

  it("detects a flux spike after a quiet baseline", () => {
    const frame = createAudioFrame(32);
    const beat = createBeatState(16);
    analyzeFrame(frame, beat, 44100);
    frame.time.fill(0.2);
    frame.freq.fill(200);
    analyzeFrame(frame, beat, 44100);
    expect(frame.rms).toBeGreaterThan(0.02);
    expect(frame.beat.isBeat).toBe(true);
    expect(beat.hold).toBe(8);
  });
});

describe("applyEnvelopes", () => {
  it("decays pulse when energy drops", () => {
    const frame = createAudioFrame(32);
    const env = createEnvelopeState();
    frame.rms = 0.4;
    frame.bass = 0.3;
    applyEnvelopes(frame, env, 1 / 60);
    const peak = frame.pulse;
    expect(peak).toBeGreaterThan(0);
    frame.rms = 0;
    frame.bass = 0;
    applyEnvelopes(frame, env, 0.5);
    expect(frame.pulse).toBeLessThan(peak);
  });
});
