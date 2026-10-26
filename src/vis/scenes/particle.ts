import * as THREE from "three";
import type { AudioFrame } from "../../audio/features.ts";
import { resolvePalette, type ColorSettings } from "../color.ts";
import type { AnyPreset, ParticlePreset, VisContext, Visualization } from "../types.ts";

const N = 22;

export function createParticle(): Visualization {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let points: THREE.Points | null = null;
  let pos: THREE.BufferAttribute | null = null;
  let group: THREE.Group | null = null;
  let colAttr: THREE.BufferAttribute | null = null;
  let pointsMat: THREE.PointsMaterial | null = null;
  let angle = 0;
  let time = 0;
  let palKey = "";
  const heights = new Float32Array(N * N);

  // WMP XP reference: a tilted sheet of tiny dots fading magenta at the far
  // edge through violet and blue to cyan up close.
  const baseColors = ["#d840d8", "#8848e0", "#3a78e0", "#30c8c4"];

  const presets: ParticlePreset[] = [
    { id: "particle", name: "Particle", kind: "particle", rotate: false },
    { id: "rotating-particle", name: "Rotating Particle", kind: "particle", rotate: true },
  ];

  return {
    id: "particle",
    name: "Particle",
    family: "bars-and-waves",
    era: "WMP 7–10",
    presets,
    mount(ctx: VisContext) {
      palKey = "";
      renderer = ctx.renderer;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
      camera.position.set(0, 0.9, 4.2);
      camera.lookAt(0, 0, 0);
      group = new THREE.Group();
      scene.add(group);

      const count = N * N;
      const positions = new Float32Array(count * 3);
      const cols = new Float32Array(count * 3);
      const c = new THREE.Color();
      let i = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          positions[i * 3] = (x / (N - 1) - 0.5) * 3.2;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (y / (N - 1) - 0.5) * 3.2;
          // Depth gradient: far rows magenta, near rows cyan.
          c.set(baseColors[Math.min(baseColors.length - 1, Math.floor((y / N) * baseColors.length))]!);
          cols[i * 3] = c.r;
          cols[i * 3 + 1] = c.g;
          cols[i * 3 + 2] = c.b;
          i++;
        }
      }
      const geo = new THREE.BufferGeometry();
      pos = new THREE.BufferAttribute(positions, 3);
      geo.setAttribute("position", pos);
      colAttr = new THREE.BufferAttribute(cols, 3);
      geo.setAttribute("color", colAttr);
      pointsMat = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1,
      });
      points = new THREE.Points(geo, pointsMat);
      group.add(points);
    },
    frame(audio: AudioFrame, preset: AnyPreset, dt: number, color: ColorSettings) {
      if (!renderer || !scene || !camera || !pos || !group || preset.kind !== "particle") return;
      const arr = pos.array as Float32Array;
      const bins = audio.freq;
      const alive = audio.activity;
      time += dt;
      const pal = resolvePalette(baseColors, color);
      const nextKey = `${color.theme}:${color.hue.toFixed(3)}:${pal.join(",")}`;
      if (colAttr && nextKey !== palKey) {
        palKey = nextKey;
        const cols = colAttr.array as Float32Array;
        const c = new THREE.Color();
        let k = 0;
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            c.set(pal[Math.min(pal.length - 1, Math.floor((y / N) * pal.length))] ?? "#30c8c4");
            cols[k * 3] = c.r;
            cols[k * 3 + 1] = c.g;
            cols[k * 3 + 2] = c.b;
            k++;
          }
        }
        colAttr.needsUpdate = true;
      }
      const fall = audio.playing ? 6 : 1.7;
      let i = 0;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const t = (x + y) / (2 * (N - 1));
          const idx = Math.floor(t * t * (bins.length - 1));
          const v = (bins[idx] ?? 0) / 255;
          const wave =
            Math.sin(x * 0.45 + time * 1.4 + audio.bassAtt * 2.2) *
            Math.cos(y * 0.4 + time * 1.1) *
            (0.05 + audio.rmsAtt * 0.4) *
            alive;
          const target = audio.playing ? (v * 1.2 + wave) * Math.max(0.04, alive) : (heights[i] ?? 0) * 0.96;
          const prev = heights[i] ?? 0;
          heights[i] = target > prev ? target : prev * Math.exp(-fall * dt);
          arr[i * 3 + 1] = heights[i] ?? 0;
          i++;
        }
      }
      pos.needsUpdate = true;
      if (pointsMat) {
        pointsMat.size = 0.024 + 0.022 * alive;
        pointsMat.opacity = Math.max(0.08, alive);
      }
      if (preset.rotate) {
        angle += dt * (0.2 + audio.bassAtt * 0.25) * (audio.playing ? 1 : Math.max(0.15, alive));
        group.rotation.y = angle;
      } else {
        group.rotation.y += dt * 0.04 * alive;
      }
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      camera.aspect = size.x / Math.max(1, size.y);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    },
    resize() {},
    dispose() {
      points?.geometry.dispose();
      (points?.material as THREE.Material | undefined)?.dispose();
      scene?.clear();
      points = null;
      group = null;
      scene = null;
      camera = null;
      renderer = null;
      palKey = "";
    },
  };
}
