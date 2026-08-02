# ADI – APL Desktop Interface

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-ARC-005

**Version:** 0.1.0

**Status:** Draft — evaluated and deferred, not approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-08-02

---

# 1. Purpose

> **Status note (2026-08-02):** this direction was chosen, then weighed directly against
> the browser plan (`AWI_WEB_INTERFACE.md`) in the same session, and reverted — the
> browser plan is the active one. Reasoning: this document's real advantage (zero-rewrite
> reuse of the existing Node-based video pipeline) was outweighed by what it costs an
> open-source project meant to reach other archers and coaches — no-install, any-device
> distribution, which only a browser gives. Kept as a record of the evaluation, not
> deleted, per this project's traceability principle. The technical findings here (no
> rewrite needed for Electron; the `apps/api` tension in section 3) remain valid if a
> desktop client is ever revisited later, alongside the browser one rather than instead
> of it.

Discussed 2026-08-02: whether to build a desktop app (Mac/Windows) as the first real APL
client, ahead of the web interface drafted in `AWI_WEB_INTERFACE.md` (APL-ARC-004).

Use case is a coach reviewing footage on a real screen, not an athlete filming
themselves in the field — that's a mobile use case, explicitly deferred (see section 6).
Scope is the same two domains as the web draft: Arrow Tuning and Video Analysis, since
those are the only ones with real implemented logic today.

---

# 2. Why This Changes the Technical Picture

The web draft (`AWI_WEB_INTERFACE.md` section 5) found that `@apl/video-analysis`'s
`frame-extraction/` module — built on `ffmpeg-static`/`ffprobe-static` spawned as native
binaries via `fluent-ffmpeg` — is meaningless in a browser and would need a real
HTML5 `<video>`/`<canvas>` rewrite.

A desktop app removes that problem entirely, provided it's built on **Electron**, not
Tauri:

- Electron bundles a full Node.js runtime in its main process. `ffmpeg-static`,
  `ffprobe-static`, `fluent-ffmpeg`, and the WASM-backend pose-estimation code
  (`@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm`, Node build) all already work
  exactly as written — this is the same runtime the calibration scripts
  (`scripts/build-calibration-dataset.cjs`, `scripts/detect-phases.cjs`) already run
  under today. `frame-extraction/`, `pose-estimation/` and `shot-analysis/` need **no
  rewrite** for this target, unlike the browser plan.
- Tauri, by contrast, does not bundle Node — its backend is Rust. Reusing the existing
  TypeScript video pipeline under Tauri would mean either shelling out to a Node sidecar
  process (extra packaging complexity) or reimplementing the pipeline in Rust (throwing
  away working, tested code for no functional gain). Electron is the pragmatic choice
  specifically because of how much of this project is already written in TypeScript
  against Node's ecosystem.

The trade-off going in with eyes open: Electron ships a full Chromium + Node runtime per
app, so the installer is large (typically 100+ MB) compared to a Tauri app. For a
coaching tool run locally rather than distributed at scale, that trade-off favors
Electron here.

---

# 3. A Real Tension with `APL_SYSTEM_ARCHITECTURE.md`

`APL_SYSTEM_ARCHITECTURE.md` section 3 (Status: **Approved**) draws:

```text
Users → Web Interface → REST API Layer → ACE Core Engine
```

A desktop-first Electron app doesn't need this shape. Electron's main process is a
regular Node process — it can `import` `@apl/ace` and `@apl/video-analysis` directly,
in-process, with no HTTP hop and no `apps/api` at all. Running a local REST server
inside the app just to call it from the same app over `localhost` would be extra
machinery with no real benefit at this stage.

This is flagged explicitly rather than quietly worked around: the approved architecture
assumes a client/server split that a desktop-first plan doesn't need yet. Two honest
options, not resolved here:

1. Treat `apps/api` as still-future work for when a *second*, non-desktop client
   (web, mobile) actually needs to talk to ACE remotely, and let the desktop app import
   ACE directly in the meantime — the architecture diagram would then describe the
   eventual multi-client shape, not a requirement every client must satisfy from day one.
