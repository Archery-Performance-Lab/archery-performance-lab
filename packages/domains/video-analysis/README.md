# @apl/video-analysis

Video Analysis Engine — corresponds to **M06 Video Analysis** in
`docs/architecture/APL_SYSTEM_ARCHITECTURE.md`.

## Status

Domain types, one pure calculation (`calculatePhaseDurations`), a
pose-estimation wrapper (`createPoseDetector`, `estimatePoseFrame`), a
frame-extraction module (`readVideoMetadata`,
`extractFramesFromVideo`), the two wired together
(`shot-analysis/analyzeShotVideo`), and a `biomechanics` module of
pure geometric/kinematic signal functions (distance, angle, velocity
between keypoints) all exist. Shooting-phase detection itself — using
those biomechanical signals to actually segment a pose sequence into
phases — is **not** implemented yet: it needs numeric thresholds
(how much wrist velocity counts as a Release spike, how close a
distance counts as "stabilized" at Anchor, etc.) that cannot be
responsibly invented without real, labeled footage to calibrate
against — see the note in `shot-analysis/` below.

The pose-estimation wrapper is type-checked and written against the
real `@tensorflow-models/pose-detection` API (its `.d.ts` files were
read directly, not guessed from memory). It runs on TensorFlow.js's
**WASM backend** (`@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm`),
not the more common `@tensorflow/tfjs-node` native bindings — that
package's native "tensorflow" backend does not implement several
image-preprocessing kernels BlazePose needs (`Transform`,
`RotateWithOffset`, `FlipLeftRight`), a long-standing, unresolved gap
confirmed via multiple upstream GitHub issues, not something fixable
from this package. The WASM backend implements the full kernel set and
has no compiled native addon, so it also isn't tied to the OS/CPU
architecture of the machine that ran `pnpm install`.

No `setWasmPaths()` configuration is needed: `@tensorflow/tfjs-backend-wasm`'s
npm `"main"` entry is a Node-specific build that detects it's running
under Node and resolves its `.wasm` binary relative to its own
`__dirname` — confirmed by reading that bundle's source, and confirmed
working (backend initializes cleanly) in this project's Linux dev
sandbox, which — unlike the old native-binary approach — the
architecture-portable WASM binary can actually run in.

Backend initialization has been verified end-to-end. Full detector
creation has not, since it needs to download BlazePose's model weights
from `tfhub.dev` on first use, and that host isn't reachable from this
dev sandbox. Run the real verification yourself:

```
cd packages/domains/video-analysis
node scripts/verify-pose-detector.cjs
```

This sets the WASM backend, creates a real BlazePose detector, runs it
on a synthetic image, and confirms the pipeline doesn't crash (not
that detection is accurate — the synthetic image has no real person in
it). It needs network access the first time, since model weights are
downloaded on demand. It's a manual script, not part of `pnpm test`,
since it's slow and network-dependent — see the comment at the top of
the script.

## Next steps

- Actual phase-boundary detection: consuming `biomechanics/`'s signal
  functions (and `shot-analysis/analyzeShotVideo()`'s pose sequence)
  to segment a shot into `ShootingPhaseSegment`s. Blocked on getting
  real, labeled footage to calibrate detection thresholds against —
  see `shot-analysis/` below.
- An `ArcherHandedness` (or similar) concept: which BlazePose keypoint
  is the "string arm" vs. "bow arm" depends on whether the archer is
  right- or left-handed, and on which side of the archer the camera
  is on. Not yet modeled — the `biomechanics/` functions are
  deliberately handedness-agnostic (they just take named keypoints),
  leaving this resolution to whatever calls them.

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
- `frame-extraction/` — `readVideoMetadata()` (dimensions, frame rate
  and duration, read via ffprobe), `extractFramesFromVideo()` (an
  async generator yielding one decoded RGB pixel tensor per extracted
  frame). Uses `ffmpeg-static`/`ffprobe-static` (bundled binaries, no
  system install required) via `fluent-ffmpeg`. ffmpeg is asked to
  output raw `rgb24` pixel data directly, rather than writing
  individual image files to disk, so each frame's bytes convert
  straight into a `tf.tensor3d()` with no separate image-decoding
  library — this package deliberately does not depend on
  `@tensorflow/tfjs-node` (see the pose-estimation section above), so
  `tf.node.decodeImage()` is not available. Verify with:

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/verify-frame-extraction.cjs
  ```

  This generates a tiny synthetic test video with ffmpeg itself (no
  video file needed), extracts frames from it, and checks the tensor
  shapes and frame count look right. Like the pose-detector script,
  it's manual (not part of `pnpm test`) since it spawns real,
  platform-specific binaries.
- `biomechanics/` — pure, deterministic geometry/kinematics functions
  over `PoseKeypoint`s: `findKeypoint()` (look up a named keypoint in
  a frame), `distanceBetweenKeypoints()`, `angleAtJointDegrees()` (the
  bend angle at a joint, e.g. the elbow), `perpendicularDistanceFromLinePixels()`
  (how far a keypoint sits off a straight line through two others —
  e.g. checking the grip-hand/shoulders/string-elbow alignment the
  coach described for Anchor), `keypointVelocityPixelsPerSecond()`.
  All pixel-based, not real-world units — this package has no camera
  calibration (focal length, distance to subject), so pixel distances
  and velocities are only meaningful *relatively*, within one
  recording. Fully unit-tested (no video needed — deterministic math
  over constructed fixtures).
- `shot-analysis/` — `analyzeShotVideo()`, `extractFramesFromVideo()`
  and `estimatePoseFrame()` wired together into one call that yields a
  `PoseFrame` per frame of a video file, handling tensor disposal
  correctly. This is as far as the pipeline goes for now: turning that
  pose sequence into actual `ShootingPhaseSegment`s needs numeric
  thresholds on the `biomechanics/` signals (e.g. "what wrist-velocity
  spike counts as Release"), and this project's own discipline (see
  the Dynamic Spine correction and the WASM backend decision earlier
  in `CHANGELOG.md`) is to not invent such numbers — they need
  calibrating against real, labeled footage first. Use
  `scripts/build-calibration-dataset.cjs [right|left]` to batch-process
  every video in a calibration folder and write out, per video, the
  draw-side wrist's velocity (raw pixels/second *and* normalized to
  "shoulder-widths per second", since videos at different resolutions
  and camera distances aren't directly comparable in raw pixels) and
  its distance to a face keypoint (anchor-point proxy), frame by
  frame, plus a `_summary.csv` with each video's peak velocity and
  closest wrist-to-face approach and when they happened — to read real
  numbers off real footage instead of guessing:

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/build-calibration-dataset.cjs right
  ```

  By default this reads from and writes to
  `~/Development/apl-video-calibration/` (`raw-videos/` in,
  `signals/*.csv` out) — override with the `APL_CALIBRATION_FOLDER`
  environment variable. That folder is deliberately **not** inside
  this repository: it holds real, potentially identifiable video of a
  minor athlete, which must never end up in a public open-source
  repository, and video files don't belong in a git repo regardless.
