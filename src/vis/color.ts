import { Color } from "three";

export type ColorThemeId =
  | "preset"
  | "amber"
  | "ice"
  | "rose"
  | "lime"
  | "violet"
  | "fire";

export interface ColorSettings {
  theme: ColorThemeId;
  hue: number;
}

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  swatch: string;
  palette?: string[];
}

export const COLOR_THEMES: ColorTheme[] = [
  { id: "preset", name: "Preset", swatch: "#c9d4e8" },
  {
    id: "amber",
    name: "Amber",
    swatch: "#e8a04a",
    palette: ["#07080c", "#1a3a7a", "#e8a04a", "#ff6a2a", "#ffe4b8"],
  },
  {
    id: "ice",
    name: "Ice",
    swatch: "#7ec8e8",
    palette: ["#031018", "#0b3a58", "#3aa8d4", "#d5f4ff", "#ffffff"],
  },
  {
    id: "rose",
    name: "Rose",
    swatch: "#e05a8a",
    palette: ["#12020c", "#6a1840", "#e05a8a", "#ffb3d0", "#fff0f5"],
  },
  {
    id: "lime",
    name: "Lime",
    swatch: "#b6e04a",
    palette: ["#061008", "#1a4820", "#7ad040", "#e8ff8a", "#f6ffe0"],
  },
  {
    id: "violet",
    name: "Violet",
    swatch: "#a060e0",
    palette: ["#080614", "#3a1860", "#a060e0", "#e0a0ff", "#f8e8ff"],
  },
  {
    id: "fire",
    name: "Fire",
    swatch: "#ff4d2a",
    palette: ["#100404", "#7a1408", "#ff4d2a", "#ffb040", "#fff0c8"],
  },
];

export const DEFAULT_COLOR: ColorSettings = { theme: "preset", hue: 0 };

export function themeById(id: ColorThemeId): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0]!;
}

export function rotateHex(hex: string, turns: number): string {
  if (!turns) return hex;
  const c = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL((hsl.h + turns + 1) % 1, hsl.s, hsl.l);
  return `#${c.getHexString()}`;
}

export function resolvePalette(base: string[], color: ColorSettings): string[] {
  const theme = themeById(color.theme);
  const src = theme.palette ?? base;
  if (!color.hue) return src;
  return src.map((hex) => rotateHex(hex, color.hue));
}

export function resolveHex(hex: string, color: ColorSettings): string {
  const theme = themeById(color.theme);
  const src = theme.palette?.[2] ?? hex;
  return rotateHex(src, color.hue);
}

export function stepTheme(id: ColorThemeId, dir: number): ColorThemeId {
  const i = COLOR_THEMES.findIndex((t) => t.id === id);
  const next = (i + dir + COLOR_THEMES.length) % COLOR_THEMES.length;
  return COLOR_THEMES[next]!.id;
}
