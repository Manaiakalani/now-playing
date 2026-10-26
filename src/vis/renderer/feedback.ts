import * as THREE from "three";
import type { AudioFrame } from "../../audio/features.ts";
import {
  resolvePalette,
  rotateHex,
  themeById,
  type ColorSettings,
} from "../color.ts";
import type { FeedbackPreset } from "../types.ts";
import type { AudioTextures } from "./audioTextures.ts";
import { makePaletteTexture, writePalette } from "./palette.ts";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FEEDBACK_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tPrev;
uniform sampler2D tFreq;
uniform sampler2D tWave;
uniform sampler2D tPalette;
uniform vec2 uResolution;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uRms;
uniform float uShift;
uniform float uDraw;
uniform float uDecay;
uniform float uHueShift;
uniform float uShiftStrength;
uniform float uInk;
uniform float uKaleidoSlices;
uniform float uSeed;
uniform float uDrift;
uniform float uPlaying;
uniform vec3 uBase;
varying vec2 vUv;

float freqAt(float t) {
  return texture2D(tFreq, vec2(clamp(t, 0.001, 0.999), 0.5)).r;
}
float waveAt(float t) {
  return texture2D(tWave, vec2(clamp(t, 0.001, 0.999), 0.5)).r * 2.0 - 1.0;
}

vec2 rotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 applyShift(vec2 uv) {
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float s = uShiftStrength * 0.55;
  float r = length(p);
  float a = atan(p.y, p.x);
  a += uTime * 0.04 * uDrift;
  r *= 0.996;

  if (uShift < 0.5) {
    a += r * (0.55 + uBass * 0.35) * s + uTime * 0.05;
    r *= 0.994;
    p = vec2(cos(a), sin(a)) * r;
  } else if (uShift < 1.5) {
    float slices = max(uKaleidoSlices, 3.0);
    float seg = 6.2831853 / slices;
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    r *= 0.995;
    p = vec2(cos(a), sin(a)) * r;
    p = rotate(p, uTime * 0.03);
  } else if (uShift < 2.5) {
    p += normalize(p + 0.0001) * (0.012 * s * (0.6 + uBass * 0.3)) * sin(a * 3.0 + uTime * 0.4);
    p *= 0.995;
  } else if (uShift < 3.5) {
    p *= 0.988 - uBass * 0.01 * s;
  } else if (uShift < 4.5) {
    float tiles = 3.0 + floor(uSeed * 2.0);
    p = (fract(p * tiles + 0.5) - 0.5) / tiles;
    p *= 0.995;
    p = rotate(p, uTime * 0.025);
  } else if (uShift < 5.5) {
    a += sin(r * 3.0 - uTime * 0.35) * 0.18 * s;
    r *= 0.994;
    p = vec2(cos(a), sin(a)) * r;
  } else if (uShift < 6.5) {
    p = rotate(p, 0.22 * s * (0.35 - r) + uTime * 0.03);
    p *= 0.995;
  } else if (uShift < 7.5) {
    p.y += 0.008 * s;
  } else if (uShift < 8.5) {
    p.y -= 0.008 * s;
  } else if (uShift < 9.5) {
    p.x -= 0.008 * s;
  } else if (uShift < 10.5) {
    p.x += 0.008 * s;
  } else if (uShift < 11.5) {
    float t = a + r * 1.8 + uTime * 0.08 + uSeed;
    r = pow(max(r, 0.0001), 0.94);
    p = vec2(cos(t), sin(t)) * r * 0.995;
  } else if (uShift < 12.5) {
    p *= 0.99 - uBass * 0.008;
  } else if (uShift < 13.5) {
    p.x += sin(p.y * 3.5 + uTime * 0.35) * 0.006 * s;
    p.y += cos(p.x * 3.0 - uTime * 0.25) * 0.006 * s;
    p *= 0.995;
  } else if (uShift < 14.5) {
    p += 0.004 * s * vec2(sin(uv.y * 6.0 + uTime * 0.3), cos(uv.x * 5.0 - uTime * 0.25));
    p *= 0.995;
  } else if (uShift < 15.5) {
    p.y += 0.01 * s * smoothstep(0.15, 0.7, r);
    p *= 0.994;
  } else if (uShift < 16.5) {
    p *= 0.99 + 0.006 * sin(a * 2.0 + uTime * 0.3);
  } else {
    a += uTime * 0.06 * s;
    r *= 0.995;
    p = vec2(cos(a), sin(a)) * r;
  }

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  p.x /= aspect;
  return clamp(p + 0.5, 0.002, 0.998);
}

