import * as THREE from "three";
import { logSpectrum } from "../../audio/features.ts";
import type { AudioFrame } from "../../audio/features.ts";
import {
  resolveHex,
  resolvePalette,
  rotateHex,
  themeById,
  type ColorSettings,
} from "../color.ts";
import type { AnyPreset, BarsPreset, VisContext, Visualization } from "../types.ts";

const BAR_COUNT = 80;

// WMP XP reference colors (wmpvis wiki gallery): Bars and Scope are
// yellow-green with small white peak caps; Ocean Mist is a pure-blue filled
// spectrum silhouette with white mist sparkle; Fire Storm is the same
// silhouette in orange with a dark-red feathered fringe.
const BAR_GREEN = "#9acd32";
const CAP_WHITE = "#f4f8ec";
const SCOPE_GREEN = "#a8d820";

const SPECTRUM_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Filled spectrum silhouette with per-column feathered striations, matching
// the WMP Ocean Mist / Fire Storm look (not layered scrolling mountains).
const SPECTRUM_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tFreq;
uniform vec2 uResolution;
uniform float uMode;
uniform float uBass;
uniform float uAlive;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uHot;
varying vec2 vUv;

float spec(float x) {
  float t = pow(clamp(x, 0.0, 1.0), 1.15);
  return texture2D(tFreq, vec2(t, 0.5)).r;
}

float hash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

