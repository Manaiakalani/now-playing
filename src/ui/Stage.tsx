import { useEffect, useRef, useState } from "react";
import { Vector2 } from "three";
import type { AudioEngine } from "../audio/AudioEngine.ts";
import { createLoop } from "../vis/loop.ts";
import { createAudioTextures } from "../vis/renderer/audioTextures.ts";
import { createRenderer, fitRenderer } from "../vis/renderer/createRenderer.ts";
import type { ColorSettings } from "../vis/color.ts";
import { findPreset, findVis } from "../vis/registry.ts";
import type { Visualization } from "../vis/types.ts";

interface Props {
  engine: AudioEngine;
  catalog: Visualization[];
  visId: string;
  presetId: string;
  color: ColorSettings;
}

export function Stage({ engine, catalog, visId, presetId, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visIdRef = useRef(visId);
  const presetIdRef = useRef(presetId);
  const colorRef = useRef(color);
  const [glEpoch, setGlEpoch] = useState(0);

  // Mirror the latest props into refs after render so the imperative render
  // loop reads fresh values without re-running the WebGL mount effect.
  useEffect(() => {
    visIdRef.current = visId;
    presetIdRef.current = presetId;
    colorRef.current = color;
  }, [visId, presetId, color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createRenderer(canvas);
    const audioTextures = createAudioTextures();
    const parent = canvas.parentElement ?? canvas;
    let active: Visualization | null = null;
    let currentId = "";

    const mountVis = (id: string) => {
      if (currentId === id && active) return;
      active?.dispose();
      const next = findVis(catalog, id);
      next.mount({ renderer, audioTextures });
      const size = renderer.getDrawingBufferSize(new Vector2());
      next.resize(Math.max(1, size.x), Math.max(1, size.y));
      active = next;
      currentId = id;
    };

    const resize = () => {
      const { w, h } = fitRenderer(
        renderer,
        parent.clientWidth,
        parent.clientHeight,
      );
      active?.resize(w, h);
    };

    mountVis(visIdRef.current);
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const loop = createLoop((dt) => {
      if (visIdRef.current !== currentId) mountVis(visIdRef.current);
      const vis = active;
      if (!vis) return;
      const audio = engine.sample();
      audioTextures.update(audio);
      const preset = findPreset(vis, presetIdRef.current);
      vis.frame(audio, preset, dt, colorRef.current);
    });
    loop.start();

    const onLost = (e: Event) => {
      e.preventDefault();
      loop.stop();
    };
    const onRestored = () => {
      setGlEpoch((n) => n + 1);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      loop.stop();
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      active?.dispose();
      audioTextures.dispose();
      renderer.dispose();
    };
  }, [catalog, engine, glEpoch]);

  return <canvas ref={canvasRef} className="stage-canvas" />;
}
