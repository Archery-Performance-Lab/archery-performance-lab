# @apl/video-analysis

Video Analysis Engine — corresponds to **M06 Video Analysis** in
`docs/architecture/APL_SYSTEM_ARCHITECTURE.md`.

## Status

Domain types, one pure calculation (`calculatePhaseDurations`), a
pose-estimation wrapper (`createPoseDetector`, `estimatePoseFrame`), a
frame-extraction module (`readVideoMetadata`,
`extractFramesFromVideo`), the two wired together
(`shot-analysis/analyzeShotVideo`, plus
`analyzeShotVideoWithFrames()` for callers that need the raw pixels),
a `biomechanics` module of pure geometric/kinematic signal functions
(distance, angle, velocity between keypoints), a **first-pass,
provisional** `phase-detection/detectShootingPhases()`, and a
`hand-tension/` module (a candidate, unvalidated texture-based proxy
for visible tendon tension in the string hand) all exist.
`detectShootingPhases()` detects Anchor, Release and FollowThrough
from real calibration footage; Stance, Nocking, SetUp, PreDraw,
Drawing, Aiming and Expansion are not detected yet — see
`phase-detection/` below for exactly why and what each would need.

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

- Validate and refine `phase-detection/detectShootingPhases()` against
  more real footage (`scripts/detect-phases.cjs` prints its output in
  seconds for exactly this) — thresholds were set from one video and
  need a coach confirming the detected segments against many more
  real shots before they can be trusted.
- Detect Stance, Nocking, SetUp, PreDraw, Drawing, Aiming and
  Expansion — see `phase-detection/` below for why they're not
  detected yet and what signals each would likely need.
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
- `types/phase.ts` — `ShootingPhase` (Stance, Nocking, SetUp, PreDraw,
  Drawing, Anchor, Aiming, Expansion, Release, FollowThrough),
  reviewed and corrected against real coaching methodology (Tommaso
  Franchini, FITARCO tessera 151218; cross-checked against a written
  manual by Filippo Clini, Italian national team coach) — see the
  type's own doc comment for what each phase means, how it should be
  detected, and the real back-and-forth on whether Nocking belongs at
  all.
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

  A real, extreme-close-up slow-motion video (Kim Woojin's Release,
  Berlin World Cup 2018) showed that the wrist-velocity signal this
  detector relies on can be genuinely too noisy to use, not just at
  the start of a clip but recurring throughout it — with the draw-side
  hand close to the face for most of its 55s duration, BlazePose's
  keypoint tracking gets intermittently confused by that proximity/
  occlusion the whole way through, producing spurious velocity spikes
  with no clean, sustained ramp to find. That video is being kept
  purely as a visual reference, not run through automated detection.

  This first led to a plan to require audible clicker sound in future
  calibration videos, on the idea that the clicker's audio could
  become the primary Release signal. Coach input corrected that: a
  real technical analysis is filmed from the side opposite the
  clicker, so an instructor never actually listens for it or watches
  it fall — they watch the string-hand fingers, and specifically
  whether the fingers open *involuntarily* (pushed open by the string)
  versus voluntarily (a technical fault). See `types/phase.ts`'s
  Release doc comment for the full reasoning. That's a genuine, still
  open problem for this detector: BlazePose has no individual finger
  keypoints, so the actual coaching criterion isn't something the
  current pose model can see at all.
