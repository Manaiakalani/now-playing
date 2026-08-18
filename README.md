# Now Playing

**Windows Media Player visualizations in the browser.** Real-time Alchemy, Battery, Ambience, Bars and Waves, Spikes, Particle, Plenoptic, and Musical Colors — the classic WMP music visualizer catalog, rebuilt with React, Three.js, WebGL, and the Web Audio API.

This is not a Windows Media Player chrome clone and not a MilkDrop / Butterchurn / projectM host. The canvas is the product.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=flat&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-e8a04a?style=flat)](LICENSE)

## Features

- 🎵 **Official WMP visualization families** — Ambience (Alchemy, Battery, Ambience), Bars and Waves (Bars, Ocean Mist, Fire Storm, Scope, Spikes, Particle), Musical Colors (Plenoptic + six Musical Colors presets)
- 🎚️ **34 named presets** taken from the [WMP Visualization Wiki](https://wmpvis.fandom.com/wiki/Category:Visualizations)
- 🔊 **Local files, microphone, or a bundled demo loop** — drag-and-drop audio, no account
- 🌈 **Color wash** — keep each preset’s palette, or switch Amber / Ice / Rose / Lime / Violet / Fire and hue-shift
- 🖥️ **Fullscreen Now Playing HUD** — WMP-style `Visualization` + preset lockup, seek, catalog
- ⌨️ Keyboard: space, arrows, `R` random, `F` fullscreen, `O` open, `M` mic, `C` catalog, `[` `]` color
- ♿ `prefers-reduced-motion`, no ink when nothing is playing (no idle strobe)

## Quick start

```bash
git clone https://github.com/Manaiakalani/now-playing.git
cd now-playing
npm install
npm run dev
```

Open the printed local URL. Click **Play demo**, drop an MP3/WAV/FLAC, or use the microphone.

```bash
npm run build    # production bundle
npm run preview  # serve the build
npm run lint     # oxlint
npm run demo     # regenerate public/demo.wav
```

## Keys

| Key | Action |
| --- | --- |
| Space | Play / pause (starts the demo if nothing is loaded) |
| ↑ / ↓ | Previous / next visualization |
| ← / → | Previous / next preset |
| R | Random preset (when the family has one) |
| F | Fullscreen |
| O | Open file |
| M | Microphone |
| C | Catalog |
| [ ] | Color theme |
| , . | Hue |
| Esc | Close catalog / exit fullscreen |

## Catalog

| Family | Visualizations |
| --- | --- |
| Ambience | Alchemy, Battery, Ambience |
| Bars and Waves | Bars, Ocean Mist, Fire Storm, Scope, Spikes, Particle |
| Musical Colors | Plenoptic, Musical Colors |

Presets are data files under `src/vis/presets/`. The Ambience and Musical Colors families share one ping-pong WebGL feedback engine. Bars, Spikes, and Particle are Three.js meshes and points.

## Stack

Vite 8, React 19, TypeScript, Three.js. The visualization loop is imperative — React never calls `WebGLRenderer.render`.

## How this was designed

The original plan, GitHub landscape survey, wiki catalog, and later safety/aesthetic decisions live in [docs/ORIGIN.md](docs/ORIGIN.md).

## License

MIT. A tribute: original visualization **names** as homage. No Microsoft binaries, skins, or reverse-engineered ports.