float inject(vec2 uv) {
  if (uPlaying < 0.5) return 0.0;
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float ink = 0.0;
  float energy = uRms * 0.55 + uBass * 0.35;

  if (uDraw < 0.5) {
    float blob = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float ang = fi * 1.2566 + uTime * 0.08 + uSeed;
      float rad = 0.14 + 0.05 * sin(uTime * 0.12 + fi) + uBass * 0.08;
      vec2 c = vec2(cos(ang), sin(ang)) * rad;
      float d = length(p - c);
      float w = 0.11 + uRms * 0.05;
      blob += smoothstep(w, 0.0, d);
    }
    ink = blob * 0.45;
  } else if (uDraw < 1.5) {
    float ring = abs(r - (0.24 + uBass * 0.08));
    ink = smoothstep(0.07, 0.0, ring) * (0.35 + energy);
  } else if (uDraw < 2.5) {
    float sweep = abs(fract(a / 6.28318 - uTime * 0.04) - 0.5);
    ink = smoothstep(0.08, 0.0, sweep - 0.42) * (0.3 + energy);
    ink += smoothstep(0.05, 0.0, abs(r - 0.32)) * 0.2;
  } else if (uDraw < 3.5) {
    vec2 g = fract(p * 10.0) - 0.5;
    ink = smoothstep(0.16, 0.02, length(g)) * (0.12 + uBass * 0.25);
  } else if (uDraw < 4.5) {
    float burst = 0.0;
    for (int i = 0; i < 5; i++) {
      float ang = float(i) * 1.2566 + uTime * 0.12;
      vec2 dir = vec2(cos(ang), sin(ang));
      float proj = clamp(dot(p, dir), 0.0, 0.5);
      burst += smoothstep(0.035, 0.0, length(p - dir * proj));
    }
    ink = burst * (0.2 + energy * 0.35);
  } else if (uDraw < 5.5) {
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    ink = smoothstep(0.08, 0.0, edge) * (0.2 + energy * 0.4);
  } else if (uDraw < 6.5) {
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    ink = smoothstep(0.07, 0.0, edge) * (0.18 + uMid * 0.35);
  } else if (uDraw < 7.5) {
    vec2 gp = p * 6.0;
    vec2 f = fract(gp) - 0.5;
    float n = fract(sin(dot(floor(gp), vec2(12.7, 78.2)) + uSeed) * 43758.5);
    ink = smoothstep(0.12, 0.0, length(f)) * n * (0.12 + uTreble * 0.3);
  } else if (uDraw < 8.5) {
    float h = 0.15 + uBass * 0.35 + uRms * 0.2;
    ink = smoothstep(h + 0.08, h, 1.0 - uv.y) * h * 0.35;
  } else if (uDraw < 9.5) {
    float smoke = 0.5 + 0.5 * sin(r * 4.0 - uTime * 0.2 + a);
    ink = smoke * smoothstep(0.65, 0.12, r) * (0.18 + energy * 0.3);
  } else if (uDraw < 10.5) {
    float ribbon = sin(p.x * 2.4 + uTime * 0.2) * (0.08 + uMid * 0.06);
    ink = smoothstep(0.05, 0.0, abs(p.y - ribbon)) * (0.28 + energy * 0.25);
  } else if (uDraw < 11.5) {
    float w = waveAt(uv.x) * (0.12 + uRms * 0.1);
    ink = smoothstep(0.04, 0.0, abs(p.y - w)) * 0.3;
  } else if (uDraw < 12.5) {
    float h = 0.12 + uBass * 0.4;
    ink = (1.0 - uv.y < h) ? 0.22 * h : 0.0;
  } else if (uDraw < 13.5) {
    float wobble = 0.24 + uBass * 0.1;
    ink = smoothstep(0.04, 0.0, abs(r - wobble)) * 0.4;
  } else if (uDraw < 14.5) {
    vec2 q = rotate(p, 0.5);
    float facet = abs(sin(q.x * 6.0) * sin(q.y * 5.0));
    ink = pow(facet, 4.0) * (0.15 + uTreble * 0.2);
  } else if (uDraw < 15.5) {
    float lane = abs(p.y + 0.08 * sin(p.x * 2.0 + uTime * 0.15));
    ink = smoothstep(0.05, 0.0, lane) * (0.22 + energy * 0.25);
  } else if (uDraw < 16.5) {
    // Squiggly waveform rings (Alchemy): the ring radius is the live
    // waveform, sampled at two angular rates plus angular jitter so the ring
    // scribbles rather than reading as a clean circle.
    float ang = fract(a / 6.2831853 + 0.5);
    float jag1 = (sin(a * 9.0 + uTime * 0.7) + 0.7 * sin(a * 17.0 - uTime * 0.5)) * (0.012 + uTreble * 0.02);
    float w1 = waveAt(ang) + 0.55 * waveAt(fract(ang * 3.0 + 0.13));
    float t1 = 0.30 + w1 * (0.09 + uRms * 0.12) + jag1;
    ink = smoothstep(0.014, 0.0, abs(r - t1)) * (0.4 + energy * 0.5);
    float jag2 = (sin(a * 11.0 - uTime * 0.6) + 0.7 * sin(a * 21.0 + uTime * 0.4)) * (0.01 + uTreble * 0.016);
    float w2 = waveAt(fract(ang + 0.37)) + 0.55 * waveAt(fract(ang * 4.0 + 0.61));
    float t2 = 0.19 + w2 * (0.06 + uMid * 0.07) + jag2;
    ink += smoothstep(0.012, 0.0, abs(r - t2)) * (0.28 + energy * 0.3);
  } else if (uDraw < 17.5) {
    // Feathery radial fan (Battery brightsphere): thin streaks from a
    // bright core, lengths driven by the spectrum at each angle.
    float streak = pow(abs(sin(a * 14.0 + uTime * 0.12 + uSeed * 6.0)), 6.0);
    float f = freqAt(fract(abs(a) / 3.14159));
    ink = streak * smoothstep(0.7, 0.04, r) * (0.1 + f * 0.3 + energy * 0.2);
    ink += smoothstep(0.15, 0.0, r) * (0.3 + uBass * 0.3);
  } else if (uDraw < 18.5) {
    // Twin waveform traces above and below a soft radial fan (Ambience Swirl).
    // Two waveform taps make the lines properly jagged; traces are drawn hot
    // so they read as crisp lines despite the ink scale.
    float j1 = waveAt(uv.x) * 0.05 + waveAt(fract(uv.x * 3.0 + 0.29)) * 0.035;
    float j2 = waveAt(fract(uv.x + 0.5)) * 0.05 + waveAt(fract(uv.x * 3.0 + 0.71)) * 0.035;
    float d1 = abs(p.y - (0.30 + j1));
    float d2 = abs(p.y + (0.30 + j2));
    ink = smoothstep(0.01, 0.0, d1) * (1.4 + energy * 0.5);
    ink += smoothstep(0.01, 0.0, d2) * (1.4 + energy * 0.5);
    float fan = pow(abs(sin(a * 22.0)), 4.0) * smoothstep(0.62, 0.04, r);
    ink += fan * (0.05 + uBass * 0.1);
  } else if (uDraw < 19.5) {
    // Spiral sheets of dots (Musical Colors "Colors in Motion").
    float spiral = fract(a / 6.2831853 * 3.0 - r * 2.1 + uTime * 0.05);
    float band = smoothstep(0.34, 0.1, abs(spiral - 0.5));
    vec2 gp = p * 44.0;
    float dotm = smoothstep(0.32, 0.06, length(fract(gp) - 0.5));
    ink = band * dotm * smoothstep(0.9, 0.15, r) * (0.22 + energy * 0.5);
  } else {
    // Soft full-width aurora band (Musical Colors "Aurora").
    float wobble = sin(p.x * 1.3 + uTime * 0.07) * 0.1 + waveAt(uv.x) * 0.04;
    float band = exp(-pow((p.y + wobble) * 3.0, 2.0));
    float stripe = 0.88 + 0.12 * sin(uv.x * 140.0);
    ink = band * stripe * (0.16 + energy * 0.35);
  }

  return ink;
}

