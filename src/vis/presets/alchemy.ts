import type { FeedbackPreset } from "../types.ts";

// XP reference: squiggly cyan/green waveform rings and pastel smears drifting
// over a dark wine-red field.
export const alchemyPresets: FeedbackPreset[] = [
  {
    id: "random",
    name: "Random",
    kind: "feedback",
    shift: 0,
    draw: 16,
    decay: 0.93,
    paletteLocked: false,
    palette: ["#30101c", "#40c0d8", "#50c878", "#9868d8", "#e880c0", "#e8f4ec"],
    hueSpeed: 0.02,
    shiftStrength: 0.6,
    ink: 1.35,
    kaleidoSlices: 6,
    seed: 0.21,
    base: "#4a0c14",
  },
];
