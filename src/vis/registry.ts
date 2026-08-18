import { alchemyPresets } from "./presets/alchemy.ts";
import { ambiencePresets } from "./presets/ambience.ts";
import { batteryPresets } from "./presets/battery.ts";
import { musicalColorsPresets } from "./presets/musicalColors.ts";
import { plenopticPresets } from "./presets/plenoptic.ts";
import { createBarsAndWaves } from "./scenes/barsAndWaves.ts";
import { createFeedbackVis } from "./scenes/feedbackVis.ts";
import { createParticle } from "./scenes/particle.ts";
import { createSpikes } from "./scenes/spikes.ts";
import type { Visualization } from "./types.ts";

export function createCatalog(): Visualization[] {
  return [
    createFeedbackVis({
      id: "alchemy",
      name: "Alchemy",
      family: "ambience",
      era: "WMP 9–12",
      presets: alchemyPresets,
    }),
    createFeedbackVis({
      id: "battery",
      name: "Battery",
      family: "ambience",
      era: "WMP 8–12",
      presets: batteryPresets,
    }),
    createFeedbackVis({
      id: "ambience",
      name: "Ambience",
      family: "ambience",
      era: "WMP 7–10",
      presets: ambiencePresets,
    }),
    createBarsAndWaves(),
    createSpikes(),
    createParticle(),
    createFeedbackVis({
      id: "plenoptic",
      name: "Plenoptic",
      family: "musical-colors",
      era: "WMP 7–10",
      presets: plenopticPresets,
    }),
    createFeedbackVis({
      id: "musical-colors",
      name: "Musical Colors",
      family: "musical-colors",
      era: "WMP 7–8",
      presets: musicalColorsPresets,
    }),
  ];
}

export function familyLabel(id: Visualization["family"]): string {
  if (id === "ambience") return "Ambience family";
  if (id === "bars-and-waves") return "Bars and Waves family";
  return "Musical Colors family";
}

export function findVis(list: Visualization[], id: string): Visualization {
  return list.find((v) => v.id === id) ?? list[0]!;
}

export function findPreset(vis: Visualization, id: string) {
  return vis.presets.find((p) => p.id === id) ?? vis.presets[0]!;
}

export function stepIndex(len: number, index: number, dir: number): number {
  return (index + dir + len) % len;
}