2. Amend `APL_SYSTEM_ARCHITECTURE.md` itself to show the Desktop Interface as an
   alternative direct path to ACE, alongside the Web Interface → REST API path.

Either way, this is a real decision about an **Approved** document, not a detail —
it should get an explicit answer before `apps/desktop` is scaffolded, not be settled
implicitly by whatever gets coded first.

---

# 4. Main Areas

Same two areas as the web draft, same reasoning (`AWI_WEB_INTERFACE.md` section 3):

- **Arrow Tuning** — calculator forms over `@apl/ace`, stateless for v1 (no persistence
  layer exists yet).
- **Video Analysis** — the more interesting flow, detailed below.

---

# 5. Video Analysis User Flow (Draft)

```text
1. Open a video file (native file picker — the file never leaves the machine,
   there is no upload step, there is no server)
        │
        ▼
2. @apl/video-analysis's existing frame-extraction/ runs unmodified
   (ffmpeg-static, in Electron's Node main process)
        │
        ▼
3. @apl/video-analysis's existing pose-estimation/ runs unmodified
   (tfjs WASM backend, same code path as scripts/build-calibration-dataset.cjs)
        │
        ▼
4. shot-analysis/analyzeShotVideo() wires the two together, unmodified
        │
        ▼
5. biomechanics/ + phase-detection/ run, unmodified
        │
        ▼
6. Results view (renderer process):
   - Video playback with pose keypoints overlaid
   - Detected phase segments on a timeline
   - Per-frame biomechanics signal charts
   - Explicit "not detected" markers for the phases the prototype
     doesn't find yet (Stance, Nocking, SetUp, PreDraw, Drawing,
     Aiming, Expansion), same honesty principle as the web draft
```

Steps 2–5 are, functionally, exactly what a coach currently gets by running
`node scripts/build-calibration-dataset.cjs` and `node scripts/detect-phases.cjs` by
hand and reading CSV output. The desktop app's actual job is turning that into a real
UI — file picker instead of a hardcoded/env-var folder path, a rendered overlay and
timeline instead of a CSV, progress feedback instead of a blocking script run. The
underlying analysis is not new work; it already exists and is tested.

Open questions this draft does **not** resolve (same caveats as the web draft, section 4):

- UI for comparing two videos side by side (an archer's shot against a reference clip).
- Whether/how derived metrics could be exported (not the video) for later comparison —
  needs a persistence story that doesn't exist yet.
- Electron's main/renderer process split needs a real design: pose estimation is
  CPU/GPU-bound and currently async but not chunked for progress reporting — running it
  on a long video without blocking the UI thread needs actual work, not just "call the
  existing function."

---

# 6. Explicitly Deferred: Mobile

Filming an archer directly from a phone and getting analysis on the spot is a real,
different use case (raised earlier this session, in the context of Tommaso's growing
video collection). Deliberately out of scope for this document: a coach reviewing
existing footage on a desktop and an athlete/coach capturing footage live on a phone are
different enough workflows that conflating them here would blur both. Worth a document
of its own later, not a section bolted onto this one.

---

# 7. Explicitly Undecided

- Electron tooling choice (e.g. `electron-forge`, `electron-builder`) for packaging,
  code signing and notarization on Mac, and installer generation on Windows.
- Auto-update mechanism.
- Whether this becomes the only client or one of several (see `AWI_WEB_INTERFACE.md`,
  kept alive rather than withdrawn, for that reason).
- UI framework used inside Electron's renderer (React, Vue, plain — same open question
  as the web draft, and largely reusable between the two if both get built).
- Resolution of the `apps/api` tension in section 3.

---

# 8. References

`APL_SYSTEM_ARCHITECTURE.md`

`AWI_WEB_INTERFACE.md`

`ADR-003-Raw-Data-vs-Derived-Data.md`

`packages/domains/video-analysis/README.md`

`ROADMAP.md` — v0.6.0 Video Analysis Module

---

End of Document
