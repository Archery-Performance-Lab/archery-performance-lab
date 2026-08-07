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
(distance, angle, velocity, angle-from-horizontal, tilt-from-vertical,
angle-between-two-arbitrary-lines between keypoints), a **first-pass,
provisional** `phase-detection/detectShootingPhases()`, a
`hand-tension/` module (a candidate, unvalidated texture-based proxy
for visible tendon tension in the string hand), a `posture-analysis/`
module (seven real-time postural checks — shoulder/hip level, both
elbow angles, head tilt, torso verticality, and foot-stance angle
relative to the hips — computed from BlazePose keypoints), a
continuous video-tracking workflow
(`scripts/build-posture-timeline.cjs` + `tools/posture-video-player.html`,
the latter now also able to run BlazePose directly in the browser
against a freshly uploaded video or photo — see its own entry below —
every frame of a video's worth of posture metrics, played back with
a live skeleton overlay, rather than one hand-picked frame), and a
`manual-annotation/` module (the same kind
of angle/distance checks, but computed from points a human places by
hand on a still photo instead of from BlazePose — for checks that need
a camera angle pose estimation has not been verified against; see
below) all exist. `detectShootingPhases()` detects Anchor, Release and
FollowThrough from real calibration footage; Stance, Nocking, SetUp,
PreDraw, Drawing, Aiming and Expansion are not detected yet — see
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

  **Status: paused, not resolved.** That validation check happened,
  against the slow-motion Kim Woojin video, and the hypothesis did not
  survive it. The highest and lowest readings differed by ~10x (243
  vs. 21) between two frames that looked visually near-identical at
  anchor. Reconstructing the exact crops from their logged coordinates
  showed why: the high-reading crop happened to include the sharp,
  high-contrast boundary between the hand/glove and the archer's
  bright white shirt collar behind it, while the low-reading crop
  stayed on smoother skin. Plain Laplacian variance over an
  unconstrained square crop is dominated by whichever strong
  incidental edge (clothing, background) happens to fall inside it,
  not by the much subtler texture difference real tendons would
  produce. `computeCropRegionAroundKeypoint()`/`cropFrameRegion()`/
  `computeHandTensionMetric()` are kept — real, tested, general-purpose
  primitives — but this specific use of them is a negative result, not
  something to build on as-is.

  Considered and left open, not decided: a tighter/smaller crop
  (reduces but doesn't eliminate the risk of catching a clothing
  edge); excluding the strongest edge responses before computing
  variance, so one sharp boundary can't dominate the number; or
  dropping this approach and treating Release finger-tension as a
  human-judgment-only criterion for now (see `types/phase.ts`).
  Work paused here — see `types/phase.ts`'s hand-tension note for the
  same summary closer to the code.

