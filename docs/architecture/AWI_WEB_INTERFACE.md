# AWI – APL Web Interface

**Project:** Archery Performance Lab (APL)

**Document ID:** APL-ARC-004

**Version:** 0.1.0

**Status:** Draft — not yet approved

**Authors:** Archery Performance Lab Team

**Language:** English

**License:** MIT

**Last Updated:** 2026-08-02

---

# 1. Purpose

This document is a first, lightweight draft of the user-facing Web Interface described in
`APL_SYSTEM_ARCHITECTURE.md` (section 3: `Users → Web Interface → REST API Layer → ACE`).

Per `APL_SYSTEM_ARCHITECTURE.md` section 12, no implementation should start without an
approved specification. This document is that specification's first draft — it is meant
to be reviewed, argued with and revised, not implemented as-is.

Scope is deliberately limited to what APL actually has working logic for today:

- Arrow Tuning calculators (`@apl/ace`).
- Video Analysis (`@apl/video-analysis`), v0.6.0, still in progress.

Modules with no implemented backend logic yet (M00 Environmental Conditions, M01 Athlete
Profile, M02 Equipment Profile, M04 Shooting Session, M05 Competition, M07 Performance
Engine, M08 AI Coach) are out of scope here. Drafting UI for them now would mean
inventing workflows for business logic that doesn't exist yet — exactly what this
project's discipline argues against.

---

# 2. Confirmed Decision: Client-Side Video Processing

Discussed and decided 2026-08-02: pose estimation for Video Analysis runs **client-side,
in the browser** — not on a server.

Reasoning:

- `@apl/video-analysis`'s pose-estimation wrapper (`createPoseDetector`,
  `estimatePoseFrame`) is already built on plain `@tensorflow/tfjs`, not
  `@tensorflow/tfjs-node` — chosen originally for backend-portability reasons (see
  `CHANGELOG.md`), which happens to also make it browser-portable. TensorFlow.js runs in
  the browser via a WebGL or WASM backend with no server involved.
- This aligns with a constraint already established for the Video Analysis module during
  calibration work: footage of a minor athlete must never leave the machine it's on. A
  server-side pipeline would mean uploading that footage somewhere; a client-side one
  means the video is read, processed and discarded locally, and only the *derived*
  results (pose sequences, phase segments, metrics — not the video itself) would ever be
  sent anywhere, if at all.
- It avoids needing video storage/streaming infrastructure for something that, per ACE's
  own "Raw vs Derived Data" principle (ADR-003), doesn't need to be retained anyway —
  what matters long-term is the derived analysis, not the source video.

Consequence: `apps/web` will need its own frame-extraction path, since
`@apl/video-analysis`'s current `frame-extraction/` module is Node-only (it shells out to
`ffmpeg-static`/`ffprobe-static`). See section 5.

---

# 3. Main Areas

Two top-level areas, matching the two domains with real logic behind them:

## 3.1 Arrow Tuning

Calculator-style forms over `@apl/ace`: Front of Center, Kinetic Energy, Momentum, Arrow
Speed estimation, Time of Flight, Ballistic trajectory, and Dynamic Spine / plunger
spring tension tuning. Input is an `Arrow`/`Bow`/`Environment`/`Shot` (or subsets of
them); output is the calculation result plus, where applicable, a chart (e.g. the
trajectory curve from `calculateBallisticTrajectory`).

No persistence exists yet (`ACE` has no database layer — see `ROADMAP.md` v0.4.0). A
first version of this area could reasonably be stateless: fill a form, see a result,
nothing saved. Persistence is a separate, later decision (needs APD, session/auth model,
etc. — out of scope here).

## 3.2 Video Analysis

Upload a video, watch pose estimation and (eventually) phase detection run against it,
see the result. This is the area with an actual novel user flow — detailed in section 4.

---

# 4. Video Analysis User Flow (Draft)

