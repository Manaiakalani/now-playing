import { describe, expect, it } from "vitest";
import { createCatalog, findPreset, findVis, stepIndex } from "./registry.ts";

describe("createCatalog", () => {
  const catalog = createCatalog();

  it("ships the full v1 catalog: 8 visualizations, 34 named presets", () => {
    expect(catalog).toHaveLength(8);
    const presetCount = catalog.reduce((n, vis) => n + vis.presets.length, 0);
    expect(presetCount).toBe(34);
  });

  it("has unique visualization ids and unique preset ids per visualization", () => {
    const visIds = catalog.map((v) => v.id);
    expect(new Set(visIds).size).toBe(visIds.length);
    for (const vis of catalog) {
      const ids = vis.presets.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  it("groups every visualization into a known family", () => {
    const families = new Set(catalog.map((v) => v.family));
    expect(families).toEqual(
      new Set(["ambience", "bars-and-waves", "musical-colors"]),
    );
  });
});

describe("findVis / findPreset", () => {
  const catalog = createCatalog();

  it("resolves known ids", () => {
    expect(findVis(catalog, "battery").id).toBe("battery");
    const battery = findVis(catalog, "battery");
    expect(findPreset(battery, "lotus").id).toBe("lotus");
  });

  it("falls back to the first entry for unknown ids", () => {
    expect(findVis(catalog, "does-not-exist").id).toBe(catalog[0]!.id);
    const vis = findVis(catalog, "alchemy");
    expect(findPreset(vis, "nope").id).toBe(vis.presets[0]!.id);
  });
});

describe("stepIndex", () => {
  it("wraps in both directions", () => {
    expect(stepIndex(5, 0, -1)).toBe(4);
    expect(stepIndex(5, 4, 1)).toBe(0);
    expect(stepIndex(5, 2, 1)).toBe(3);
  });
});