void main() {
  vec2 uvShift = applyShift(vUv);
  vec3 prev = texture2D(tPrev, uvShift).rgb * uDecay;
  float ink = inject(vUv) * uInk;
  float look = clamp(0.22 + uHueShift * 0.12 + uBass * 0.08, 0.02, 0.98);
  // Spatially varying palette lookup for the modes whose originals are
  // multicolored within a single frame.
  vec2 pm = vUv - 0.5;
  pm.x *= uResolution.x / max(uResolution.y, 1.0);
  if (uDraw > 17.5 && uDraw < 18.5) {
    // Ambience Swirl: the waveform traces sit near y = ±0.3 and must be
    // bright salmon against the dark red fan.
    float traceD = min(abs(pm.y - 0.3), abs(pm.y + 0.3));
    look = mix(0.92, 0.3, smoothstep(0.0, 0.09, traceD));
  } else if (uDraw > 18.5 && uDraw < 19.5) {
    // Rainbow sweep around the spiral (Colors in Motion).
    float am = atan(pm.y, pm.x);
    look = fract(am / 6.2831853 + length(pm) * 1.2 + uHueShift * 0.06);
  } else if (uDraw > 19.5) {
    // Aurora: white-hot at the band centre, dark red toward the edges.
    look = clamp(0.9 - abs(pm.y) * 2.4, 0.02, 0.98);
  }
  vec3 inkCol = texture2D(tPalette, vec2(look, 0.5)).rgb;
  // Presets can tint the whole field (the XP originals fill the screen with
  // color); the base is gated on uPlaying so pause still fades to black.
  vec3 col = prev + inkCol * ink + uBase * (1.0 - uDecay) * uPlaying;
  col = max(col, vec3(0.0));
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}
`;

const COPY_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tMap, vUv);
}
`;