- `scripts/inspect-elbow-angle.cjs [right|left]` — batch script over
  every calibration video computing the draw arm's elbow bend
  (shoulder-elbow-wrist, via the existing `biomechanics/
  angleAtJointDegrees()` — the calculation already existed, only the
  script is new) frame by frame, and rendering it as a chart over
  time. Prompted by an out-of-context suggestion from an unrelated
  chat to use Python + MediaPipe + OpenCV for this; MediaPipe and this
  project's BlazePose (via `@tensorflow-models/pose-detection`) are the
  same underlying pose model family, so the signal itself is sound —
  it just didn't need a second language/runtime added to this
  monorepo for one chart. Applies the same 300ms warmup exclusion and
  per-video try/catch pattern as `detect-phases.cjs` and
  `build-calibration-dataset.cjs` (see the warmup-noise bug above), so
  one bad video doesn't take the batch down and pose-detector startup
  jitter doesn't show up as fake elbow-angle noise at the start of
  every chart.

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/inspect-elbow-angle.cjs right
  ```

  Writes one CSV per video to `signals/` (`timestamp_ms,
  draw_arm_elbow_angle_degrees`) and one SVG chart per video to a new
  `charts/` folder alongside it, both outside this repository. Charts
  are rendered by `scripts/lib/render-svg-line-chart.cjs`, a small,
  dependency-free SVG line-chart generator (plain string-building —
  same zero-new-dependency spirit as this project's `node:test` test
  runner and its WASM-over-native backend choice) rather than a
  charting library or a Python/matplotlib detour. One rendering
  decision worth recording: a rotated, vertical y-axis label was tried
  first, but ImageMagick's built-in SVG renderer (used here only to
  spot-check output as PNG) rendered rotated `<text>` as invisible in
  an isolated test — possibly an ImageMagick-specific limitation rather
  than a real browser issue, but since actual browser rendering
  couldn't be verified from this sandbox, the design was changed to a
  plain horizontal label instead of shipping an unverified assumption.
  Open the `.svg` files directly in a real browser to view the charts.

- `posture-analysis/` — seven postural checks computed from a single
  `PoseFrame`: shoulder level, hip level, bow-arm elbow angle,
  draw-arm elbow angle, head tilt, torso verticality, and foot-stance
  angle relative to the hips.
  `analyzePosture(frame, drawSide, metricDefinitions?)` returns one
  result per metric (`valueDegrees`, `status: "ok" | "warning" |
  "outOfRange"`). `valueDegrees` is `null` when a metric's required
  keypoints are missing or below confidence — a real "cannot tell",
  not a misleading 0°. `status` is `null` in that same case, but can
  also be `null` while `valueDegrees` is a real number: see
  footStanceAngle below. Two `biomechanics/` primitives back the
  original six: `angleFromHorizontalDegrees()` (how far a line
  deviates from level — shoulders, hips, ears) and
  `tiltFromVerticalDegrees()` (how far a line deviates from plumb —
  torso). The seventh metric, footStanceAngle, reuses
  `angleBetweenLinesDegrees()` (see the `manual-annotation/` entry
  below for where that primitive was first added) rather than needing
  a new one, since it compares two lines that don't share a vertex.

  **footStanceAngle** — the angle between the feet line
  (`left_heel`↔`right_heel`) and the hip line (`left_hip`↔`right_hip`)
  — is a real extension beyond the ghiggo port described next, added
  directly on request to measure stance "opening" relative to the
  pelvis. It originally shipped with `idealRangeDegrees: null,
  warnRangeDegrees: null` in `DEFAULT_POSTURE_METRICS`: there was no
  third-party reference tool value to copy for it, and this package
  does not invent numeric thresholds without a real source (see
  CLAUDE.md). **Update**: `idealRangeDegrees` is now `[-2.5, 4.0]`, a
  direct request rather than an invented number — still not ported
  from any reference implementation the way the other six ranges are,
  but a real, deliberately-given value, not a guess. `warnRangeDegrees`
  was not separately specified alongside it, so it defaults to ±12°
  around the ideal range's own center (0.75°, giving `[-11.25,
  12.75]`) — the same tolerance "Cattura come ideale" already uses
  around a single captured value (see below), applied here to a given
  range's midpoint instead. `evaluatePostureMetric()` still returns
  `null` for any metric whose definition has a `null` range — that
  mechanism remains live (a coach can clear a range in
  `posture-video-player.html`'s "Soglie" panel and get exactly that
  "non calibrato" gray state back), it's just no longer footStanceAngle's
  own starting state.

  **Update**: `drawArmElbow`'s `idealRangeDegrees` was also overridden
  from ghiggo's original `[25, 40]` to `[1, 15]` on direct request —
  the first time an already-ported ghiggo range has been overridden
  rather than a new metric's range being set for the first time.
  `warnRangeDegrees` follows the same convention as an unspecified warn
  range elsewhere in this file: ±12° around the new ideal range's own
  center (8°, giving `[-4, 20]`), rather than keeping the old warn
  range (`[10, 50]`), which was built around the previous ideal and no
  longer made sense next to the new one.

  This module, and the skeleton-overlay renderer below, are ported
  deliberately closely from a real, working reference implementation:
  "Archery Posture Tracker" (ghiggo.altervista.org/posture), a
  third-party browser tool built on MediaPipe Pose (the same
  underlying model family as this project's BlazePose — see the
  elbow-angle script above for that same point made independently).
  Its client-side source is plain, unminified JavaScript and was read
  directly rather than reverse-engineered from watching it run — the
  exact keypoints, formulas, and default ideal/warning ranges
  (`DEFAULT_POSTURE_METRICS` in `posture-analysis/metrics.ts`) are
  copied from it, not re-derived or guessed. That reference tool
  itself treats those default ranges as a per-archer starting point,
  not a fixed truth — it has a "Cattura" (capture) feature that
  rebuilds a profile's ranges from an archer's own good position
  rather than trusting a universal number. `DEFAULT_POSTURE_METRICS`
  carries the same caveat here: it is a real, working starting point,
  but has not been calibrated against any footage in this project —
  whoever consumes it should let a coach override it from a real
  captured position, not treat it as validated for Tommaso or any
  other specific archer.

  Two things that reference tool does that are worth naming
  explicitly because this module does NOT do them: it always computes
  the same six metrics regardless of camera angle (no detection of
  front/back/side/overhead framing), and it is a completely different
  check from the "Livello Avanzato per l'istruttore" manual's
  overhead-view alignment triangle (bow hand / draw elbow / head,
  plus a forearm-to-arrow alignment line) — the manual's check needs a
  camera positioned directly above the archer and was not
  reproduced here; see the "Next steps" below for where that stands.

  `scripts/lib/render-skeleton-overlay-svg.cjs` draws the skeleton
  (connecting lines + keypoint dots, confidence-aware — a connection
  or dot is only drawn when its keypoint(s) meet a confidence
  threshold, so a partial/lateral view naturally yields a partial
  skeleton rather than needing separate code paths per camera angle),
  the two elbow-angle readouts, and dashed shoulder/hip alignment
  boxes, color-coded by status — same drawing logic as the reference
  tool's canvas code, ported to a plain SVG string (this project's
  established zero-dependency approach, same as the elbow-angle
  chart). `scripts/lib/render-posture-overlay-html.cjs` wraps one
  extracted frame image and that SVG into a single standalone `.html`
  file (image and SVG stacked via `position:absolute`, both stretched
  to the same container so they stay pixel-aligned at any zoom level),
  plus a metrics table underneath — opens directly in any browser, no
  new dependency, consistent with the browser-first client-side
  architecture decision (`docs/architecture/AWI_WEB_INTERFACE.md`).

  `scripts/inspect-posture.cjs [videoFilePath] [right|left]
  [timestampMilliseconds]` ties this together for one video and one
  frame at a time (same conservative, single-video-first pattern as
  `inspect-slowmo-release.cjs`/`inspect-hand-tension.cjs`: prove a new,
  unvalidated capability on one real frame before deciding whether to
  batch it). It extracts that frame as a real JPG (accurate,
  post-input `-ss` rather than fast pre-input seeking, so the JPG
  lines up with the exact PoseFrame timestamp used for the overlay —
  slower, but these calibration clips are short enough that it does
  not matter), computes the metrics, and writes one `.html` file
  next to the JPG:

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/inspect-posture.cjs right
  ```

  Defaults to the slow-motion Kim Woojin video and the midpoint of its
  duration if no path/timestamp is given. Output goes to a new
  `posture/` folder alongside `signals/` and `charts/`, outside this
  repository.

  **Verification status**: the pure logic (`analyzePosture()`, the two
  new geometry primitives) has real unit tests, and the SVG/HTML
  renderers were checked against synthetic keypoint data rendered to
  PNG for a visual sanity check. The full pipeline could only be
  partially verified from this dev sandbox (no `tfhub.dev` network
  access to download BlazePose's model weights — same limitation
  `verify-pose-detector.cjs` already documents), so real verification
  happened on the real Mac, and surfaced three real, concrete bugs in
  short order (all fixed, see CHANGELOG.md): the script's own argument
  parsing didn't match its two sibling scripts' convention, ffmpeg's
  `-frames:1` was a malformed option name (ffmpeg parsed `1` as a
  stream specifier, not a frame count — should have been
  `-frames:v 1`), and ffmpeg 6.0 warned about writing a single JPEG
  without `-update 1`.

  Once those were fixed, the pipeline ran genuinely end-to-end for the
  first time — real BlazePose output, real posture metrics, a real
  `.html` overlay — and surfaced something worth checking before
  trusting any of the six numbers: all six metrics reported "OK", but
  visually comparing the rendered skeleton to the photo showed the
  draw-arm joints and the hips drawn in positions that did not obviously
  match what the photo shows. Adding a console dump of every keypoint's
  raw `confidenceScore` (now in `inspect-posture.cjs` — see below)
  showed the legs/feet correctly filtered out (confidence near 0, as
  expected — they are out of frame in this close-up clip) and the
  draw-arm elbow/wrist reported *high* confidence (0.99+) well inside
  the frame, which briefly looked like it could be BlazePose confidently
  guessing wrong for an occluded joint — a real, harder failure mode no
  confidence threshold would catch.

  It wasn't that. Checked against the real video directly (per this
  project's standing rule: verify against real footage before trusting
  a metric, not just because the numbers came out OK): the default
  timestamp — the midpoint of this video's 55.8s duration, picked with
  no knowledge of what is actually happening at that instant — landed
  *after* Release and FollowThrough had already finished, not during
  Anchor. A 25° elbow-bend reading is exactly what a hand already
  pulled back past the jaw during FollowThrough would look like, not a
  detection error at all. The lesson: `inspect-posture.cjs`'s
  "midpoint of duration" default is a blind guess and should not be
  trusted for any video without checking what it actually landed on —
  pass an explicit `timestampMilliseconds` instead.

  A follow-up guess turned out wrong too, corrected here rather than
  left standing: the expectation was that `scripts/inspect-elbow-angle.cjs`'s
  existing per-frame chart would show a clean plateau right before
  Release, readable by eye to find Anchor without scrubbing raw video.
  Checked against the real chart for this specific slow-motion video —
  it doesn't. The whole signal is noisy (large swings, no stable
  plateau anywhere), most severely in the first ~11 seconds but never
  fully settling afterward either. This is not a new problem: it is
  the *same* pose-detection instability already documented elsewhere
  in this README as the reason `phase-detection/detectShootingPhases()`
  was found unsuitable for this particular video (shoulder-width
  instability well past the usual 300ms warmup window, recurring
  noise throughout the clip) — it turns out to affect this angle
  signal too, contrary to the (wrong, now corrected) assumption that a
  static per-frame angle would be less sensitive to it than a velocity
  derivative. This video stays what it was already decided to be: a
  visual reference, not a source of automated timestamps. Finding a
  real Anchor moment in it means scrubbing the actual video by eye and
  reading the timestamp off the player — or picking one of the
  normal-speed calibration clips `detect-phases.cjs` already handles
  well instead, if the goal is a clean first posture-overlay example
  rather than specifically this video.

  All of the above — including the corrected suggestion — was still
  built on a wrong premise pointed out directly afterward: a real
  coach does not review one carefully-chosen still frame, they watch
  the entire action continuously. Picking "the right timestamp" was
  never really the task. `scripts/build-posture-timeline.cjs` and
  `tools/posture-video-player.html` (below) replace this single-frame
  workflow rather than patch it further.

