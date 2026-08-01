import { findKeypoint, distanceBetweenKeypoints, keypointVelocityPixelsPerSecond } from "../biomechanics";
import type { PoseFrame, ShootingPhase, ShootingPhaseSegment } from "../types";

/**
 * First-pass, provisional phase detector.
 *
 * Status: a real prototype, not a finished detector. It was written
 * against ONE calibration video (see
 * scripts/build-calibration-dataset.cjs and the signals it produced
 * in ~/Development/apl-video-calibration/signals/) — enough to derive
 * defensible starting numbers, not enough to trust them. The intended
 * workflow (per project discussion) is: run this against more real
 * footage, have a coach confirm whether the detected segments match
 * what actually happened in each video, and tighten the thresholds
 * below from that feedback — not treat this file as settled.
 *
 * Only Anchor, Release and FollowThrough are detected. Stance,
 * PreDraw, Drawing, Aiming and Expansion are deliberately NOT
 * detected yet:
 *
 * - Stance / PreDraw: no signal has been explored for these yet (they
 *   happen before any real string-hand motion toward the face, so the
 *   wrist-to-face distance and velocity signals used below say
 *   nothing about them). Would likely need a bow-arm elevation angle
 *   signal instead.
 * - Drawing: partially inferrable (distance should be decreasing) but
 *   not yet implemented — see "Next steps" in README.md.
 * - Aiming vs. Expansion: both happen while the wrist is already near
 *   the face, so they are indistinguishable from the wrist-to-face
 *   distance and velocity signals alone (the coach described
 *   Expansion as driven by scapula rotation, not wrist movement,
 *   which these signals do not capture at all). What this detector
 *   calls "Anchor" below actually spans real Anchor + Aiming +
 *   Expansion together, from first settling near the face to Release.
 *
 * Signal used: the draw-side wrist's distance to a face keypoint
 * (mouth on the draw side, the closest built-in BlazePose landmark to
 * the true chin/jaw contact point — see biomechanics/), and its
 * velocity, both from biomechanics/. Both are normalized by the
 * archer's own shoulder width in the same frame, since raw pixel
 * values are not comparable across videos at different resolutions or
 * camera distances (see build-calibration-dataset.cjs for the same
 * reasoning applied during calibration).
 */
export interface PhaseDetectionOptions {
    /**
     * Which wrist draws the string — "right" for a right-handed
     * archer. BlazePose's own "left_"/"right_" keypoint prefixes
     * follow the pictured person's own anatomical sides, so this does
     * not depend on camera placement, only on which hand actually
     * draws.
     */
    drawSide: "left" | "right";

    /**
     * How close (in shoulder widths) the draw-side wrist must be to
     * the face keypoint to count as "at anchor". 0.4 was chosen
     * because the one calibration video analyzed so far settled at
     * roughly 0.36 shoulder-widths during its hold — this is a
     * starting point, not a validated constant.
     */
    anchorDistanceThresholdShoulderWidths?: number;

    /**
     * The normalized velocity (shoulder-widths/second) a frame must
     * reach to be considered the *start* of a Release. 1.5 is the
     * value the calibration video's velocity first crossed as its
     * Release ramp began.
     */
    releaseVelocityThresholdShoulderWidthsPerSecond?: number;

    /**
     * The (lower) normalized velocity a run of frames must stay above
     * to count as "sustained" — distinguishing a real Release ramp
     * from a single noisy frame. 1.0 is below every value observed
     * during the calibration video's actual Release ramp.
     */
    releaseSustainedVelocityThresholdShoulderWidthsPerSecond?: number;

    /**
     * How many consecutive frames must stay above the sustained
     * threshold for a velocity rise to count as Release rather than
     * noise. The calibration video's Release ramp held for about 7
     * consecutive frames; 4 is set conservatively below that.
     */
    releaseSustainedFrameCount?: number;
}

interface FrameSignal {
    timestampMilliseconds: number;
    distanceToFaceShoulderWidths: number | null;
    velocityShoulderWidthsPerSecond: number | null;
}

