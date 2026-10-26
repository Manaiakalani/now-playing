import * as THREE from "three";
import { logSpectrum } from "../../audio/features.ts";
import type { AudioFrame } from "../../audio/features.ts";
import { resolveHex, type ColorSettings } from "../color.ts";
import type { AnyPreset, SpikesPreset, VisContext, Visualization } from "../types.ts";

// WMP XP reference (wmpvis wiki): "Spike" is a dense yellow starburst of
// hundreds of thin lines radiating from the center; "Amoeba" is a faint
// dotted jagged loop on black.
const SPIKE_COUNT = 420;
const AMOEBA_COUNT = 220;
const SPIKE_YELLOW = "#f0f020";
const AMOEBA_PALE = "#dce8b4";

function jitter(i: number): number {
  return (Math.sin(i * 12.9898) * 43758.5453) % 1;
}

export function createSpikes(): Visualization {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let lines: THREE.LineSegments | null = null;
  let amoeba: THREE.Points | null = null;
  let linePos: THREE.BufferAttribute | null = null;
  let amoebaPos: THREE.BufferAttribute | null = null;
  let lineColor: THREE.BufferAttribute | null = null;
  let amoebaMat: THREE.PointsMaterial | null = null;
  const smooth = new Float32Array(SPIKE_COUNT);
  let spin = 0;

  const presets: SpikesPreset[] = [
    { id: "spike", name: "Spike", kind: "spikes", mode: "spike" },
    { id: "amoeba", name: "Amoeba", kind: "spikes", mode: "amoeba" },
  ];

  return {
    id: "spikes",
    name: "Spikes",
    family: "bars-and-waves",
    era: "WMP 7–10",
    presets,
    mount(ctx: VisContext) {
      renderer = ctx.renderer;
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 2;

      const lg = new THREE.BufferGeometry();
      linePos = new THREE.BufferAttribute(new Float32Array(SPIKE_COUNT * 2 * 3), 3);
      lineColor = new THREE.BufferAttribute(new Float32Array(SPIKE_COUNT * 2 * 3), 3);
      lg.setAttribute("position", linePos);
      lg.setAttribute("color", lineColor);
      lines = new THREE.LineSegments(
        lg,
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }),
      );
      scene.add(lines);

      const ag = new THREE.BufferGeometry();
      amoebaPos = new THREE.BufferAttribute(new Float32Array(AMOEBA_COUNT * 3), 3);
      ag.setAttribute("position", amoebaPos);
      amoebaMat = new THREE.PointsMaterial({
        color: new THREE.Color(AMOEBA_PALE),
        size: 2.5,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.8,
      });
      amoeba = new THREE.Points(ag, amoebaMat);
      scene.add(amoeba);
    },
    frame(audio: AudioFrame, preset: AnyPreset, dt: number, color: ColorSettings) {
      if (!renderer || !scene || !camera || preset.kind !== "spikes") return;
      const spike = preset.mode === "spike";
      const alive = audio.activity;
      if (lines) lines.visible = spike;
      if (amoeba) amoeba.visible = !spike;
      spin += dt * (0.1 + audio.bassAtt * 0.15) * (audio.playing ? 1 : alive);

      const fall = audio.playing ? 4.2 : 1.5;
      for (let i = 0; i < SPIKE_COUNT; i++) {
        // Scrambled spectrum sampling so neighbouring spikes differ in length,
        // giving the fuzzy starburst edge of the original.
        const raw =
          logSpectrum(audio.freq, ((i * 7) % SPIKE_COUNT) / SPIKE_COUNT) *
          (0.55 + Math.abs(jitter(i)) * 0.65);
        const prev = smooth[i] ?? 0;
        smooth[i] = raw > prev ? raw : prev * Math.exp(-fall * dt);
      }

      if (spike && linePos && lineColor) {
        const accent = resolveHex(SPIKE_YELLOW, color);
        const c = new THREE.Color(accent);
        const cTip = c.clone().multiplyScalar(0.72);
        const pos = linePos.array as Float32Array;
        const col = lineColor.array as Float32Array;
        for (let i = 0; i < SPIKE_COUNT; i++) {
          const a =
            (i / SPIKE_COUNT) * Math.PI * 2 +
            Math.abs(jitter(i * 3 + 1)) * 0.09 +
            spin;
          const len =
            (0.06 + (smooth[i] ?? 0) * 0.62 + Math.abs(jitter(i * 5 + 2)) * 0.05) *
            Math.max(0.05, alive);
          const i2 = i * 6;
          pos[i2] = 0;
          pos[i2 + 1] = 0;
          pos[i2 + 2] = 0;
          pos[i2 + 3] = Math.cos(a) * len;
          pos[i2 + 4] = Math.sin(a) * len;
          pos[i2 + 5] = 0;
          col[i2] = c.r;
          col[i2 + 1] = c.g;
          col[i2 + 2] = c.b;
          col[i2 + 3] = cTip.r;
          col[i2 + 4] = cTip.g;
          col[i2 + 5] = cTip.b;
        }
        linePos.needsUpdate = true;
        lineColor.needsUpdate = true;
      }

      if (!spike && amoebaPos && amoebaMat) {
        amoebaMat.color.set(
          color.theme === "preset" ? AMOEBA_PALE : resolveHex(AMOEBA_PALE, color),
        );
        amoebaMat.opacity = 0.25 + 0.6 * Math.min(1, alive * 1.4);
        const pos = amoebaPos.array as Float32Array;
        for (let i = 0; i < AMOEBA_COUNT; i++) {
          const a = (i / AMOEBA_COUNT) * Math.PI * 2 + spin * 0.6;
          const si = Math.floor((i / AMOEBA_COUNT) * SPIKE_COUNT);
          const i0 = (si + SPIKE_COUNT - 1) % SPIKE_COUNT;
          const i1 = (si + 1) % SPIKE_COUNT;
          const sm = ((smooth[i0] ?? 0) + (smooth[si] ?? 0) + (smooth[i1] ?? 0)) / 3;
          const jag = Math.abs(jitter(i * 11 + 4)) * 0.05 * (0.4 + alive);
          const r = (0.24 + sm * 0.5 + audio.bassAtt * 0.06 + jag) * Math.max(0.12, alive);
          pos[i * 3] = Math.cos(a) * r;
          pos[i * 3 + 1] = Math.sin(a) * r;
          pos[i * 3 + 2] = 0;
        }
        amoebaPos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    },
    resize() {},
    dispose() {
      lines?.geometry.dispose();
      (lines?.material as THREE.Material | undefined)?.dispose();
      amoeba?.geometry.dispose();
      (amoeba?.material as THREE.Material | undefined)?.dispose();
      scene?.clear();
      lines = null;
      amoeba = null;
      scene = null;
      camera = null;
      renderer = null;
    },
  };
}
