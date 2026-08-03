<p align="center">
  <img src="assets/images/apl-logo.png" alt="Archery Performance Lab Logo" width="450">
</p>

<h1 align="center">
  Archery Performance Lab
</h1>

<p align="center">
  <strong>An Open Research Platform for Archery Performance Analytics</strong>
</p>

---
# Roadmap

This document describes the planned evolution of the **Archery Performance Lab (APL)** project.

The roadmap is intended to provide a clear view of the project's direction while maintaining flexibility for future research and development.

---

# Versioning Strategy

APL follows **Semantic Versioning (SemVer)**.

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — Breaking changes or significant architectural revisions.
- **MINOR** — New functionality with backward compatibility.
- **PATCH** — Bug fixes, documentation improvements and minor refinements.

---

# Development Roadmap

## v0.1.0 — Repository Foundation

**Status:** Released

Objectives:

- Establish repository structure.
- Define project vision and mission.
- Publish governance documentation.
- Configure repository standards.
- Adopt Apache License 2.0.

Deliverables:

- README
- LICENSE
- CHANGELOG
- ROADMAP
- CONTRIBUTING
- CODE_OF_CONDUCT
- SECURITY
- CITATION
- Repository configuration files

---

## v0.2.0 — Manifesto

**Status:** Content complete (not yet tagged as a release)

Objectives:

- [x] Define the scientific philosophy of APL — `MANIFESTO.md`.
- [x] Establish analytical principles — `MANIFESTO.md`, `AAP_ARCHITECTURE_PRINCIPLES.md`.
- [x] Describe research methodology — `MANIFESTO.md`.
- [x] Formalize project terminology — `APL-STD-001-Component-ID.md` and per-domain docs (ADB, AED, AKB, AKG, AMD, APD).

---

## v0.3.0 — Domain Model

**Status:** In progress

Objectives:

- [x] Identify all core entities — `Archer`, `Bow`, `Arrow`, `Environment`, `Session`, `Shot`, `Plunger`, `StaticSpineMeasurement` (`packages/core/ace/src/types`).
- [x] Define relationships between entities — e.g. `Session` composes `Archer`/`Bow`/`Arrow`/`Environment`/`Shot[]`; `Bow` composes `Plunger`; `Arrow` composes `StaticSpineMeasurement`.
- [ ] Establish domain terminology — currently only inline code documentation, no standalone glossary.
- [ ] Document business rules — ADRs cover some (e.g. ADR-003 Raw vs Derived Data), but no consolidated business-rules document yet.

---

## v0.4.0 — Data Model

**Status:** In progress

Objectives:

- [x] Define data structures — TypeScript domain types (see v0.3.0).
- [x] Specify measured, calculated and validated data — ADR-003 (Raw vs Derived Data) plus the Input/Result pattern used by every ACE calculation engine.
- [ ] Standardize data storage — no persistence layer yet.
- [ ] Prepare interoperability — no API layer yet (`apps/api` is not started).

---

## v0.5.0 — Arrow Tuning Module

**Status:** Content complete (not yet tagged as a release)

Objectives:

- [x] Arrow configuration — `Arrow` type, `calculateArrowMass()`.
- [x] FOC analysis — `calculateFrontOfCenter()`.
- [x] Dynamic spine analysis — modeled as spine indexing + plunger tuning rather than a calculated formula (`StaticSpineMeasurement`, `calculateRecommendedPlungerSpringTension()`); see `CHANGELOG.md` [Unreleased] for the reasoning.
- [x] Performance calculations — Kinetic Energy, Momentum, Arrow Speed estimation, Time of Flight, Ballistics (`packages/core/ace/src/calculations`, `packages/core/ace/src/ballistics`).
- [x] Validation workflow — `isValidArcher`, `isValidArrow`, `isValidBow`, `isValidPlunger`, `isValidEnvironment`, `isValidShot`, `isValidSession` (`packages/core/ace/src/validations`).

Note: this covers the ACE calculation-engine side of Arrow Tuning.
No UI/workflow for a human to actually perform the tuning (v0.6.0+
territory, once `apps/web` exists) is in scope yet.

---

## v0.6.0 — Video Analysis Module

**Status:** In progress

Objectives:

