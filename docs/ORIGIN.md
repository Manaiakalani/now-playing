# Origin writeup

This is the original plan and the record of how **Now Playing** was actually built. The living product docs are in the root [README](../README.md). Keep this file as the “why,” not the “how to run.”

Date of first build: 2026-08-17. Wiki catalog used as canon: [wmpvis.fandom.com/wiki/Category:Visualizations](https://wmpvis.fandom.com/wiki/Category:Visualizations).

---

## Brief

A simple React web app for music visualizations in the spirit of Windows Media Player — a clone of the **visualization catalog**, not a clone of the player chrome.

Constraints that shaped the whole project:

- Look across top GitHub visualizer repos so we do not rebuild something that already exists.
- Use the WMP Visualization Wiki as the list of what was previously supported.
- Ship as a visualization-first web app (Vite + React + TypeScript).
- After the first plan pass, lock the renderer to **Three.js / WebGL** (imperative API, not React Three Fiber).

---

## Landscape we refused to copy

A survey of GitHub topics `music-visualizer`, `audio-visualizer`, `music-visualization`, plus WMP / Winamp / React searches, clustered like this:

| Cluster | Examples | Why we skipped it |
| --- | --- | --- |
| Winamp / MilkDrop | webamp, butterchurn, projectM, MilkDrop3 | Winamp’s look. Wrapping Butterchurn would just be another MilkDrop site. |
| Spectrum / waveform toys | cava, audioMotion-analyzer, glava, spectro | Bars-only. WMP Bars and Waves is one family, not the product. |
| WMP *player* chrome clones | rmellis WMP 7/8/9 web apps, win95-media-player | Full XP/9 skins. rmellis fakes Ambience/Battery with **pre-recorded WebM** whose `playbackRate` tracks bass. |
| Reverse-engineered WMP → MilkDrop | kugg/wmp-viz-ports | Ghidra ports of WMP DLLs into `.milk` presets. Different target; we do not use reverse-engineered binaries. |
| VJ / video export | astrofox, modV, melody-canvas | Editors, not a listening-room visualizer. |
| Hardware / LED | LedFx, audio-reactive-led-strip, HyperHDR | Not a web viz. |

**The gap:** nobody shipped a real-time, browser-native recreation of the WMP **visualization families** — especially the Ambience family (Alchemy, Battery, Ambience), whose look is video-feedback + displacement + palettes, not MilkDrop warp meshes and not FFT bars.

That is the product.

---

## Catalog treated as canon

From the wiki “Included Visualizations” page and the category listing.

### First-party, shipped in v1

| Family | Visualization | Era | Presets shipped |
| --- | --- | --- | --- |
| Ambience | Alchemy (ex-“Tolerance”) | WMP 9–12, current | `Random` (the only original preset) |
| Ambience | Battery | WMP 8–12, current | `Randomization`, `brightsphere`, `dance of the freaky circles`, `kaleidovision`, `lotus`, `event horizon`, `smoke or water?`, `my tornado is resting` (8 of 26) |
| Ambience | Ambience | WMP 7–10, former | `Random`, `Swirl`, `Water`, `Warp`, `Niagara`, `Down the Drain`, `Thingus` (7 of 14) |
| Bars and Waves | Bars and Waves | WMP 7–12, current | all 4: `Bars`, `Ocean Mist`, `Fire Storm`, `Scope` |
| Bars and Waves | Spikes | WMP 7–10, former | both: `Spike`, `Amoeba` |
| Bars and Waves | Particle (ex-“DotPlane”) | WMP 7–10, former | both: `Particle`, `Rotating Particle` |
| Musical Colors | Plenoptic | WMP 7–10, former | `Smokey Circles`, `Fountain`, `Vox`, `Spyro` |
| Musical Colors | Musical Colors | WMP 7–8 | `Colors in Motion`, `Aurora`, `Night Lights`, `Ice Crystals`, `Soft Fire`, `Neon Highway` |

**v1 total:** 8 visualizations, 34 named presets.

### Explicitly out of v1

- 3D Alchemy (Creativity Pack). Three.js is why this is cheap later.
- Remaining Battery / Ambience / Musical Colors presets (engines accept them as data).
- Third-party wiki entries (Goom, Gigertron, Hypnobloom, Yule Log, …).
- Pixel-perfect WMP 7/8/9 window chrome — already done by rmellis.

Legal stance: homage. Original **names** as tribute. No Microsoft DLLs, bitmaps, logos, or captured WMP video. Original shaders. No code from `kugg/wmp-viz-ports`. Bundled demo audio is generated locally (no third-party samples).

---

## Product shape

One page. The canvas is the app. Drop a track, use the mic, or play the bundled demo. Cycle visualizations the way WMP did.

```
┌──────────────────────────────────────────────────────────┐
│                    FULLSCREEN VIZ                        │
│  Battery                                                 │
│  kaleidovision                          2:14 / 4:01      │
│  [prev] [play] [next]  ══════●══════   [mic] [open] [fs] │
└──────────────────────────────────────────────────────────┘
```

- HUD fades after idle; returns on mouse / key.
- Title format is the WMP one: visualization + preset.
- Slide-up catalog is the old Tools → Options → Plug-ins → Visualizations idea, as a listening-room picker.
- Persist last visualization, preset, and color wash in `localStorage`.

### Visual identity

A dark living-room PC in 2004. Not an XP window clone, not neon cyberpunk.

| Token | Hex | Role |
| --- | --- | --- |
| Void | `#07080C` | viz clear / page |
| Overlay | `#0E1628CC` | HUD glass |
| Media Blue | `#1A3A7A` | rare chrome accent |
| Ice | `#C9D4E8` | HUD text |
| Amber | `#E8A04A` | preset name, playhead |
| Peak | `#FF4D2A` | Fire Storm / live mic |

Type: Barlow Condensed (HUD), Source Sans 3 (copy), IBM Plex Mono (timecode).

---

## Renderer decision

The Ambience family is a GPU effect: ping-pong the previous frame, displace it, colorize new ink. That is WebGL or it is a fake.

An early draft split Canvas 2D (bars) from raw WebGL2 (feedback). That split was dropped. One **Three.js `WebGLRenderer`**, imperative API from `src/vis/loop.ts`. React mounts the canvas and owns the HUD. React never calls `renderer.render`. No `@react-three/fiber`, no Butterchurn, no projectM, no `.milk` host.

```
WebGLRenderer
  ├─ FeedbackEngine (Alchemy, Battery, Ambience, Plenoptic, Musical Colors)
  │    ping / pong WebGLRenderTarget
  │    ShaderMaterial: CurrentShift + ink
  └─ Ortho / perspective scenes (Bars and Waves, Spikes, Particle)
       InstancedMesh bars, Line scope, Points grid, Line spikes
```

Presets are **data**. Battery’s wiki documents the original modifier vocabulary (`CurrentShift`, `PreShift` / `PostShift`, `PaletteLocked`). v1 implements a subset as shader branches.

---

## How it was implemented

1. Scaffold Vite React-TS at `/Users/max/Projects/wmpvis`, add `three`.
2. `AudioEngine` + drop zone + generated demo WAV + microphone.
3. Bars and Waves (all 4) to prove the loop, resize/DPR, and HUD cycling.
4. Feedback engine + Alchemy.
5. Battery (8) and Ambience (7) as data on the same engine.
6. Spikes + Particle.
7. Plenoptic + Musical Colors.
8. Catalog, persistence, fullscreen, reduced-motion, color wash.
9. Aesthetic passes after first playable build (below).

---

## What changed after the first playable build

These were not in the original plan. They are load-bearing now.

### Color wash

HUD themes (Preset, Amber, Ice, Rose, Lime, Violet, Fire) plus a hue slider. Themes resolve palettes for both the feedback LUT and the mesh colors. Keys: `[` `]` cycle themes, `,` `.` nudge hue.

### Energy, not kick-flashes

Other visualizers we re-read:

- MilkDrop / Butterchurn: lagged `bass_att` / `mid_att`, not raw spikes.
- audioMotion-analyzer: gravity falloff on energy (default gravity 3.8).
- CAVA: noise-reduction + gravity/integral, autosens so a loud mix does not peg the display.

We added `compress` + `attenuate` envelopes (`bassAtt`, `rmsAtt`, `pulse`) in `src/audio/features.ts`. Beat-white-flash was removed. Random presets no longer jump on the beat.

### Photosensitive safety (feedback family)

Bars, Spikes, and Particle were fine. Alchemy / Battery / Ambience / Plenoptic / Musical Colors were strobing because the feedback shader was wrong in three ways:

1. Every pixel of the accumulated buffer was remapped through a wrapping palette LUT each frame (`fract(luminance + hue)`). As the field swirled, colors snapped.
2. `uDrift` was added as a **constant per frame**, not a rate — the whole buffer spun about once a second.
3. Displacement used high-frequency sines (10–40 spatial cycles, 2 Hz dashes).

The rebuilt path:

- Color is applied only to **new ink**, not the accumulated image.
- Warps are small and slow (~0.5% zoom per frame).
- **No new ink unless audio is actually playing.** Pause / pre-play fades the last frame to black. Idle no longer paints blobs or cycling palettes.

This is a hard constraint. Do not put luminance-to-palette remapping back on the ping-pong buffer. Do not inject ink when `playing` is false.

### HUD chrome

Icon buttons became circular glass discs, actions became pills, sliders and swatches became round. Palette and type stayed the same.

---

## Key decisions (final)

1. **Visualization-first, not player-first** — avoids Webamp and the rmellis WMP chrome clones.
2. **Real-time engines, not video loops** — rmellis already did the WebM trick.
3. **One Three.js / WebGL pipeline, presets as data.**
4. **First-party catalog only in v1.**
5. **Homage, original code** — names yes, DLLs and reverse-engineered ports no.
6. **No photosensitive idle / no palette wrap on the feedback buffer.**

Faithfulness target, from the original plan: recognizable from across the room, named presets that behave like the wiki describes — not a bit-exact port.