const DEFAULT_ANCHOR_DISTANCE_THRESHOLD_SHOULDER_WIDTHS = 0.4;
const DEFAULT_RELEASE_VELOCITY_THRESHOLD_SHOULDER_WIDTHS_PER_SECOND = 1.5;
const DEFAULT_RELEASE_SUSTAINED_VELOCITY_THRESHOLD_SHOULDER_WIDTHS_PER_SECOND = 1.0;
const DEFAULT_RELEASE_SUSTAINED_FRAME_COUNT = 4;

function computeFrameSignals(
    poseFrames: PoseFrame[],
    drawSide: "left" | "right"
): FrameSignal[] {
    const wristKeypointName = `${drawSide}_wrist`;
    const faceProxyKeypointName = `mouth_${drawSide}`;

    const signals: FrameSignal[] = [];
    let previousWristKeypoint: ReturnType<typeof findKeypoint> = undefined;
    let previousTimestampMilliseconds: number | null = null;

    for (const poseFrame of poseFrames) {
        const wristKeypoint = findKeypoint(poseFrame, wristKeypointName);
        const faceProxyKeypoint = findKeypoint(poseFrame, faceProxyKeypointName);
        const leftShoulder = findKeypoint(poseFrame, "left_shoulder");
        const rightShoulder = findKeypoint(poseFrame, "right_shoulder");

        const shoulderWidthPixels =
            leftShoulder && rightShoulder
                ? distanceBetweenKeypoints(leftShoulder, rightShoulder)
                : null;

        let distanceToFaceShoulderWidths: number | null = null;
        if (wristKeypoint && faceProxyKeypoint && shoulderWidthPixels) {
            distanceToFaceShoulderWidths =
                distanceBetweenKeypoints(wristKeypoint, faceProxyKeypoint) / shoulderWidthPixels;
        }

        let velocityShoulderWidthsPerSecond: number | null = null;
        if (
            wristKeypoint &&
            previousWristKeypoint &&
            previousTimestampMilliseconds !== null &&
            shoulderWidthPixels
        ) {
            velocityShoulderWidthsPerSecond =
                keypointVelocityPixelsPerSecond(
                    previousWristKeypoint,
                    previousTimestampMilliseconds,
                    wristKeypoint,
                    poseFrame.timestampMilliseconds
                ) / shoulderWidthPixels;
        }

        signals.push({
            timestampMilliseconds: poseFrame.timestampMilliseconds,
            distanceToFaceShoulderWidths,
            velocityShoulderWidthsPerSecond
        });

        if (wristKeypoint) {
            previousWristKeypoint = wristKeypoint;
            previousTimestampMilliseconds = poseFrame.timestampMilliseconds;
        }
    }

    return signals;
}

/**
 * See the module-level doc comment above for what this does and does
 * not detect, and why. Returns segments in chronological order;
 * returns an empty array if no Release could be found (rather than
 * guessing at Anchor/FollowThrough without one, since this detector's
 * whole approach is anchored — no pun intended — on finding Release
 * first and working outward from it).
 */
