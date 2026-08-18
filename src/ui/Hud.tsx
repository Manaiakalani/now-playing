import { useEffect, useState } from "react";
import type { AudioEngine, EngineInfo } from "../audio/AudioEngine.ts";
import { formatTime } from "../audio/features.ts";
import type { Visualization } from "../vis/types.ts";
import { COLOR_THEMES, type ColorSettings, type ColorThemeId } from "../vis/color.ts";
import { findPreset, findVis } from "../vis/registry.ts";
import {
  IconFolder,
  IconFull,
  IconGrid,
  IconMic,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
} from "./icons.tsx";

interface Props {
  engine: AudioEngine;
  catalog: Visualization[];
  visId: string;
  presetId: string;
  color: ColorSettings;
  hudVisible: boolean;
  catalogOpen: boolean;
  onToggleCatalog: () => void;
  onOpenFile: () => void;
  onCycleVis: (dir: number) => void;
  onCyclePreset: (dir: number) => void;
  onColorTheme: (theme: ColorThemeId) => void;
  onColorHue: (hue: number) => void;
}

export function Hud({
  engine,
  catalog,
  visId,
  presetId,
  color,
  hudVisible,
  catalogOpen,
  onToggleCatalog,
  onOpenFile,
  onCycleVis,
  onCyclePreset,
  onColorTheme,
  onColorHue,
}: Props) {
  const [info, setInfo] = useState<EngineInfo>(() => engine.getInfo());

  useEffect(() => {
    const sync = () => setInfo(engine.getInfo());
    const unsub = engine.subscribe(sync);
    const id = window.setInterval(sync, 250);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [engine]);

  const vis = findVis(catalog, visId);
  const preset = findPreset(vis, presetId);
  const ratio = info.duration > 0 ? info.currentTime / info.duration : 0;

  return (
    <div className={`hud ${hudVisible || catalogOpen ? "is-on" : "is-off"}`}>
      <div className="hud-fade" />
      <div className="hud-row">
        <div className="hud-id">
          <p className="hud-vis">{vis.name}</p>
          <p className="hud-preset">{preset.name}</p>
          <p className="hud-track">{info.title}</p>
        </div>

        <div className="hud-transport">
          <button type="button" className="icon-btn" onClick={() => onCycleVis(-1)} aria-label="Previous visualization">
            <IconPrev />
          </button>
          <button
            type="button"
            className="icon-btn play"
            onClick={() => void engine.toggle()}
            aria-label={info.playing ? "Pause" : "Play"}
          >
            {info.playing ? <IconPause /> : <IconPlay />}
          </button>
          <button type="button" className="icon-btn" onClick={() => onCycleVis(1)} aria-label="Next visualization">
            <IconNext />
          </button>
        </div>

        <div className="hud-meta">
          <p className="hud-time">
            {info.source === "mic"
              ? "LIVE"
              : `${formatTime(info.currentTime)} / ${formatTime(info.duration)}`}
          </p>
          <div className="hud-actions">
            <button type="button" className="icon-btn" onClick={onOpenFile} aria-label="Open audio file">
              <IconFolder />
            </button>
            <button
              type="button"
              className={`icon-btn ${info.source === "mic" ? "is-live" : ""}`}
              onClick={() => void engine.playMic()}
              aria-label="Use microphone"
            >
              <IconMic />
            </button>
            <button type="button" className="icon-btn" onClick={onToggleCatalog} aria-label="Visualization catalog">
              <IconGrid />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                const root = document.documentElement;
                if (!document.fullscreenElement) void root.requestFullscreen();
                else void document.exitFullscreen();
              }}
              aria-label="Fullscreen"
            >
              <IconFull />
            </button>
          </div>
        </div>
      </div>

      {info.source !== "mic" ? (
        <label className="seek">
          <span className="sr-only">Seek</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(ratio * 1000)}
            onChange={(e) => engine.seek(Number(e.target.value) / 1000)}
          />
        </label>
      ) : null}

      {info.error ? <p className="hud-error">{info.error}</p> : null}

      <div className="color-row">
        <span className="color-label">Color</span>
        <div className="swatches" role="radiogroup" aria-label="Color theme">
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={color.theme === theme.id}
              className={`swatch ${color.theme === theme.id ? "is-on" : ""}`}
              style={{ background: theme.swatch }}
              title={theme.name}
              onClick={() => onColorTheme(theme.id)}
            >
              <span className="sr-only">{theme.name}</span>
            </button>
          ))}
        </div>
        <label className="hue">
          <span>Hue</span>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(color.hue * 360)}
            onChange={(e) => onColorHue(Number(e.target.value) / 360)}
          />
        </label>
      </div>

      <p className="hud-keys">
        <button type="button" className="text-btn" onClick={() => onCyclePreset(-1)}>
          ← preset
        </button>
        <button type="button" className="text-btn" onClick={() => onCyclePreset(1)}>
          preset →
        </button>
        <span>space play</span>
        <span>↑↓ vis</span>
        <span>[ ] color</span>
        <span>F full</span>
        <span>O open</span>
        <span>M mic</span>
      </p>
    </div>
  );
}