```text
1. Select a video file (local file picker, nothing uploaded to a server)
        │
        ▼
2. Browser reads video metadata + extracts frames
   (HTML5 <video> + <canvas>, not ffmpeg — see section 5)
        │
        ▼
3. Pose estimation runs frame-by-frame client-side
   (BlazePose via @tensorflow-models/pose-detection,
   WebGL or WASM backend — progress shown, this is not instant)
        │
        ▼
4. Biomechanics signals computed
   (@apl/biomechanics: distance, angle, velocity — pure functions, reused as-is)
        │
        ▼
5. Phase detection runs
   (@apl/video-analysis/phase-detection — reused as-is;
   currently only detects Anchor / Release / FollowThrough,
   see its own README for why)
        │
        ▼
6. Results view:
   - Video playback with pose keypoints overlaid on a <canvas>
   - Detected phase segments on a timeline under the video
   - Per-frame biomechanics signal charts (e.g. draw-side wrist velocity)
   - Explicit "not detected" markers for the 7 phases the prototype
     doesn't find yet, rather than pretending they were checked
```

Open questions this draft does **not** resolve:

- Exact UI for scrubbing to a detected phase / comparing two videos side by side (e.g. an
  archer's shot against a Kim Woojin reference clip) — desirable, not designed yet.
- Whether/how a user could opt in to exporting derived metrics (not video) for later
  comparison across sessions, which would need APD and is out of scope until that exists.
- Performance on longer videos: BlazePose per-frame in-browser is not free; a 6-minute
  match video (like the Yankton 2021 footage used for calibration) is a very different
  cost than a 3-second single-shot clip. May need to scope v1 to short, pre-trimmed clips
  rather than arbitrary raw footage.

---

# 5. Code Reuse from `@apl/video-analysis`

Assessed against what's actually in `packages/domains/video-analysis/src` today:

| Module | Browser-reusable as-is? | Notes |
|---|---|---|
| `types/` | Yes | Plain TypeScript types, no runtime dependency. |
| `biomechanics/` | Yes | Pure functions over `PoseKeypoint[]`, no Node API used. |
| `phase-detection/` | Yes | Pure function over `PoseFrame[]`, no Node API used. |
| `calculations/timing` | Yes | Pure post-processing, no Node API used. |
| `pose-estimation/` | Partially | Same `@tensorflow/tfjs` + `@tensorflow-models/pose-detection` calls, but backend initialization is Node-specific (`ensureWasmBackendReady()` assumes the WASM backend's Node build). A browser build needs its own backend setup (WebGL is the usual default in-browser; WASM is also available via a browser-targeted bundle). |
| `frame-extraction/` | No | Built on `ffmpeg-static`/`ffprobe-static` (spawned native binaries) — meaningless in a browser. Needs an HTML5 `<video>`/`<canvas>` based replacement with an equivalent output shape (`ExtractedFrame`-like: a decoded frame tensor + timestamp) so the rest of the pipeline doesn't need to know the difference. |
| `shot-analysis/` | No (depends on frame-extraction) | Would need a browser-specific equivalent wiring the new frame source to pose-estimation. |

This means roughly half the package — everything past "get me a `PoseFrame[]`" — should
be usable unmodified in `apps/web`. The video-in/frames-out half needs a real browser
implementation, not a port.

---

# 6. Explicitly Undecided

Left open for a future revision of this document, not decided here:

- Frontend framework (React/Next.js, Vue, plain Vite+React, etc.).
- Whether `apps/api` (the REST API Layer in `APL_SYSTEM_ARCHITECTURE.md`) is needed for
  v1 at all, given Arrow Tuning has no persistence yet and Video Analysis is proposed as
  fully client-side.
- Visual design system / component library.
- Authentication and multi-user support (ties into ACE's role-based permissions,
  section 10 of `APL_SYSTEM_ARCHITECTURE.md` — not built yet).
- Hosting/deployment target.

---

# 7. References

`APL_SYSTEM_ARCHITECTURE.md`

`AIE_INTELLIGENCE_ENGINE.md`

`ADR-003-Raw-Data-vs-Derived-Data.md`

`packages/domains/video-analysis/README.md`

`ROADMAP.md` — v0.6.0 Video Analysis Module

---

End of Document
