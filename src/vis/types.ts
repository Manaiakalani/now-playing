import type { WebGLRenderer } from "three";
import type { AudioFrame } from "../audio/features.ts";
import type { ColorSettings } from "./color.ts";
import type { AudioTextures } from "./renderer/audioTextures.ts";

export type VisFamily = "ambience" | "bars-and-waves" | "musical-colors";

export interface Preset {
  id: string;
  name: string;
}

export interface FeedbackPreset extends Preset {
  kind: "feedback";
  shift: number;
  draw: number;
  decay: number;
  paletteLocked: boolean;
  palette: string[];
  hueSpeed: number;
  shiftStrength: number;
  ink: number;
  flashOnBeat: boolean;
  kaleidoSlices: number;
  seed: number;
}

export interface BarsPreset extends Preset {
  kind: "bars";
  mode: "bars" | "ocean" | "fire" | "scope";
}

export interface SpikesPreset extends Preset {
  kind: "spikes";
  mode: "spike" | "amoeba";
  hue: number;
}

export interface ParticlePreset extends Preset {
  kind: "particle";
  rotate: boolean;
}

export type AnyPreset = FeedbackPreset | BarsPreset | SpikesPreset | ParticlePreset;

export interface VisContext {
  renderer: WebGLRenderer;
  audioTextures: AudioTextures;
}

export interface Visualization {
  id: string;
  name: string;
  family: VisFamily;
  era: string;
  presets: AnyPreset[];
  mount: (ctx: VisContext) => void;
  frame: (audio: AudioFrame, preset: AnyPreset, dt: number, color: ColorSettings) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}
