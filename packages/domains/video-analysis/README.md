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
module (six real-time postural checks — shoulder/hip level, both elbow
angles, head tilt, torso verticality — plus a skeleton-overlay
renderer for viewing them on a single video frame, both computed from
BlazePose keypoints), and a `manual-annotation/` module (the same kind
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

- `posture-analysis/` — six postural checks computed from a single
  `PoseFrame`: shoulder level, hip level, bow-arm elbow angle,
  draw-arm elbow angle, head tilt, torso verticality.
  `analyzePosture(frame, drawSide, metricDefinitions?)` returns one
  result per metric (`valueDegrees`, `status: "ok" | "warning" |
  "outOfRange"`), `null` for both when a metric's required keypoints
  are missing or below confidence — a real "cannot tell", not a
  misleading 0°. Two new pure `biomechanics/` primitives back this:
  `angleFromHorizontalDegrees()` (how far a line deviates from level —
  shoulders, hips, ears) and `tiltFromVerticalDegrees()` (how far a
  line deviates from plumb — torso).

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
  not matter), computes the six metrics, and writes one `.html` file
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
  PNG for a visual sanity check. The full pipeline against a *real*
  video could only be partially verified from this dev sandbox: ffmpeg
  metadata-reading worked once pointed at the sandbox's own
  ffmpeg/ffprobe (the bundled `ffmpeg-static`/`ffprobe-static`
  binaries in this mounted checkout are macOS binaries, installed on
  the Mac this repo normally runs on — a pre-existing, already
  documented sandbox limitation, not new), but real BlazePose
  detection could not run at all: it needs to download model weights
  from `tfhub.dev` on first use, and that host is not reachable from
  this sandbox (same limitation `verify-pose-detector.cjs` already
  documents). Run the command above on the real Mac to get the actual
  first real-video verification.

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

  **Verification**: `angleBetweenLinesDegrees()` and
  `computeAnnotatedAngles()` are fully unit tested. The HTML tool's
  vendored math was checked node-side against the same known-angle
  test cases used in the real unit tests and produced identical
  results; the interactive UI itself (clicking, dragging, the actual
  browser rendering) could not be tested from this sandbox (no
  browser available) — worth a real click-through before trusting it
  blindly, same spirit as this package's other not-yet-Mac-verified
  scripts.