- [x] Shot sequence analysis — domain types in place (`ShotSequenceAnalysis`, `PoseFrame`, `PoseKeypoint`); pose estimation wrapper (`createPoseDetector`, `estimatePoseFrame`) built against the real `@tensorflow-models/pose-detection` BlazePose API and verified end-to-end on the WASM backend; frame extraction (`readVideoMetadata`, `extractFramesFromVideo`) via `ffmpeg-static`/`ffprobe-static` (`packages/domains/video-analysis/src/frame-extraction`, `src/pose-estimation`). Not yet wired together into one end-to-end "video file in, pose sequence out" call.
- [ ] Shooting phase detection — `ShootingPhase` taxonomy (`types/phase.ts`) reviewed and corrected against real coaching methodology, first with Tommaso Franchini (FITARCO tessera 151218) then cross-checked against a written manual by Filippo Clini (Italian national team coach): Stance, Nocking, SetUp, PreDraw, Drawing, Anchor, Aiming, Expansion, Release, FollowThrough. `biomechanics/` and `shot-analysis/analyzeShotVideo()` exist as building blocks. `phase-detection/detectShootingPhases()` is a first-pass, provisional detector for Anchor/Release/FollowThrough, calibrated against one real video — needs validating against many more before its thresholds can be trusted, and Stance/Nocking/SetUp/PreDraw/Drawing/Aiming/Expansion still aren't detected at all. Release specifically needed a real correction: not audio (clicker sound), but the string-hand fingers' movement and tension, per coach input — `hand-tension/` is a first attempt at a texture-based tension proxy (`computeHandTensionMetric()`), since BlazePose has no finger-level keypoints to detect finger curl/direction directly; a real validation run against the slow-motion calibration video found the metric dominated by incidental clothing edges rather than tendon texture, so this specific approach is **paused, not resolved** (see `types/phase.ts`, `README.md`). `scripts/inspect-elbow-angle.cjs` adds a separate, lower-risk signal in the meantime — draw-arm elbow angle over time (via the existing `biomechanics/angleAtJointDegrees()`), rendered as an SVG chart, useful for judging Drawing/Expansion fluidity independently of the still-open Release-tension question.
- [x] Timing analysis — `calculatePhaseDurations()` (`packages/domains/video-analysis/src/calculations/timing`), pure post-processing over phase segments.
- [ ] Technical performance metrics — `posture-analysis/analyzePosture()` computes six real-time postural checks (shoulder/hip level, both elbow angles, head tilt, torso verticality) from a single `PoseFrame`. Deliberately ported from a real, working third-party reference tool ("Archery Posture Tracker", ghiggo.altervista.org/posture) rather than invented from scratch — its default ideal/warning ranges are a real starting point, not yet calibrated against any footage of Tommaso or validated by a coach.

  First attempt at viewing this was `scripts/inspect-posture.cjs` — a single hand-picked video frame plus a skeleton overlay. Real use on the real Mac found this the wrong approach entirely, in two steps: first, its "pick the midpoint of the video" default landed after Release/FollowThrough rather than at Anchor, and the follow-up idea (read a good timestamp off `inspect-elbow-angle.cjs`'s chart) turned out wrong too, since that signal is just as noisy as the wrist-velocity one already known to be unusable for this video. Then the real point was made directly: a coach doesn't review one chosen still frame, they watch the whole action continuously. Replaced the single-frame tool rather than patch it further: `scripts/build-posture-timeline.cjs` computes posture metrics for every frame of a video, and `tools/posture-video-player.html` plays the original video back with the skeleton/angles drawn live on top (synced via `requestVideoFrameCallback`), with frame-by-frame stepping to find a specific moment by eye. The viewer initially failed to open at all in Safari (worked in Chrome) — Safari's `file://` sandbox blocks a local page from loading a script from a parent directory, which is exactly what the original `<script src="../scripts/lib/...">` reference did; fixed by inlining that same rendering code directly into the page instead of loading it as a separate file, the same tradeoff already made for `tools/overhead-alignment.html`. Not yet run for real end-to-end (same `tfhub.dev` network limitation blocking every BlazePose script in this dev sandbox) — needs a real pass on the Mac.

  The manual's own overhead-view alignment check (bow hand / draw elbow / head forming a triangle, plus a forearm-to-arrow line) needs a camera positioned directly above the archer — a different viewing angle from every calibration video collected so far, and it was not known (still isn't, from automatic pose estimation) whether BlazePose works reliably from that angle. Resolved, for now, by sidestepping the question rather than testing it: `manual-annotation/computeAnnotatedAngles()` + `tools/overhead-alignment.html` let a human place the points by hand on a still photo (exactly how the manual's own reference photos were made) and only compute the geometry from there — no video, no pose estimation, no camera-angle assumption. `scripts/compute-annotated-angles.cjs` runs the authoritative computation from the tool's exported JSON. Whether/how this manual-annotation path gets folded into the eventual real-time video pipeline (e.g. if an overhead camera turns out to work fine with BlazePose after all) is still open.

---

## v0.7.0 — Competition Analysis Module

**Status:** Planned

Objectives:

- Competition management.
- Performance history.
- Statistical analysis.
- Environmental conditions.
- Comparative reports.

---

## v0.8.0 — Performance Book

**Status:** Planned

Objectives:

- Athlete history.
- Equipment history.
- Performance evolution.
- Long-term analytics.

---

## v0.9.0 — Beta Release

**Status:** Planned

Objectives:

- Repository stabilization.
- Documentation review.
- Community feedback.
- Internal validation.

---

## v1.0.0 — First Stable Release

**Status:** Planned

Objectives:

- Stable public release.
- Complete documentation.
- Production-ready architecture.
- Public research platform.

---

# Long-Term Vision

Future releases may include:

- Artificial Intelligence assisted analysis.
- Machine Learning models.
- Computer Vision.
- Biomechanical analysis.
- Sensor integration.
- Wearable device support.
- Cloud synchronization.
- Research dataset publication.
- Open APIs.
- Plugin architecture.

These items are intentionally considered long-term goals and are not committed to a specific release.

---

# Roadmap Principles

The roadmap is guided by the following principles:

- Scientific rigor.
- Transparency.
- Reproducibility.
- Incremental development.
- Open collaboration.
- Long-term maintainability.

---

# Release Policy

Each release must satisfy the following requirements before publication:

- Documentation completed.
- Repository reviewed.
- Version assigned.
- Changelog updated.
- Repository tagged.

---

Archery Performance Lab is developed incrementally.

Each release represents a stable milestone in the evolution of the project.
