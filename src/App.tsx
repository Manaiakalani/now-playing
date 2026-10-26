import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "./audio/AudioEngine.ts";
import { loadPrefs, savePrefs } from "./state/persist.ts";
import { Catalog } from "./ui/Catalog.tsx";
import { DropZone } from "./ui/DropZone.tsx";
import { Hud } from "./ui/Hud.tsx";
import { Stage } from "./ui/Stage.tsx";
import { stepTheme, type ColorThemeId } from "./vis/color.ts";
import {
  createCatalog,
  findPreset,
  findVis,
  stepIndex,
} from "./vis/registry.ts";

export default function App() {
  const engine = useMemo(() => new AudioEngine(), []);
  const catalog = useMemo(() => createCatalog(), []);
  const prefs = useMemo(() => loadPrefs(), []);
  const [visId, setVisId] = useState(prefs.visId);
  const [presetId, setPresetId] = useState(prefs.presetId);
  const [color, setColor] = useState(prefs.color);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [emptyHint, setEmptyHint] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idleRef = useRef<number>(0);

  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => {
    const sync = () => {
      const info = engine.getInfo();
      if (info.source !== "none") setEmptyHint(false);
      setLoadError(info.error);
    };
    return engine.subscribe(sync);
  }, [engine]);

  // Normalize stale persisted ids during render instead of via setState in an
  // effect: an unknown id simply resolves to the catalog fallback.
  const activeVis = findVis(catalog, visId);
  const activePreset = findPreset(activeVis, presetId);

  useEffect(() => {
    savePrefs({ visId: activeVis.id, presetId: activePreset.id, color });
  }, [activeVis, activePreset, color]);

  const armIdleTimer = useCallback(() => {
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      if (!catalogOpen) setHudVisible(false);
    }, 2800);
  }, [catalogOpen]);

  const bumpHud = useCallback(() => {
    setHudVisible(true);
    armIdleTimer();
  }, [armIdleTimer]);

  useEffect(() => {
    // The HUD starts visible; only the hide timer needs arming on mount.
    armIdleTimer();
    const onActivity = () => bumpHud();
    window.addEventListener("pointermove", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.clearTimeout(idleRef.current);
    };
  }, [armIdleTimer, bumpHud]);

  const cycleVis = useCallback(
    (dir: number) => {
      const i = catalog.findIndex((v) => v.id === activeVis.id);
      const next = catalog[stepIndex(catalog.length, i < 0 ? 0 : i, dir)]!;
      setVisId(next.id);
      setPresetId(next.presets[0]!.id);
    },
    [catalog, activeVis],
  );

  const cyclePreset = useCallback(
    (dir: number) => {
      const i = activeVis.presets.findIndex((p) => p.id === activePreset.id);
      const next =
        activeVis.presets[stepIndex(activeVis.presets.length, i < 0 ? 0 : i, dir)]!;
      setPresetId(next.id);
    },
    [activeVis, activePreset],
  );

  const pickRandom = useCallback(() => {
    const random = activeVis.presets.find(
      (p) => p.id === "random" || p.id === "randomization",
    );
    if (random) {
      setPresetId(random.id);
      return;
    }
    const pick = activeVis.presets[Math.floor(Math.random() * activeVis.presets.length)];
    if (pick) setPresetId(pick.id);
  }, [activeVis]);

  const openFile = useCallback(() => fileRef.current?.click(), []);

  const onFile = useCallback(
    (file: File) => {
      void engine.playFile(file).then((ok) => {
        if (ok) setEmptyHint(false);
      });
    },
    [engine],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setEmptyHint(false);
        void engine.toggle();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        cycleVis(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        cycleVis(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        cyclePreset(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        cyclePreset(1);
      } else if (e.key === "r" || e.key === "R") {
        pickRandom();
      } else if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
        else void document.exitFullscreen();
      } else if (e.key === "o" || e.key === "O") {
        openFile();
      } else if (e.key === "m" || e.key === "M") {
        setEmptyHint(false);
        void engine.playMic();
      } else if (e.key === "Escape") {
        if (catalogOpen) setCatalogOpen(false);
        else if (document.fullscreenElement) void document.exitFullscreen();
      } else if (e.key === "[") {
        setColor((c) => ({ ...c, theme: stepTheme(c.theme, -1) }));
      } else if (e.key === "]") {
        setColor((c) => ({ ...c, theme: stepTheme(c.theme, 1) }));
      } else if (e.key === ",") {
        setColor((c) => ({ ...c, hue: (c.hue + 0.96) % 1 }));
      } else if (e.key === ".") {
        setColor((c) => ({ ...c, hue: (c.hue + 0.04) % 1 }));
      } else if (e.key === "c" || e.key === "C") {
        setCatalogOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [catalogOpen, cyclePreset, cycleVis, engine, openFile, pickRandom]);

  return (
    <DropZone onFile={onFile}>
      <div className="app">
        <Stage
          engine={engine}
          catalog={catalog}
          visId={activeVis.id}
          presetId={activePreset.id}
          color={color}
        />
        {emptyHint ? (
          <div className="welcome">
            <p className="welcome-kicker">Windows Media Player tribute</p>
            <h1>Now Playing</h1>
            <p>
              Drop a track, open a file, or start the demo. Color only lands while
              music is playing; when it stops, the field fades out.
            </p>
            {loadError ? <p className="welcome-error">{loadError}</p> : null}
            <div className="welcome-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setEmptyHint(false);
                  void engine.playDemo();
                }}
              >
                Play demo
              </button>
              <button type="button" className="ghost" onClick={openFile}>
                Open file
              </button>
            </div>
          </div>
        ) : null}
        <Hud
          engine={engine}
          catalog={catalog}
          visId={activeVis.id}
          presetId={activePreset.id}
          color={color}
          hudVisible={hudVisible}
          catalogOpen={catalogOpen}
          onToggleCatalog={() => setCatalogOpen((v) => !v)}
          onOpenFile={openFile}
          onCycleVis={cycleVis}
          onCyclePreset={cyclePreset}
          onColorTheme={(theme: ColorThemeId) => setColor((c) => ({ ...c, theme }))}
          onColorHue={(hue: number) => setColor((c) => ({ ...c, hue }))}
        />
        <Catalog
          open={catalogOpen}
          catalog={catalog}
          visId={activeVis.id}
          presetId={activePreset.id}
          onClose={() => setCatalogOpen(false)}
          onPick={(v, p) => {
            setVisId(v);
            setPresetId(p);
          }}
        />
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </DropZone>
  );
}
