import {
  DEFAULT_COLOR,
  type ColorSettings,
  type ColorThemeId,
} from "../vis/color.ts";

const KEY = "wmpvis:v2";
const LEGACY = "wmpvis:v1";

export interface Prefs {
  visId: string;
  presetId: string;
  color: ColorSettings;
}

const FALLBACK: Prefs = {
  visId: "alchemy",
  presetId: "random",
  color: DEFAULT_COLOR,
};

const THEMES: ColorThemeId[] = [
  "preset",
  "amber",
  "ice",
  "rose",
  "lime",
  "violet",
  "fire",
];

function parseColor(data: Partial<ColorSettings> | undefined): ColorSettings {
  const theme = data?.theme;
  const hue = data?.hue;
  return {
    theme: theme && THEMES.includes(theme) ? theme : "preset",
    hue: typeof hue === "number" && Number.isFinite(hue) ? Math.min(1, Math.max(0, hue)) : 0,
  };
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY);
    if (!raw) return FALLBACK;
    const data = JSON.parse(raw) as Partial<Prefs>;
    if (typeof data.visId !== "string" || typeof data.presetId !== "string") {
      return FALLBACK;
    }
    return {
      visId: data.visId,
      presetId: data.presetId,
      color: parseColor(data.color),
    };
  } catch {
    return FALLBACK;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}