- `phase-detection/` — `detectShootingPhases()`, a **first-pass,
  provisional** detector, not a finished one. Detects Anchor, Release
  and FollowThrough by finding a sustained rise in the draw-side
  wrist's velocity (not a single-frame spike — real calibration data
  showed the actual Release ramps over several consecutive frames,
  and that a single video's *global* peak velocity / closest approach
  can pick out the wrong moment, e.g. an early, non-sustained close
  approach to the face that wasn't really Anchor). Its thresholds
  (`PhaseDetectionOptions`, all with defaults) were derived from
  exactly one usable calibration video — real numbers, but a sample
  size of one, not a validated model. Stance, Nocking, SetUp, PreDraw,
  Drawing, Aiming and Expansion are not detected: Stance/Nocking/
  SetUp/PreDraw all happen before any string-hand motion the current
  signals capture (would need something like bow-arm elevation angle,
  or per-archer nocking-pattern comparison for Nocking specifically —
  see types/phase.ts); Aiming and
  Expansion both happen with the wrist already near the face, making
  them indistinguishable from Anchor using only wrist distance/
  velocity — Expansion in particular is driven by scapula rotation,
  which these signals don't capture, per the coach's description in
  `types/phase.ts`. Validate with:

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/detect-phases.cjs right
  ```

  This prints detected segments in seconds for every video in the
  calibration folder — scrub to those timestamps in the real videos
  and confirm whether they match. Disagreements should turn into
  threshold/logic changes in `phase-detection/detect.ts`, which is
  meant to keep improving as more real footage gets checked against
  it, not to be treated as finished.

  A real run against all 17 calibration videos surfaced a genuine bug,
  not a threshold to tune: `detectShootingPhases()` has no notion of
  the pose detector's own startup noise (see the calibration-script
  warmup note below), so 14 of 17 videos detected "Release" within the
  first ~300ms and then an implausible "FollowThrough" spanning almost
  the entire rest of the clip (up to 320+ seconds in one case) — the
  false trigger from warmup noise stopped the detector from ever
  looking further into the video for the real Release. Fixed at the
  call site, not inside `detectShootingPhases()` itself: both
  `detect-phases.cjs` and `inspect-slowmo-release.cjs` now filter out
  frames from the first 300ms before detection runs, keeping
  `detectShootingPhases()` a pure function agnostic to where its
  frames came from (its synthetic unit tests build clean sequences
  starting at t=0 and would break if the function silently dropped
  early frames itself). Any script or caller that feeds it real video
  frames needs to apply the same filter — this is not automatic.

  `scripts/inspect-slowmo-release.cjs [videoFilePath] [right|left]` is
  a one-video-at-a-time variant for a specific reason: a slow-motion,
  fixed-camera close-up of Kim Woojin's Release (Berlin World Cup
  2018) shows the actual moment the string leaves the fingers spread
  across far more real frames than any normal-speed clip does, which
  is exactly what's needed to check detect.ts's "sustained rise over N
  consecutive frames" logic against fine-grained ground truth instead
  of a release compressed into 2-3 frames. Rather than re-scanning the
  whole (growing) calibration folder to look closely at one video, this
  runs the pipeline against a single file — defaulting to that
  slow-motion video — and prints a dense, frame-by-frame table around
  the detected phases (or the peak-velocity moment, if no Release was
  found), in addition to writing the same per-frame CSV the batch
  script would. Same usage pattern:

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/inspect-slowmo-release.cjs right
  ```
- `hand-tension/` — `computeCropRegionAroundKeypoint()` (a crop region
  sized relative to shoulder width, centered on a keypoint, clamped to
  frame bounds — pure, fully unit-tested), `cropFrameRegion()` (slices
  that region out of a frame tensor), `computeHandTensionMetric()`
  (variance of the region's Laplacian response — a standard,
  explainable texture/edge-density measure, not a learned model).

  This exists for a specific, real coaching observation (see
  `types/phase.ts`'s Release doc comment): a tensed hand visibly shows
  its tendons standing out under the skin, a relaxed one doesn't —
  which BlazePose's keypoint model (position-only, no finger joints)
  cannot see, since it's a texture difference, not a position one.
  Whether Laplacian variance over a hand-sized crop is actually a good
  proxy for that is a real, **completely unvalidated** hypothesis —
  nobody has yet checked whether this metric's values rise around
  real tension (Anchor/Expansion) versus a relaxed moment in real
  footage. `scripts/inspect-hand-tension.cjs [videoFilePath]
  [right|left]` exists to check exactly that: it computes the metric
  frame by frame around the draw-side wrist (defaulting to the
  slow-motion Kim Woojin video, the highest-resolution footage
  available) and prints the highest/lowest values with their
  timestamps, so they can be checked against what the real video shows
  at those exact moments — the metric means nothing until validated
  that way.

  `shot-analysis/analyzeShotVideoWithFrames()` is the pipeline variant
  this needed: `analyzeShotVideo()` disposes each frame's pixel tensor
  right after pose estimation, since it never exposes the raw image —
  fine for keypoint-only signals, but hand-tension/ needs the actual
  pixels, so this new generator yields the frame alongside its
  PoseFrame and leaves disposal to the caller instead.

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/inspect-hand-tension.cjs right
  ```