- **Continuous video tracking** — `scripts/build-posture-timeline.cjs
  [videoFilePath] [right|left] [framesPerSecondToExtract]` runs pose
  estimation and `analyzePosture()` across an ENTIRE video, not one
  frame, and writes every frame's keypoints and posture metrics to one
  JSON file (`posture-timeline/{video}_timeline.json`, outside this
  repository). Deliberately does NOT apply the usual 300ms
  warmup-exclusion filter used elsewhere in this package (see
  `detect-phases.cjs`) — the point here is to let a human see exactly
  where and how detection is unstable, not hide it behind a filter
  tuned for a different job (automated phase-boundary detection).

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/build-posture-timeline.cjs right
  ```

  A full-rate pass over a ~56s clip is on the order of a thousand-plus
  real BlazePose inferences — expect minutes, not seconds, and a
  multi-megabyte JSON file; pass a lower `framesPerSecondToExtract` to
  trade detail for speed/size.

  `tools/posture-video-player.html` was the other half: a standalone,
  dependency-free page (same "nothing leaves the machine" design as
  `tools/overhead-alignment.html`) where you originally selected the
  original video file and this pre-computed JSON side by side, then
  played the video with the skeleton, angle readouts and alignment
  boxes drawn live on top, synced to actual video frames via
  `requestVideoFrameCallback` (the same browser API "Archery Posture
  Tracker" itself uses — see `posture-analysis/`'s doc comment). **This
  two-file, JSON-first workflow was later replaced — see "In-browser
  automatic processing" further below — by loading a video or photo
  directly into the player, no separate `build-posture-timeline.cjs`
  run required first.** `build-posture-timeline.cjs` itself still
  exists and still works exactly as described above; it is just no
  longer the player's own required first step.

  **Two real bugs found once tested on real Mac footage, both fixed
  rather than left as caveats** (historical — both concerned the
  since-removed two-file model, kept here as an accurate record of
  what was found and fixed at the time, not a description of the
  player's current input model):

  The player was, at the time, the only place in this package where
  the video the keypoints were computed FROM and the video being
  displayed were two independently chosen files (every other tool
  works on one video at a time end-to-end). Loading a mismatched pair
  — e.g. the Kim Woojin calibration clip's JSON alongside a different
  video the user just filmed — silently rendered a skeleton with no
  relationship to what's on screen, since nothing checked the two
  files actually corresponded. A `checkDimensionMismatch()` function
  compared the loaded `<video>`'s real `videoWidth`/`videoHeight`
  against the JSON's `widthPixels`/`heightPixels` whenever either file
  changed, showing a visible warning banner instead of rendering a
  meaningless overlay silently. This function (and the mismatch it
  guarded against) no longer exists in the current single-file-input
  version — the keypoints and the displayed frame now always come from
  the exact same uploaded file, by construction, so the class of bug
  it fixed cannot occur anymore either.

  Separately, and even with a correctly-matched pair: `<video>` and the
  overlay `<svg>` (both styled `width:100%; height:100%` of the same
  box) each independently decide how to fit their own content into that
  box. SVG's own default (`preserveAspectRatio="xMidYMid meet"`)
  letterboxes to preserve the `viewBox`'s aspect ratio whenever it
  differs from the box's — a different amount of letterboxing than the
  video layer, silently drifting the overlay out of alignment. Fixed by
  forcing both layers to stretch identically instead of each fitting
  itself independently: explicit `object-fit: fill` on the `<video>`,
  and `preserveAspectRatio="none"` added to `renderSkeletonOverlaySvg()`'s
  emitted `<svg>` root (kept in sync in both the inline copy here and
  `scripts/lib/render-skeleton-overlay-svg.cjs`).

  **Correction (real Safari test, not a hypothesis):** this page
  originally loaded `scripts/lib/render-skeleton-overlay-svg.cjs`
  directly via a plain `<script src="../scripts/lib/render-skeleton-overlay-svg.cjs">`
  tag, so the rendering logic would exist in exactly one file rather
  than being duplicated by hand. That worked in Chrome, but the page
  would not open at all in Safari on the real Mac. The cause wasn't
  the dual-environment guard — it's that the `<script src>` path walks
  UP out of `tools/` into a sibling folder (`../scripts/lib/...`), and
  Safari's `file://` security sandbox refuses to load a subresource
  from a directory above the page's own folder (Chrome is more
  permissive here, which is why this went unnoticed until a real
  Safari run). Properly avoiding that would mean serving this package
  over a local HTTP server just to open one static page, which breaks
  the project's "just double-click it, no dependencies" design for
  this tool. So the fix copies the same rendering functions directly
  into `posture-video-player.html`'s own inline `<script>` block —
  the same tradeoff already made deliberately for
  `tools/overhead-alignment.html`'s math helpers, now applied here
  too. `scripts/lib/render-skeleton-overlay-svg.cjs` is unchanged and
  still the one `inspect-posture.cjs` uses via `require()`; only the
  browser copy moved into the page itself. Its dual-environment
  `module.exports` guard is left in place (harmless, and would still
  matter if a future browser tool were served over real HTTP rather
  than opened as a local file), but nothing currently relies on it
  working in a browser — "one source of truth" for this particular
  file did not survive contact with Safari's local-file security
  model.

  **Verification**: JS syntax checked (the page's whole inline
  `<script>` block parses as valid JavaScript, extracted and run
  through Node's `Function` constructor), HTML tag balance checked.
  The dual-environment loading claim from the first version of this
  feature was verified via Node's `vm` module with no `module` global
  defined (simulating a browser `<script>` tag) — that verification
  was real, but it could not have caught the actual bug, since the
  `vm` simulation never modeled Safari's directory-traversal
  restriction on `file://` subresource loading; it only proved the
  *file's own* code was environment-agnostic, not that the browser
  would agree to fetch it from that path. The full pipeline — a real
  `build-posture-timeline.cjs` run, and actually pressing play in
  `posture-video-player.html` — could not be tested from this sandbox
  for the same reason every other BlazePose-dependent script in this
  package couldn't (no network access to `tfhub.dev`); needs a real
  run on the Mac, including confirming the page now opens in Safari.

  **Real test, real result:** a correctly-paired video/JSON test
  against Tommaso's own footage (`IMG_1219.MOV`, a full-body frontal
  view) confirmed the overlay is now correctly aligned — shoulders on
  shoulders, hips on hips, face points on the face. Two follow-up
  requests came directly from that real test, both added: (1)
  **feet** — BlazePose's full 33-point model already reports
  `left_heel`/`right_heel`/`left_foot_index`/`right_foot_index` (real
  confidence scores above 0.9 in this footage), but `SKELETON_CONNECTIONS`
  stopped at the ankles, matching ghiggo's own `CONN` array (which
  never drew feet either). Added ankle–heel–foot_index connections for
  both feet, in both `scripts/lib/render-skeleton-overlay-svg.cjs` and
  the inline copy — a real, requested extension beyond the ported
  reference, documented as such. (2) **manual point correction** —
  every rendered keypoint dot is now draggable (Pointer Events API):
  dragging updates that keypoint's pixel position for the current
  frame, marks it `manuallyCorrected` (drawn amber instead of blue),
  sets its confidence to 1, and immediately recomputes and redraws that
  frame's six posture metrics from the corrected position. A
  "Ripristina fotogramma" button restores the frame's originally
  detected keypoints (backed up on first edit). This exists because
  `DEFAULT_POSTURE_METRICS`' ranges are explicitly unvalidated (see
  `posture-analysis/` above) — a coach needs to distinguish "BlazePose
  got this wrong" from "the metric threshold itself is wrong" by
  correcting a point and watching the number change, not just eyeball
  a static overlay.

  Recomputing metrics client-side needed `analyzePosture()`
  (`src/posture-analysis/analyze.ts`), its `metrics.ts` constants, and
  three `biomechanics/geometry.ts` primitives duplicated into the
  page's inline script — the same reason the SVG renderer already is
  duplicated there (no build step, cannot `import`/`require()`).
  **Verification**: this duplication was checked for faithfulness, not
  just syntax — the inline script's `analyzePosture()` was extracted
  via Node's `vm` module and run against every 5th frame (86 of 428) of
  the real `IMG_1219_timeline.json`, comparing every metric's value and
  status against the actual compiled `analyzePosture()` from
  `dist-test/src`: zero mismatches. Also confirmed directly against
  that same real timeline that the new foot connections render
  (`left_heel`/`right_foot_index` circles present in the generated
  SVG). `tsc -p tsconfig.test.json` clean, all 66 tests still pass.

  **Per-archer threshold calibration.** Direct follow-up request:
  "ogni persona ha una fisionomia diversa... non è corretto fissare
  delle metriche che corrispondano a tutti i corpi" — `DEFAULT_POSTURE_METRICS`
  was already documented as an unvalidated starting point (see
  `posture-analysis/` above), but the player only let you SEE that gap,
  not do anything about it. A new "Soglie" panel makes all six metrics'
  `idealRangeDegrees`/`warnRangeDegrees` directly editable, with a
  "Cattura come ideale" button that mirrors ghiggo's own "Cattura"
  feature exactly — ±3° ideal / ±12° warn around the CURRENTLY
  DISPLAYED frame's real values, skipping any metric with no value in
  that frame — rather than inventing a different capture convention of
  its own. "Ripristina soglie default" reverts to the shipped
  defaults. Export/import as JSON (same pattern as
  `tools/overhead-alignment.html`) lets a coach keep one calibration
  file per archer across sessions; import merges by metric `id` so an
  older export missing a metric cannot blank it out. `renderCurrentFrame()`
  now recomputes `analyzePosture()` fresh every render against the live
  `customMetricDefinitions`, rather than reading the ranges baked into
  the JSON by `build-posture-timeline.cjs` at generation time (which
  would otherwise go stale the moment a threshold is edited in the
  browser). **Verified**: extracted the inline calibration logic via
  Node's `vm` module and confirmed, against a real frame from
  `IMG_1219_timeline.json`, that a frame with two metrics reading
  "warning" under the defaults reclassifies as "ok" for all six
  metrics immediately after "Cattura come ideale" on that same frame —
  the capture mechanism does what it claims, not just "runs without
  throwing". `tsc -p tsconfig.test.json` clean, all 66 tests still
  pass, HTML tag balance checked.

  **Stopped drawing unconnected keypoints.** A real screenshot showed a
  cluster of dots floating in background foliage, disconnected from
  the archer — BlazePose's fine facial sub-landmarks
  (`eye_inner`/`eye`/`eye_outer`/`mouth_left`/`mouth_right`) and finger
  detail (`pinky`/`index`/`thumb`) were drawn as soon as they cleared
  the confidence threshold, whether or not they were part of the
  skeleton `SKELETON_CONNECTIONS` actually draws. Fixed by deriving
  `CONNECTED_KEYPOINT_NAMES` from `SKELETON_CONNECTIONS` itself and
  only drawing a dot for a keypoint that appears in at least one
  connection — self-maintaining if the connections list changes,
  rather than a second hardcoded list to keep in sync. Applied to both
  `scripts/lib/render-skeleton-overlay-svg.cjs` and the inline copy.
  Verified against a real frame: the excluded names no longer appear
  in the generated SVG, the skeleton's actual joints still do.

  **Seventh metric: footStanceAngle.** Direct request to measure the
  feet's "opening" angle relative to the pelvis. Computed as the angle
  between the feet line (`left_heel`↔`right_heel` — heels, per direct
  request, not ankles or toes) and the hip line (`left_hip`↔`right_hip`),
  via `angleBetweenLinesDegrees()` (already existed for
  `manual-annotation/`'s forearm-vs-arrow check below — these two lines
  don't share a vertex either, so no new geometry primitive was
  needed). Unlike the six metrics ported from ghiggo's tool, this one
  has no default `idealRangeDegrees`/`warnRangeDegrees`: there is no
  reference-tool value to copy, and this package does not invent
  numeric thresholds without a real source (see CLAUDE.md).
  `evaluatePostureMetric()` now returns `null` — "not yet
  classifiable", distinct from `"outOfRange"` — when a definition's
  ranges are `null`; `PostureMetricResult.status` can therefore be
  `null` even when `valueDegrees` is a real number, a case that didn't
  exist before this change. `posture-video-player.html`'s "Soglie"
  panel renders a `null` range as an empty, `n/d`-placeholder input
  rather than crashing on `[...null]`, and the metrics table shows
  "non calibrato" in neutral gray instead of a misleading status —
  "Cattura come ideale" (already built for the other six, see above)
  doubles as the way to assign this metric its first real range, no
  separate UI needed. **Verified**: `tsc -p tsconfig.test.json` clean,
  all 69 tests pass (new footStanceAngle cases: a parallel feet/hip
  line giving 0°, a 45°-rotated case, a missing-heel case giving
  `null`, and `evaluatePostureMetric()` returning `null` for a
  ranges-less definition). The inline `posture-video-player.html` copy
  was checked for faithfulness the same way earlier duplications in
  this file were: extracted via Node's `vm` module and run against a
  synthetic frame with heel keypoints, matching the compiled
  `analyzePosture()` from `dist-test/src` exactly (45.00000000000001°,
  `status: null`, for both). HTML tag balance checked.

  **Overall score gauge.** Direct request: a single at-a-glance number
  for "how correct is this position", shown as a circular gauge below
  the metrics table in `posture-video-player.html`, updating live every
  frame. Two new pure functions in `posture-analysis/metrics.ts`:
  `computeMetricScorePercent(valueDegrees, definition)` — a continuous
  0-100 score per metric (100 inside `idealRangeDegrees`, falling off
  linearly to 50 at the `warnRangeDegrees` edge on whichever side the
  value landed, then continuing that same slope to 0 one more
  warn-band-width further out, rather than a sharp cliff to 0 right at
  the warn boundary) — and `computePostureScorePercent(results,
  definitions)`, the plain average of that score across every metric
  that is actually scorable in the current frame. "Scorable" excludes,
  rather than scores as 0, a metric whose value is `null` (a required
  keypoint was missing/low-confidence) or whose definition has no
  configured ranges yet (`footStanceAngle` before its first
  calibration, see above) — an undetected leg in a close-up frame
  should not be indistinguishable from an actually bad position.
  Returns `null` (rendered as gray "n/d", not a misleading 0%) when
  nothing is scorable at all. This scoring curve is explicitly a UI
  presentation choice for the gauge, not a coaching threshold — unlike
  `DEFAULT_POSTURE_METRICS`' ranges, there is no reference
  implementation to port a "correct" curve shape from, so the gauge is
  documented (in the page's own on-screen caption) as a rough
  indicator, not a validated score. `posture-video-player.html` carries
  its own duplicate of both functions plus a small `renderScoreGaugeSvg()`
  (a two-circle SVG donut — a gray background ring, a color-coded arc
  sized by `stroke-dasharray`/`stroke-dashoffset`, green/orange/red at
  the same ≥80/≥50/<50 thresholds the metrics table's status colors
  use) — same duplication tradeoff as the rest of this page's inline
  script. **Verified**: 10 new unit tests (`computeMetricScorePercent`'s
  falloff at several hand-computed points on both a one-sided range
  — `shoulderLevel` — and a range whose warn band sits below ideal —
  `bowArmElbow` — plus a definition with no warn band on one side;
  `computePostureScorePercent`'s exclusion rules and `null` case), all
  79 tests pass. The inline copy was checked the same way as
  `analyzePosture()` above: extracted via Node's `vm` module and run
  against the same test points, matching the compiled functions from
  `dist-test/src` exactly, including the full aggregate score for a
  synthetic 7-keypoint frame (83.33333333333333% both sides). Manually
  exercised in a real browser tab (`file://`, via injected synthetic
  frames rather than a real video/JSON pair) to confirm all four gauge
  states render with the right color: green 100% (ideal), orange 75%
  (partway into the warn band), red 25% (past the warn edge), and gray
  "n/d" (no scorable metric in the frame). HTML tag balance checked.

  **In-browser automatic processing.** Direct request: the player used
  to require a separate, terminal-first step
  (`scripts/build-posture-timeline.cjs`, a Node script using ffmpeg +
  BlazePose) before it had anything to display. The two file inputs
  ("Video" + "Dati (JSON)") are replaced by one ("Video o immagine"):
  pick a video or a single photo and BlazePose runs directly in the
  browser tab, no separate script run needed. This is the first real
  implementation of the client-side pose estimation direction
  `docs/architecture/AWI_WEB_INTERFACE.md` (APL-ARC-004, still Draft)
  recorded on 2026-08-02 for the future `apps/web`, scoped down to this
  one existing standalone tool rather than the full planned app. A real
  new tradeoff, deliberately made rather than defaulted into: the
  uploaded file itself still never leaves the machine (read, processed
  and discarded locally, same as before), but TensorFlow.js and the
  BlazePose model weights are now fetched over the network — a CDN
  (`cdn.jsdelivr.net`, pinned to the exact `@tensorflow/tfjs@4.22.0`/
  `@tensorflow-models/pose-detection@2.1.3` versions this package
  already depends on in Node) for the libraries, `tfhub.dev` for the
  model, the same source the Node scripts already download from on
  first use — a page that previously needed zero network access at
  all. Confirmed working in a real browser tab before writing this
  into the page: both CDN bundles load and expose the expected
  `tf`/`poseDetection` globals despite the minified `pose-detection`
  bundle's UMD wrapper referencing additional globals
  (`@mediapipe/pose`, a WebGPU backend) this page never loads — they
  turned out to only be accessed lazily, not at load time, so omitting
  them is safe. Backend is WebGL, not the WASM backend
  `pose-estimation/detector.ts` uses in Node — that choice was
  specifically about a Node-only gap (`@tensorflow/tfjs-node`'s native
  backend missing kernels BlazePose needs), which does not apply in a
  real browser, where WebGL is TensorFlow.js's standard, GPU-
  accelerated, fully-supported backend for BlazePose; confirmed by a
  real detector creation + `estimatePoses()` call in a browser tab
  returning backend `"webgl"` with no explicit setup, run successfully
  against a canvas, an `<img>`, and (in the full feature) an actual
  `<video>` element directly — the browser API accepts all three as
  input, so this needed no manual pixel-tensor decoding of its own,
  unlike the Node path.

  A photo is a single `estimatePoses()` call. A video is sampled at a
  configurable "Fotogrammi/sec" (default 5, an editable number input)
  by seeking the `<video>` element to each target timestamp, awaiting
  its real `seeked` event (with a same-time-already fast path, since
  some browsers never fire `seeked` when the requested time equals the
  current one), and running `estimatePoses()` against that exact
  frame — the same accurate-seeking principle
  `frame-extraction/extractor.ts`'s ffmpeg pipeline follows, adapted to
  the browser's own APIs instead of a spawned binary. A status line
  reports progress per frame; a video producing more than 300 frames
  (a real number picked from this same architecture doc's own
  unresolved "performance on longer videos" concern, not invented
  fresh) prompts for confirmation before starting, since in-browser
  BlazePose with no compiled binary or server GPU can plausibly take
  minutes; a visible "Annulla elaborazione" button can stop a run
  already in progress. Loading a single photo hides/disables the
  video-only playback controls (Play, Frame ◀/▶) rather than leaving
  them present but meaningless for a one-frame timeline; manual point
  correction and "Cattura come ideale" work identically for a photo as
  for a video frame, since both ultimately just edit
  `timeline.frames[currentFrameIndex]`.

  A new "Lato di rilascio" (draw side) dropdown replaces what used to
  be baked into the pre-computed JSON by `build-posture-timeline.cjs`'s
  own CLI argument — `analyzePosture()` needs to know which arm is the
  bow arm, and there is no longer a JSON file to carry that choice in.

  **Verified real, not just assumed**: exercised in real browser tabs
  (not just read-and-reasoned-about) — a real synthetic image (drawn on
  a `<canvas>`, exported via `toBlob()`) through the full
  `processImageFile()` path produced a correct one-frame timeline with
  the right dimensions and UI state (playback controls disabled,
  "Cattura come ideale" enabled); a real synthetic video (recorded from
  an animated `<canvas>` via `MediaRecorder`, actually decodable —
  `video.duration`/`videoWidth`/`videoHeight` all resolved correctly,
  a real point noted here because MediaRecorder-produced files are a
  known source of unreliable `duration` metadata in some browsers)
  through the full `processVideoFile()` path produced a correct
  multi-frame timeline at the requested sampling rate, and "Frame
  ▶"/"◀" correctly stepped through it. An unsupported file type (a
  `.txt` file) was confirmed to produce a clear error message rather
  than a silent failure or a crash. All of this was run in a freshly
  reloaded, isolated browser tab specifically to rule out
  cross-contamination from unrelated manual testing happening in
  another tab during the same session. HTML tag balance checked, and
  the inline script confirmed to parse as valid JavaScript.

  **What that verification did NOT catch, and how it was found**:
  the synthetic image/video used above were plain generated shapes,
  not a real photo of a person — BlazePose correctly reported "no pose
  found" (`posesLength: 0`) for them, which exercises the whole
  pipeline's plumbing (file handling, frame extraction, timeline
  building, UI state) but cannot exercise whether real landmark output
  is actually correct, since there is no real body for the model to
  find. That gap surfaced the moment a real video was tried: the user
  loaded their own archery footage and saw plain video playback with
  no skeleton at all. Diagnosed against that real video rather than
  guessed at — every processed frame turned out to produce a
  structurally valid pose (`posesLength: 1`) whose every keypoint AND
  top-level score were `null`, reproduced identically on both the
  WebGL and CPU backends and identically against both the raw
  `<video>` element and a `<canvas>` snapshot of the same frame,
  narrowing the cause to `modelType: "full"`'s model graph itself in
  this exact CDN-loaded library version combination, not this page's
  integration code. `"lite"` and `"heavy"` were both confirmed against
  that same real frame to return real coordinates and confidence
  scores (0.999+); the page now uses `"heavy"` (see
  `ensurePoseDetector()`'s own doc comment for the full reasoning and
  measured per-frame timing). Recorded here deliberately, not smoothed
  over: the "Verified real, not just assumed" testing above was real,
  but "real" synthetic input still was not enough on its own — this
  bug was only catchable against genuine footage of an actual person,
  which is exactly the kind of gap this package's own established
  practice (see `hand-tension/`'s negative result, and the several
  "found once tested on real Mac footage" bugs earlier in this same
  section) keeps surfacing, and keeps documenting rather than hiding.

  **A second real bug, found on the very next real test.** With
  `"heavy"` in place, the user processed a second video in the same tab
  session and hit the identical symptom — plain video playback, no
  skeleton — despite the fix above already being live. Direct A/B
  testing against the same real frame pinned it down: the page's
  memoized detector (one `ensurePoseDetector()` created per page load,
  reused for every file processed in that session — the original,
  deliberate design, see its own now-superseded doc comment) reliably
  returned NaN, while a brand-new `createDetector()` call immediately
  afterward, against that identical frame, reliably returned real
  coordinates — repeated with consistent results in both directions.
  The exact mechanism was not pinned down (varying `modelType`,
  backend, `tf.ready()` timing, and video-vs-canvas input all failed to
  reproduce it once isolated from a previously-memoized instance), but
  "was this detector reused from an earlier file" was the one reliable
  factor separating every failure from every success. Fixed by no
  longer memoizing a detector across files at all —
  `createFreshPoseDetector()` creates a new one per file (still reused
  across that one file's own frames, confirmed safe over repeated
  calls against a non-degenerate instance) — plus a new
  `isDegeneratePoseFrame()` check after every estimate (NaN on the
  first keypoint despite a non-empty array; a real "nothing detected"
  frame comes back with an empty array instead, so this cannot
  false-positive on genuine low confidence) that retries once with
  another fresh detector before surfacing a clear error, instead of
  silently completing with a "Completato" status over data that was
  actually all garbage — the exact misleading outcome hit both times.

  **The actual root cause, found on a third occurrence.** The fix
  above reduced but did not eliminate the bug — the next real video
  still failed, even after a full page reload. This time the cause was
  confirmed with a direct measurement, not narrowed down by
  correlation: `tf.memory()` showed 26,268 live tensors and ~2.94GB of
  GPU memory allocated in a tab that had, over one extended debugging
  session, created roughly twenty `PoseDetector` instances — none ever
  disposed. Each instance holds its own copy of BlazePose's model
  weights as WebGL textures; `PoseDetector.dispose()` (a real method
  this library exposes) is required to free them, and nothing does
  this automatically. With that much leaked GPU memory present, the
  exact same code against the exact same real frame was directly
  observed to non-deterministically succeed or fail from one call to
  the next — confirmed by disposing one detector and watching the live
  tensor count actually drop. This also explains the earlier,
  seemingly solid "fresh detector recovers, reused one doesn't"
  pattern: early in a debugging session a genuinely fresh detector has
  little leaked memory competing with it; once enough had accumulated,
  a brand-new detector failed just as often as a reused one —
  freshness was a real, reproducible correlation at the time it was
  observed, not the actual mechanism. Fixed by disposing every
  detector this page creates as soon as it is done with it (in both
  `processImageFile()` and `processVideoFile()`, including the retry
  path). Verified with a real stress test: 8 consecutive
  create→estimate→dispose cycles all showed `tf.memory().numTensors`
  returning to exactly 0 after each dispose, no growth across repeated
  cycles — the leak is gone. The retry-then-degrade-gracefully
  mechanism from the previous fix is kept, not removed, as a second,
  independent line of defense in case some other cause ever produces
  the same NaN signature again.

  **The FOURTH occurrence, and the actual final answer.** With GPU
  memory confirmed clean, the same real video still failed on every
  single frame. Final, clean, deterministic isolation: the SAME
  detector instance, at the SAME moment, given a `<canvas>` snapshot of
  a frame returned real coordinates (0.999+ confidence) every time, and
  given the live `<video>` element directly for that IDENTICAL frame
  returned NaN every time — nothing else varied between the two calls
  (no memory pressure difference, no cross-file state, same detector
  object). Passing a live DOM media element directly to
  `estimatePoses()`, instead of a `<canvas>` snapshot of it, is
  unreliable in this exact library/browser combination: a `<canvas>`
  `drawImage()` snapshot forces a synchronous, fully-materialized
  bitmap before any WebGL texture upload, while reading directly from a
  `<video>` element depends on whatever this library version does
  internally to pull pixels from it, which evidently is not reliable.
  Fixed in `processVideoFile()` by drawing each frame to a reusable
  canvas (`frameCanvas`) before calling
  `estimatePoseFrameFromMediaElement()`, never passing the live
  `<video>` element to it directly.

  **A fifth occurrence — the same bug, but silent this time.** The
  video fix above didn't touch `processImageFile()`, which still passed
  the live `<img>` element directly. A real photo (3213x5712) surfaced
  the same underlying issue there too, but in a more dangerous form:
  not NaN, but a confidently WRONG position — `posesLength: 1`,
  confidence 0.998, coordinates placing the skeleton in the top-left of
  the frame while the archer stood centered in it. Reproduced
  byte-for-byte identical across several fresh detectors called through
  the real `processImageFile()` path. Diagnosed the same way as the
  `<video>` case: a `<canvas>` snapshot of that exact photo reliably
  returned the visually correct position (confirmed against the actual
  photo, not assumed) across 6 repeated calls, while the live `<img>`
  element for that identical photo reliably returned the same wrong
  position every time. This is a strictly worse failure mode than NaN:
  `isDegeneratePoseFrame()`'s check cannot catch a wrong-but-plausible
  result, so without a human actually looking at the overlay this would
  have shipped silently. Fixed the same way: `processImageFile()` now
  draws to a canvas (`imageCanvas`) before calling
  `estimatePoseFrameFromMediaElement()`. This page no longer passes a
  live `<video>` or `<img>` element to `estimatePoses()` anywhere —
  only `<canvas>` snapshots, confirmed the only reliable input across
  both the video and image code paths.

  **A sixth occurrence — not a detection bug this time, a display
  one.** Once a real photo was actually analyzed correctly, a direct
  report followed: the overlay's lines, dots, and labels were all much
  smaller/thinner than they looked on a video. Root cause: line
  thickness, dot radius, and font sizes in `renderSkeletonOverlaySvg()`
  are fixed pixel values in the SVG's own viewBox space, which equals
  the source media's native resolution — not its on-screen CSS display
  size. A typical video frame (~1080px wide, close to what these sizes
  were originally tuned against) and a much higher-resolution photo
  (3213px wide) both get squeezed into the exact same CSS display box,
  so the photo's fixed-size overlay elements shrink roughly 3x further.
  Fixed by scaling every visual size (line stroke-width, dot
  radius/stroke-width, label font-size, and the corresponding sizes in
  `angleLabelMarkup()`/`zoneBoxMarkup()`) by `widthPixels` relative to
  a 1080px reference, floored at 1 so a lower-resolution source never
  renders thinner than today's already-correct video appearance —
  verified directly (1080px: unchanged at stroke 2.0/dot radius 6.0;
  400px: floored to the same values; 3213px: both scale to ~2.97x).
  Kept in sync between `scripts/lib/render-skeleton-overlay-svg.cjs`
  and the inline copy.

