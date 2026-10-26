import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPrefs, savePrefs, type Prefs } from "./persist.ts";

const KEY = "wmpvis:v2";
const LEGACY = "wmpvis:v1";

const memory = new Map<string, string>();

const storage: Storage = {
  get length() {
    return memory.size;
  },
  clear() {
    memory.clear();
  },
  getItem(key: string) {
    return memory.get(key) ?? null;
  },
  key(index: number) {
    return [...memory.keys()][index] ?? null;
  },
  removeItem(key: string) {
    memory.delete(key);
  },
  setItem(key: string, value: string) {
    memory.set(key, value);
  },
};

describe("persist", () => {
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
  });

  afterEach(() => {
    memory.clear();
  });

  it("returns fallback prefs when storage is empty", () => {
    expect(loadPrefs()).toEqual({
      visId: "alchemy",
      presetId: "random",
      color: { theme: "preset", hue: 0 },
    });
  });

  it("round-trips saved prefs", () => {
    const prefs: Prefs = {
      visId: "battery",
      presetId: "lotus",
      color: { theme: "ice", hue: 0.25 },
    };
    savePrefs(prefs);
    expect(loadPrefs()).toEqual(prefs);
  });

  it("reads the legacy key", () => {
    storage.setItem(
      LEGACY,
      JSON.stringify({
        visId: "particle",
        presetId: "rotating-particle",
        color: { theme: "fire", hue: 0.5 },
      }),
    );
    expect(loadPrefs().visId).toBe("particle");
    expect(loadPrefs().presetId).toBe("rotating-particle");
    expect(loadPrefs().color).toEqual({ theme: "fire", hue: 0.5 });
  });

  it("falls back on corrupt JSON and unknown themes", () => {
    storage.setItem(KEY, "{not json");
    expect(loadPrefs().visId).toBe("alchemy");

    storage.setItem(
      KEY,
      JSON.stringify({
        visId: "spikes",
        presetId: "amoeba",
        color: { theme: "neon", hue: 4 },
      }),
    );
    const prefs = loadPrefs();
    expect(prefs.visId).toBe("spikes");
    expect(prefs.color.theme).toBe("preset");
    expect(prefs.color.hue).toBe(1);
  });

  it("clamps hue and ignores non-string ids", () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        visId: "bars",
        presetId: "ocean",
        color: { theme: "rose", hue: -1 },
      }),
    );
    expect(loadPrefs().color.hue).toBe(0);

    storage.setItem(KEY, JSON.stringify({ visId: 1, presetId: "x" }));
    expect(loadPrefs().visId).toBe("alchemy");
  });
});