function makeTarget(w: number, h: number): THREE.WebGLRenderTarget {
  const t = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
  t.texture.colorSpace = THREE.NoColorSpace;
  return t;
}

export class FeedbackEngine {
  private renderer: THREE.WebGLRenderer;
  private ping: THREE.WebGLRenderTarget;
  private pong: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private copyScene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private copyMaterial: THREE.ShaderMaterial;
  private palette: THREE.DataTexture;
  private paletteKey = "";
  private lastRandomAt = -10;
  private inner: FeedbackPreset | null = null;
  private reduced = false;
  private time = 0;
  private hue = 0;
  private readonly baseColor = new THREE.Color(0x000000);

  constructor(renderer: THREE.WebGLRenderer, audioTextures: AudioTextures) {
    this.renderer = renderer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.ping = makeTarget(size.x, size.y);
    this.pong = makeTarget(size.x, size.y);
    this.palette = makePaletteTexture(["#041018", "#1a6a8a", "#e8a04a", "#ff4d2a"]);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FEEDBACK_FRAG,
      uniforms: {
        tPrev: { value: this.pong.texture },
        tFreq: { value: audioTextures.freq },
        tWave: { value: audioTextures.wave },
        tPalette: { value: this.palette },
        uResolution: { value: new THREE.Vector2(size.x, size.y) },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uRms: { value: 0 },
        uShift: { value: 0 },
        uDraw: { value: 0 },
        uDecay: { value: 0.96 },
        uHueShift: { value: 0 },
        uShiftStrength: { value: 1 },
        uInk: { value: 1 },
        uKaleidoSlices: { value: 6 },
        uSeed: { value: 0.3 },
        uDrift: { value: 0.2 },
        uPlaying: { value: 0 },
        uBase: { value: new THREE.Color(0x000000) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.copyMaterial = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: COPY_FRAG,
      uniforms: { tMap: { value: this.ping.texture } },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.PlaneGeometry(2, 2);
    this.scene = new THREE.Scene();
    this.copyScene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(quad, this.material));
    this.copyScene.add(new THREE.Mesh(quad.clone(), this.copyMaterial));
  }

  setReducedMotion(on: boolean): void {
    this.reduced = on;
  }

  resize(w: number, h: number): void {
    this.ping.setSize(w, h);
    this.pong.setSize(w, h);
    (this.material.uniforms.uResolution!.value as THREE.Vector2).set(w, h);
  }

  private pickInner(preset: FeedbackPreset, all: FeedbackPreset[], dt: number): FeedbackPreset {
    const isRandom = preset.id === "random" || preset.id === "randomization";
    if (!isRandom) {
      this.inner = preset;
      return preset;
    }
    if (this.reduced) {
      const first = all.find((p) => p.id !== "random" && p.id !== "randomization");
      this.inner = first ?? preset;
      return this.inner;
    }
    this.lastRandomAt += dt;
    const should = !this.inner || this.lastRandomAt > 14;
    if (should) {
      const pool = all.filter((p) => p.id !== "random" && p.id !== "randomization");
      if (pool.length > 0) {
        this.inner = pool[Math.floor(Math.random() * pool.length)] ?? preset;
        this.lastRandomAt = 0;
      }
    }
    return this.inner ?? preset;
  }

  frame(
    audio: AudioFrame,
    preset: FeedbackPreset,
    catalog: FeedbackPreset[],
    dt: number,
    color: ColorSettings,
  ): void {
    const inner = this.pickInner(preset, catalog, audio.playing ? dt : 0);
    this.time += dt * (this.reduced ? 0.2 : audio.playing ? 1 : 0.15);
    if (audio.playing) {
      const hueRate = inner.paletteLocked ? inner.hueSpeed * 0.08 : inner.hueSpeed * 0.35;
      this.hue += hueRate * dt;
    }

    const resolved = resolvePalette(inner.palette, color);
    const key = `${color.theme}:${color.hue.toFixed(3)}:${resolved.join(",")}`;
    if (this.paletteKey !== key) {
      writePalette(this.palette, resolved);
      this.paletteKey = key;
    }

    // Base field tint: follow the color-wash theme when one is active,
    // otherwise the preset's own base (defaulting to black). The hex must be
    // loaded without color-management conversion — the feedback pipeline
    // writes raw values to the canvas, so a linearized base would display
    // several times darker than intended.
    const themePalette = themeById(color.theme).palette;
    const baseHex = themePalette
      ? rotateHex(themePalette[0]!, color.hue)
      : inner.base
        ? rotateHex(inner.base, color.hue)
        : "#000000";
    this.baseColor.setStyle(baseHex, THREE.LinearSRGBColorSpace);

    let decay = inner.decay;
    let ink = inner.ink;
    let shift = inner.shiftStrength;
    if (!audio.playing) {
      decay = 0.92;
      ink = 0;
      shift = inner.shiftStrength * 0.08;
    } else {
      decay = Math.min(0.972, inner.decay);
      ink = inner.ink * 0.42;
      shift = inner.shiftStrength * (0.7 + audio.bassAtt * 0.08);
    }
    if (this.reduced) {
      decay = Math.min(0.9, decay);
      shift *= 0.3;
      ink *= audio.playing ? 0.55 : 0;
    }

    const u = this.material.uniforms;
    u.tPrev!.value = this.pong.texture;
    u.uTime!.value = this.time;
    u.uBass!.value = audio.bassAtt;
    u.uMid!.value = audio.midAtt;
    u.uTreble!.value = audio.trebleAtt;
    u.uRms!.value = audio.rmsAtt;
    u.uShift!.value = inner.shift;
    u.uDraw!.value = inner.draw;
    u.uDecay!.value = decay;
    u.uHueShift!.value = this.hue + color.hue;
    u.uShiftStrength!.value = shift;
    u.uInk!.value = ink;
    u.uKaleidoSlices!.value = inner.kaleidoSlices;
    u.uSeed!.value = inner.seed;
    u.uDrift!.value = audio.playing ? (this.reduced ? 0.08 : 0.16) : 0.03;
    u.uPlaying!.value = audio.playing ? 1 : 0;
    (u.uBase!.value as THREE.Color).copy(this.baseColor);

    const prevAuto = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(this.ping);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.copyMaterial.uniforms.tMap!.value = this.ping.texture;
    this.renderer.render(this.copyScene, this.camera);
    this.renderer.autoClear = prevAuto;

    const swap = this.ping;
    this.ping = this.pong;
    this.pong = swap;
  }

  dispose(): void {
    this.ping.dispose();
    this.pong.dispose();
    this.palette.dispose();
    this.material.dispose();
    this.copyMaterial.dispose();
    this.scene.clear();
    this.copyScene.clear();
  }
}
