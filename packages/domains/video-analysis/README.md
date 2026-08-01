# @apl/video-analysis

Video Analysis Engine — corresponds to **M06 Video Analysis** in
`docs/architecture/APL_SYSTEM_ARCHITECTURE.md`.

## Status

Scaffolding only. Domain types and one pure calculation
(`calculatePhaseDurations`) exist and are tested. Pose estimation
(actually detecting body landmarks from video frames) is **not**
implemented yet.

## Why pose estimation isn't here yet

Unlike ACE's physics/calculation engines, pose estimation isn't a
formula that can be written from first principles — it requires a
trained machine learning model. The chosen approach is
TensorFlow.js pose detection (`@tensorflow-models/pose-detection`,
BlazePose model, `tfjs` runtime), running on `@tensorflow/tfjs-node`.

The development sandbox this scaffolding was built in has no access to
the npm registry, so these packages could not be installed or verified
here. To continue:

```
pnpm add @tensorflow/tfjs-node @tensorflow-models/pose-detection --filter @apl/video-analysis
```

Once installed, the pose-estimation wrapper can be written and
verified against the real library API (rather than guessed).

## Domain model

- `types/pose.ts` — `PoseKeypoint`, `PoseFrame`. `PoseKeypoint.name` is
  a plain string, not a fixed union, until a specific model's exact
  landmark set is wired in and confirmed.
- `types/phase.ts` — `ShootingPhase`, a first-pass six-phase taxonomy
  (Stance, Nocking, Drawing, Anchor, Release, FollowThrough). This is
  a starting point for discussion, not a settled decision — it should
  be reviewed against real coaching methodology before it drives any
  phase-detection logic.
- `types/shot-sequence.ts` — `ShotSequenceAnalysis`, the full result
  for one shot's video.
- `calculations/timing` — `calculatePhaseDurations()`, pure
  post-processing over already-detected phase segments.
