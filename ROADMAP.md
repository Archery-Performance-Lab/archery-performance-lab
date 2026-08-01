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
- [ ] Shooting phase detection — `ShootingPhase` taxonomy (`types/phase.ts`) reviewed and corrected against real coaching methodology (Tommaso Franchini, FITARCO tessera 151218): Stance, PreDraw, Drawing, Anchor, Aiming, Expansion, Release, FollowThrough. Release detection needs the video's audio track (clicker sound) as the primary signal, falling back to a string-arm velocity spike — no detection algorithm implemented yet.
- [x] Timing analysis — `calculatePhaseDurations()` (`packages/domains/video-analysis/src/calculations/timing`), pure post-processing over phase segments.
- [ ] Technical performance metrics.

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
