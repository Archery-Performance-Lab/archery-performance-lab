# @apl/video-analysis

Video Analysis Engine — corresponds to **M06 Video Analysis** in
`docs/architecture/APL_SYSTEM_ARCHITECTURE.md`.

## Status

Domain types, one pure calculation (`calculatePhaseDurations`), and a
pose-estimation wrapper (`createPoseDetector`, `estimatePoseFrame`)
exist. Video-to-frame extraction (e.g. via ffmpeg) and shooting-phase
detection from pose data are **not** implemented yet.

The pose-estimation wrapper is type-checked and written against the
real `@tensorflow-models/pose-detection` API (its `.d.ts` files were
read directly, not guessed from memory), but has **not** been run
end-to-end: `@tensorflow/tfjs-node` ships a platform-specific native
binary, built for whichever machine ran `pnpm install` (your Mac).
It cannot load on a different platform (confirmed here — the dev
sandbox this was built in is Linux, and loading the Mac-built binary
fails with "invalid ELF header"). Run the real verification yourself:

```
cd packages/domains/video-analysis
node scripts/verify-pose-detector.cjs
```

This creates a real BlazePose detector, runs it on a synthetic image,
and confirms the pipeline doesn't crash (not that detection is
accurate — the synthetic image has no real person in it). It needs
network access the first time, since model weights are downloaded on
demand. It's a manual script, not part of `pnpm test`, since it's slow
and network-dependent — see the comment at the top of the script.

## Next steps

- Frame extraction from video files (needs a decision: ffmpeg via a
  wrapper library, or something else).
- Wiring `estimatePoseFrame()` output into shooting-phase detection —
  this is where the `ShootingPhase` taxonomy in `types/phase.ts`
  actually gets used, so it's worth settling that taxonomy first.

## Domain model

- `types/pose.ts` — `PoseKeypoint`, `PoseFrame`. `PoseKeypoint.name` is
  a plain string, not a fixed union. In practice, BlazePose's `tfjs`
  runtime always sets a name from its fixed 33-landmark list (verified
  by reading its detector source), but the underlying library types
  the field as optional since it's shared across models, so
  `estimatePoseFrame()` falls back to a positional placeholder if it's
  ever missing rather than throwing.
- `types/phase.ts` — `ShootingPhase`, a first-pass six-phase taxonomy
  (Stance, Nocking, Drawing, Anchor, Release, FollowThrough). This is
  a starting point for discussion, not a settled decision — it should
  be reviewed against real coaching methodology before it drives any
  phase-detection logic.
- `types/shot-sequence.ts` — `ShotSequenceAnalysis`, the full result
  for one shot's video.
- `calculations/timing` — `calculatePhaseDurations()`, pure
  post-processing over already-detected phase segments.
- `pose-estimation/` — `createPoseDetector()` (BlazePose, `tfjs`
  runtime), `estimatePoseFrame()` (runs the detector on one already
  decoded frame and converts the result to `PoseFrame`).