void main() {
  float px = floor(vUv.x * uResolution.x);
  float n = hash(px);
  float s = clamp(spec(vUv.x) * 1.9, 0.0, 1.0);
  float h = pow(s, 0.8) * 0.7 * (0.3 + 0.7 * uAlive) + 0.03 * uAlive;
  float y = vUv.y;

  float fill = step(y, h);
  float reach = h + n * (0.08 + 0.3 * s);
  float feather = step(y, reach) * (1.0 - fill);

  vec3 col;
  if (uMode < 0.5) {
    col = fill * uMid;
    col += feather * uMid * (0.55 + 0.45 * n);
    float sparkle = step(0.982, hash(px * 0.73 + floor(y * uResolution.y) * 0.61));
    col += (feather + fill * step(h - 0.02, y)) * sparkle * uHot * (0.6 + uBass * 0.5);
  } else {
    col = fill * uMid;
    col += feather * mix(uDeep, uMid, n * n * 0.55);
  }
  col *= max(0.12, uAlive);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createBarsAndWaves(): Visualization {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let bars: THREE.InstancedMesh | null = null;
  let caps: THREE.InstancedMesh | null = null;
  let scope: THREE.Line | null = null;
  let scopePos: THREE.BufferAttribute | null = null;
  let mountains: THREE.Mesh | null = null;
  let mountainMat: THREE.ShaderMaterial | null = null;
  const dummy = new THREE.Object3D();
  const peaks = new Float32Array(BAR_COUNT);
  const levels = new Float32Array(BAR_COUNT);
  let freqTex: THREE.DataTexture | null = null;
  let barMat: THREE.MeshBasicMaterial | null = null;
  let capMat: THREE.MeshBasicMaterial | null = null;
  let scopeMat: THREE.LineBasicMaterial | null = null;

  const presets: BarsPreset[] = [
    { id: "bars", name: "Bars", kind: "bars", mode: "bars" },
    { id: "ocean-mist", name: "Ocean Mist", kind: "bars", mode: "ocean" },
    { id: "fire-storm", name: "Fire Storm", kind: "bars", mode: "fire" },
    { id: "scope", name: "Scope", kind: "bars", mode: "scope" },
  ];

  return {
    id: "bars-and-waves",
    name: "Bars and Waves",
    family: "bars-and-waves",
    era: "WMP 7–12",
    presets,
    mount(ctx: VisContext) {
      renderer = ctx.renderer;
      freqTex = ctx.audioTextures.freq;
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 0.62, -0.62, 0.1, 10);
      camera.position.z = 2;

      const barGeo = new THREE.BoxGeometry(1, 1, 1);
      barGeo.translate(0, 0.5, 0);
      barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BAR_GREEN) });
      bars = new THREE.InstancedMesh(barGeo, barMat, BAR_COUNT);
      bars.frustumCulled = false;
      scene.add(bars);

      const capGeo = new THREE.BoxGeometry(1, 1, 1);
      capMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(CAP_WHITE) });
      caps = new THREE.InstancedMesh(capGeo, capMat, BAR_COUNT);
      caps.frustumCulled = false;
      scene.add(caps);

      const scopeGeo = new THREE.BufferGeometry();
      const pts = new Float32Array(256 * 3);
      scopePos = new THREE.BufferAttribute(pts, 3);
      scopeGeo.setAttribute("position", scopePos);
      scopeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(SCOPE_GREEN) });
      scope = new THREE.Line(scopeGeo, scopeMat);
      scope.visible = false;
      scene.add(scope);

      mountainMat = new THREE.ShaderMaterial({
        vertexShader: SPECTRUM_VERT,
        fragmentShader: SPECTRUM_FRAG,
        uniforms: {
          tFreq: { value: freqTex },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uMode: { value: 0 },
          uBass: { value: 0 },
          uAlive: { value: 0 },
          uDeep: { value: new THREE.Color("#3a0a02") },
          uMid: { value: new THREE.Color("#1414f0") },
          uHot: { value: new THREE.Color("#ffffff") },
        },
        depthTest: false,
      });
      mountains = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mountainMat);
      mountains.visible = false;
      scene.add(mountains);
    },
    frame(audio: AudioFrame, preset: AnyPreset, dt: number, color: ColorSettings) {
      if (!renderer || !scene || !camera || preset.kind !== "bars") return;
      const mode = preset.mode;
      const alive = audio.activity;
      if (bars) bars.visible = mode === "bars";
      if (caps) caps.visible = mode === "bars";
      if (scope) scope.visible = mode === "scope";
      if (mountains) mountains.visible = mode === "ocean" || mode === "fire";

      const themePal = themeById(color.theme).palette;
      barMat?.color.set(resolveHex(BAR_GREEN, color));
      capMat?.color.set(
        themePal ? rotateHex(themePal[themePal.length - 1]!, color.hue) : CAP_WHITE,
      );
      scopeMat?.color.set(resolveHex(SCOPE_GREEN, color));

      if (mode === "bars" && bars && caps) {
        const fall = audio.playing ? 5.2 : 1.6;
        for (let i = 0; i < BAR_COUNT; i++) {
          const t = i / (BAR_COUNT - 1);
          const raw = logSpectrum(audio.freq, t);
          // Soft-knee boost plus a high-frequency tilt so the whole width
          // participates, like the original's per-band scaling.
          const target = Math.min(1, Math.pow(raw, 0.58) * (0.55 + 0.85 * t));
          const prev = levels[i] ?? 0;
          const next = target > prev ? target : prev * Math.exp(-fall * dt);
          levels[i] = next;
          const pk = peaks[i] ?? 0;
          peaks[i] = target > pk ? target : pk - dt * (audio.playing ? 0.22 : 0.12);
          const h = Math.max(0.004, next * 1.16) * Math.max(0.04, alive);
          const x = (i / (BAR_COUNT - 1)) * 1.94 - 0.97;
          const w = 1.94 / BAR_COUNT;
          dummy.position.set(x, -0.62, 0);
          dummy.scale.set(w * 0.68, h, 0.2);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          bars.setMatrixAt(i, dummy.matrix);
          dummy.position.set(x, -0.62 + (peaks[i] ?? 0) * 1.16 + 0.012, 0);
          dummy.scale.set(w * 0.68, 0.008, 0.2);
          dummy.updateMatrix();
          caps.setMatrixAt(i, dummy.matrix);
        }
        bars.instanceMatrix.needsUpdate = true;
        caps.instanceMatrix.needsUpdate = true;
      }

      if (mode === "scope" && scope && scopePos) {
        const arr = scopePos.array as Float32Array;
        const n = 256;
        const amp = 0.46 * Math.max(0.05, alive);
        for (let i = 0; i < n; i++) {
          const src = Math.floor((i / n) * audio.time.length);
          const v = audio.time[src] ?? 0;
          arr[i * 3] = (i / (n - 1)) * 1.9 - 0.95;
          arr[i * 3 + 1] = v * amp;
          arr[i * 3 + 2] = 0;
        }
        scopePos.needsUpdate = true;
      }

      if ((mode === "ocean" || mode === "fire") && mountainMat) {
        const pal = resolvePalette(
          mode === "fire"
            ? ["#4a0a02", "#ffa000", "#ffe0a0"]
            : ["#04041a", "#1414f0", "#ffffff"],
          color,
        );
        const size = renderer.getDrawingBufferSize(new THREE.Vector2());
        (mountainMat.uniforms.uResolution!.value as THREE.Vector2).set(size.x, size.y);
        mountainMat.uniforms.uMode!.value = mode === "fire" ? 1 : 0;
        mountainMat.uniforms.uBass!.value = audio.bassAtt;
        mountainMat.uniforms.uAlive!.value = alive;
        (mountainMat.uniforms.uDeep!.value as THREE.Color).set(pal[0] ?? "#04041a");
        (mountainMat.uniforms.uMid!.value as THREE.Color).set(pal[1] ?? "#1414f0");
        (mountainMat.uniforms.uHot!.value as THREE.Color).set(pal[2] ?? "#ffffff");
      }

      renderer.render(scene, camera);
    },
    resize() {
      /* ortho scene is NDC-sized */
    },
    dispose() {
      bars?.geometry.dispose();
      (bars?.material as THREE.Material | undefined)?.dispose();
      caps?.geometry.dispose();
      (caps?.material as THREE.Material | undefined)?.dispose();
      scope?.geometry.dispose();
      (scope?.material as THREE.Material | undefined)?.dispose();
      mountains?.geometry.dispose();
      mountainMat?.dispose();
      scene?.clear();
      bars = null;
      caps = null;
      scope = null;
      mountains = null;
      scene = null;
      camera = null;
      renderer = null;
    },
  };
}