- `tools/posture-video-player.html`: a "Mostra nomi punti" checkbox
  (off by default) draws each confident keypoint's raw BlazePose name
  (e.g. `left_ear`) next to its dot — white text with a black stroke
  outline (`paint-order="stroke fill"`) for legibility over any photo
  background. Direct request, to help a coach tell which dot is which
  when investigating an odd-looking overlay — e.g. face lines that
  visually cross on a profile-view photo, which turned out to be
  BlazePose confidently estimating a position for the ear
  self-occluded behind the turned head, a real model limitation rather
  than a bug in this page (checked against the real keypoint
  coordinates and confidence scores for that exact frame, not
  assumed). Redraws the current frame only on toggle, no reprocessing. Kept in
  sync between `scripts/lib/render-skeleton-overlay-svg.cjs` (a
  `showLabels` option, default `false`, so existing Node-script
  behavior is unaffected) and the player's own inline copy.

- `manual-annotation/` — for a real, still-open check this package
  cannot do automatically: Filippo Clini's manual has a coaching check
  (bow hand / draw elbow / head forming a triangle, plus a
  forearm-to-arrow alignment line) that needs a camera positioned
  directly above the archer, an angle BlazePose's real-world detection
  accuracy has never been checked against (see `posture-analysis/`
  above and ROADMAP.md). Rather than guess whether pose estimation
  would even work from that angle, `manual-annotation/` sidesteps the
  question: a human places the points themselves, on a still photo,
  exactly how the manual's own reference photos were annotated by
  hand — no video, no BlazePose, no camera-angle assumption at all.

  `computeAnnotatedAngles(points: AnnotatedPoint[], requests:
  AnnotatedAngleRequest[])` takes named points (`{ name, xPixels,
  yPixels }` — no confidence score; a human either placed a point or
  didn't) and a list of named requests (`angleAtJoint`,
  `angleFromHorizontal`, `tiltFromVertical`, `angleBetweenLines`,
  `distance`), matched by point name rather than by a fixed role —
  deliberately generic, not hardcoded to the manual's one specific
  triangle, since a coach may want different points/checks depending
  on what a given photo shows. Delegates to the exact same,
  already-tested `biomechanics/` primitives BlazePose keypoints go
  through (a manually-placed point becomes a `PoseKeypoint` with
  `confidenceScore: 1`) — no new geometry was written for this,
  except `angleBetweenLinesDegrees()` (angle between two arbitrary
  line segments that do NOT share a vertex, needed for the
  forearm-vs-arrow-line check, since those two lines don't meet at a
  common point the way an elbow's rays do). A request referencing a
  missing point name, or one where two required points coincide,
  produces a result with `error` set instead of throwing — one
  mistyped name (a real risk with free-text names from an interactive
  tool) should not discard every other result in the batch.

  `tools/overhead-alignment.html` is the actual point-placing UI: a
  single, dependency-free HTML file (upload an image, click to place
  and name points, build angle/distance requests from dropdowns of
  the points placed so far, see a live-computed preview, export
  everything as JSON) — opens directly in a browser, no server, no
  build step, and no image ever leaves the machine (plain
  `FileReader`/`<canvas>`, no upload). Its live preview duplicates
  the same geometry formulas by hand, in plain JS (documented in the
  file itself, and verified — see "Verification" below — to produce
  identical results to the real TypeScript primitives on the same
  test cases) since a static HTML file with no build step cannot
  `import` from this TypeScript package directly. That preview is
  convenience only, not the authoritative answer:

  ```
  cd packages/domains/video-analysis
  npx tsc -p tsconfig.test.json
  node scripts/compute-annotated-angles.cjs path/to/overhead-alignment-*.json
  ```

  `scripts/compute-annotated-angles.cjs` reads that exported JSON and
  calls the real, tested `computeAnnotatedAngles()` — this is "the
  script [that] limits itself to calculating the angles and returns
  the data" in the literal sense the feature was requested in: a
  clean separation between the interactive point-placing UI and the
  actual computation, with the computation running through the same
  tested code path as everything else in this package rather than
  trusting the HTML page's own hand-copied math for anything that
  matters.

  `tools/overhead-alignment-video-player.html` is the same idea as a
  **player** instead of a single photo: step through a real
  overhead-framed video and annotate points per frame, so a coach can
  compare pretrazione/trazione alignment within one real shot instead
  of one hand-picked still. Direct request, after checking Clini's
  manual text directly (not guessed at): the manual's own alignment
  checks are the forearm-arrow line, checked "sia se osserviamo
  l'atleta frontalmente, sia nella vista dall'alto" — needing more
  than one photo to actually compare. No BlazePose/TensorFlow
  dependency at all, unlike `posture-video-player.html` — this tool
  never runs pose estimation, for the same reason `manual-annotation/`
  exists in the first place. Points are stored **per frame**
  (`{ timestampMs, points }`, matched on lookup within a small
  tolerance rather than an exact key, since repeated `<video>` seeks
  to "the same" requested time don't always land on the identical
  millisecond); requests stay **global** across every frame, so a
  coach reusing the same point names (e.g. `gomito_corda`,
  `mano_arco`) gets the same computed check automatically on every
  annotated frame. A "Copia punti dal fotogramma precedente" button
  copies the nearest earlier frame's points as a starting point to
  drag/re-click-correct — explicit and opt-in, never automatic, so a
  coach always knows whether a given frame's points are fresh or
  copied. Exports as `{ requests, framesByTimestampMs, videoFileName,
  ... }` (never the video itself); `scripts/compute-annotated-angles.cjs`
  now reads both this shape and the original single-image one,
  telling them apart by which of `points`/`framesByTimestampMs` the
  file actually has, and prints one authoritative result block per
  annotated frame for the video case. Verified for real: loaded a
  real overhead-framed video, stepped frames, placed points on a real
  frame, confirmed the drawn markers land at the exact requested pixel
  coordinates (read back via `getImageData`, not just eyeballed — at
  this video's native 2160x3840 resolution a 5px marker is close to
  invisible on screen at the page's own display scale), computed a
  real `angleAtJoint` result matching between the live preview and
  `compute-annotated-angles.cjs`'s authoritative path, and round-tripped
  export/import. What this verification does **not** cover: whether
  the alignment *numbers* this tool would report on a real pre-draw
  vs. draw comparison actually match what the manual describes as
  correct/incorrect — that needs a coach's own judgment on real
  footage, the same as every other calibration step in this package.

  **Verification**: `angleBetweenLinesDegrees()` and
  `computeAnnotatedAngles()` are fully unit tested. The HTML tool's
  vendored math was checked node-side against the same known-angle
  test cases used in the real unit tests and produced identical
  results; the interactive UI itself (clicking, dragging, the actual
  browser rendering) could not be tested from this sandbox (no
  browser available) — worth a real click-through before trusting it
  blindly, same spirit as this package's other not-yet-Mac-verified
  scripts.
