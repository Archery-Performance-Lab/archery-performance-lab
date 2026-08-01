# Changelog

All notable changes to this project will be documented in this file.

The format follows the principles of **Keep a Changelog** and the project adopts **Semantic Versioning (SemVer)**.

---

## [Unreleased]

### Added

- ACE Physics Engine: `force()`, `calculateWeightForce()`, uniform motion helpers (`distanceFromVelocityAndTime`, `timeFromDistanceAndVelocity`, `averageVelocity`), `dragForce()`, `dragDecelerationConstant()`, `storedElasticEnergy()`.
- ACE Calculation Engines: Front of Center (`calculateFrontOfCenter`), Kinetic Energy (`calculateArrowKineticEnergy`), Momentum (`calculateArrowMomentum`), Arrow Speed estimation (`estimateArrowSpeed`), Time of Flight under drag (`calculateTimeOfFlight`), Plunger spring tension tuning (`calculateRecommendedPlungerSpringTension`) — the practical correction for dynamic spine / archer's paradox.
- `ballistics` module: full 2D trajectory under gravity and drag, integrated with a 4th-order Runge-Kutta method (`stepTrajectoryRK4`, `calculateBallisticTrajectory`).
- Static Spine data model (`StaticSpineMeasurement`), explicitly recording the test standard (`ASTM-F2031` or `AMO-ATA`) alongside the deflection value, since the two give different readings for the same shaft.
- `Plunger` (button) domain model, wired into `Bow`.
- Completed the `validations` module: `isValidArcher`, `isValidArrow` (composing `isValidStaticSpineMeasurement`), `isValidPlunger`, `isValidBow`, `isValidEnvironment`, `isValidShot` (World Archery 0-10 scoring), `isValidSession` (composing all of the above) — closes v0.5.0's "Validation workflow" objective.
- First automated tests for ACE, using Node's built-in test runner (`node:test`) — no third-party test framework dependency. Covers utils, all physics primitives, all 7 calculation engines, ballistics and the full validations module (73 tests, 23 suites), including a projectile-motion regression check against the closed-form solution.
- `typescript` and `@types/node` declared as devDependencies of `@apl/ace` (previously undeclared anywhere in the repo — `tsc` only worked by accident wherever a global install happened to exist). `turbo` and `prettier` declared as root devDependencies, for the same reason: both were already referenced by root scripts (`turbo run ...`, `prettier --write .`) but never installable from a clean checkout.
- Scaffolded `@apl/video-analysis` (M06 Video Analysis, first package under "Domains"): `PoseKeypoint`/`PoseFrame` types, a `ShootingPhase` taxonomy (see "Changed" below for the coaching-methodology review), `ShotSequenceAnalysis`, and `calculatePhaseDurations()` as the first pure calculation.
- Pose-estimation wrapper (`createPoseDetector`, `estimatePoseFrame`) against the real `@tensorflow-models/pose-detection` BlazePose API, running on TensorFlow.js's WASM backend (`@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm`) — verified end-to-end (backend initialization, detector creation, and `estimatePoses()` on a synthetic frame) on both a Linux sandbox and the target Mac.
- Frame extraction from video files: `readVideoMetadata()` (dimensions, frame rate, duration via ffprobe) and `extractFramesFromVideo()` (an async generator yielding one decoded RGB pixel tensor per frame), using `ffmpeg-static`/`ffprobe-static` via `fluent-ffmpeg` — closes the missing input side of `estimatePoseFrame()`.

### Changed

- `Arrow.spine: number` replaced with `Arrow.staticSpine: StaticSpineMeasurement`, to keep the measurement standard and units explicit rather than a bare number.
- `@apl/video-analysis`'s pose-estimation backend switched from `@tensorflow/tfjs-node` (native bindings) to the WASM backend: tfjs-node's native "tensorflow" backend does not implement several image-preprocessing kernels BlazePose needs (`Transform`, `RotateWithOffset`, `FlipLeftRight`) — a long-standing, unresolved upstream gap, not fixable from this package. The WASM backend implements the full kernel set and has no compiled native addon, so it is also portable across the OS/CPU architecture that ran `pnpm install`.
- `ShootingPhase` taxonomy reviewed and corrected against real coaching methodology (Tommaso Franchini, FITARCO tessera 151218): dropped `Nocking` (never evaluated), widened `Stance` to full-body posture including head stillness, and added `PreDraw`, `Aiming` and `Expansion` as their own phases rather than folding them into `Drawing`/`Release`. `Release` is documented as not directly observable from body pose alone (BlazePose tracks landmarks, not the arrow tip/clicker) — detection should primarily use the video's audio track, falling back to a string-arm velocity spike.

### Fixed

- ACE package failed to build: wrong relative path in `tsconfig.json`'s `extends`, a stale `./calculatics` import (folder had been renamed to `./calculations`), a duplicate `GRAVITY` export causing an ambiguous-export error, empty `physics` stub modules (`drag.ts`, `force.ts`, `motion.ts`) breaking `export *`, and `constants/air.ts` re-exporting itself instead of defining `AIR_DENSITY`.
- `pnpm test` failed on a clean checkout even after `pnpm install`, in two stages: (1) `turbo`/`typescript`/`@types/node`/`prettier` were undeclared, so pnpm had nothing to install; (2) once declared, `@types/node` still wasn't picked up inside `packages/core/ace` because pnpm workspaces don't hoist a package's dependencies to its siblings — each workspace package must declare what it uses. Fixed by declaring `typescript`/`@types/node` directly on `@apl/ace`, and explicitly setting `"types": ["node"]` in its test tsconfig rather than relying on automatic `@types` discovery.
- `pnpm-lock.yaml` was a near-empty skeleton (no dependency had ever been resolved with real registry access); replaced with a fully resolved lockfile.
- `.turbo/` (Turborepo's local cache directory) was not covered by `.gitignore`.

---

## [0.1.0] - 2026-07-23

### Added

- Initial public repository.
- Repository structure established.
- Project vision and mission.
- Research philosophy.
- Core principles.
- Validation philosophy.
- Initial module definition.
- Repository roadmap.
- Apache License 2.0.
- Initial `.gitignore`.
- Repository governance documentation.

---

## Versioning Policy

APL uses **Semantic Versioning (SemVer)**.

Version numbers follow the format:

MAJOR.MINOR.PATCH

Where:

- **MAJOR**: incompatible changes.
- **MINOR**: new functionality while maintaining compatibility.
- **PATCH**: bug fixes and documentation improvements.

Example:

- 0.1.0 → Repository Foundation
- 0.2.0 → Manifesto
- 0.3.0 → Domain Model
- 1.0.0 → First Stable Release

---

## Change Categories

The following categories are used when documenting releases.

### Added

New functionality.

### Changed

Changes to existing functionality.

### Deprecated

Features scheduled for removal.

### Removed

Features removed from the project.

### Fixed

Bug fixes.

### Security

Security-related improvements.

---

## Repository History

| Version | Status | Description |
|----------|--------|-------------|
| 0.1.0 | Released | Repository Foundation |
| 0.2.0 | Content complete | Manifesto |
| 0.3.0 | In progress | Domain Model |
| 0.4.0 | In progress | Data Model |
| 0.5.0 | Content complete | Arrow Tuning Module |
| 0.6.0 | In progress | Video Analysis Module |

---

Archery Performance Lab follows a transparent development process.

Every released version is permanently documented in this file.