export function detectShootingPhases(
    poseFrames: PoseFrame[],
    options: PhaseDetectionOptions
): ShootingPhaseSegment[] {
    const anchorDistanceThresholdShoulderWidths =
        options.anchorDistanceThresholdShoulderWidths ??
        DEFAULT_ANCHOR_DISTANCE_THRESHOLD_SHOULDER_WIDTHS;
    const releaseVelocityThreshold =
        options.releaseVelocityThresholdShoulderWidthsPerSecond ??
        DEFAULT_RELEASE_VELOCITY_THRESHOLD_SHOULDER_WIDTHS_PER_SECOND;
    const releaseSustainedVelocityThreshold =
        options.releaseSustainedVelocityThresholdShoulderWidthsPerSecond ??
        DEFAULT_RELEASE_SUSTAINED_VELOCITY_THRESHOLD_SHOULDER_WIDTHS_PER_SECOND;
    const releaseSustainedFrameCount =
        options.releaseSustainedFrameCount ?? DEFAULT_RELEASE_SUSTAINED_FRAME_COUNT;

    const signals = computeFrameSignals(poseFrames, options.drawSide);

    // Find the first frame that both crosses the Release velocity
    // threshold and is followed by a sustained run above the (lower)
    // sustained threshold — a single noisy frame above the first
    // threshold but not sustained is skipped, not treated as Release.
    let releaseStartIndex = -1;
    for (let index = 0; index < signals.length; index += 1) {
        const velocity = signals[index]?.velocityShoulderWidthsPerSecond;
        if (velocity === null || velocity === undefined || velocity < releaseVelocityThreshold) {
            continue;
        }

        let sustainedCount = 0;
        for (
            let lookaheadIndex = index;
            lookaheadIndex < signals.length && lookaheadIndex < index + releaseSustainedFrameCount + 2;
            lookaheadIndex += 1
        ) {
            const lookaheadVelocity = signals[lookaheadIndex]?.velocityShoulderWidthsPerSecond;
            if (
                lookaheadVelocity !== null &&
                lookaheadVelocity !== undefined &&
                lookaheadVelocity >= releaseSustainedVelocityThreshold
            ) {
                sustainedCount += 1;
            }
        }

        if (sustainedCount >= releaseSustainedFrameCount) {
            releaseStartIndex = index;
            break;
        }
    }

    if (releaseStartIndex === -1) {
        return [];
    }

    // Release ends once velocity drops back below the sustained
    // threshold for two consecutive frames (a single dip could just
    // be a momentary slowdown mid-ramp).
    let releaseEndIndex = signals.length - 1;
    for (let index = releaseStartIndex; index < signals.length - 1; index += 1) {
        const currentVelocity = signals[index]?.velocityShoulderWidthsPerSecond;
        const nextVelocity = signals[index + 1]?.velocityShoulderWidthsPerSecond;
        const currentBelow =
            currentVelocity !== null &&
            currentVelocity !== undefined &&
            currentVelocity < releaseSustainedVelocityThreshold;
        const nextBelow =
            nextVelocity !== null &&
            nextVelocity !== undefined &&
            nextVelocity < releaseSustainedVelocityThreshold;

        if (currentBelow && nextBelow) {
            // `index` is already the first calm frame after the ramp
            // (that's what currentBelow means) — the ramp itself
            // actually ended at the frame before it.
            releaseEndIndex = index > releaseStartIndex ? index - 1 : index;
            break;
        }
    }

    // Anchor: scanning backward from Release start, the longest
    // unbroken run of frames immediately preceding Release where the
    // wrist stayed within the anchor distance threshold. Deliberately
    // does not use the *global* minimum distance in the sequence —
    // calibration data showed a brief, non-sustained close approach
    // earlier in one video that was not actually the real anchor hold
    // leading into that shot's Release.
    let anchorStartIndex = releaseStartIndex;
    for (let index = releaseStartIndex - 1; index >= 0; index -= 1) {
        const distance = signals[index]?.distanceToFaceShoulderWidths;
        if (
            distance === null ||
            distance === undefined ||
            distance > anchorDistanceThresholdShoulderWidths
        ) {
            break;
        }
        anchorStartIndex = index;
    }

    const segments: ShootingPhaseSegment[] = [];

    if (anchorStartIndex < releaseStartIndex) {
        segments.push(
            phaseSegment("Anchor", signals, anchorStartIndex, releaseStartIndex - 1)
        );
    }

    segments.push(phaseSegment("Release", signals, releaseStartIndex, releaseEndIndex));

    if (releaseEndIndex < signals.length - 1) {
        segments.push(
            phaseSegment("FollowThrough", signals, releaseEndIndex + 1, signals.length - 1)
        );
    }

    return segments;
}

function phaseSegment(
    phase: ShootingPhase,
    signals: FrameSignal[],
    startIndex: number,
    endIndex: number
): ShootingPhaseSegment {
    return {
        phase,
        startTimeMilliseconds: signals[startIndex]?.timestampMilliseconds ?? 0,
        endTimeMilliseconds: signals[endIndex]?.timestampMilliseconds ?? 0
    };
}
