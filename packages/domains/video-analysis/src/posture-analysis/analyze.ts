import {
    findKeypoint,
    angleAtJointDegrees,
    angleFromHorizontalDegrees,
    tiltFromVerticalDegrees,
    angleBetweenLinesDegrees
} from "../biomechanics";
import type { PoseFrame, PoseKeypoint } from "../types";
import { DEFAULT_POSTURE_METRICS, evaluatePostureMetric } from "./metrics";
import type { PostureMetricDefinition, PostureMetricId, PostureMetricStatus } from "./metrics";

/**
 * Below this confidence, a keypoint is treated as "not really there"
 * for posture analysis rather than trusted at face value — ported
 * from the same reference implementation as the geometry primitives
 * (ghiggo.altervista.org/posture skips drawing/using any MediaPipe
 * landmark with `visibility < 0.5`). BlazePose's `confidenceScore`
 * and MediaPipe's `visibility` are not guaranteed to mean numerically
 * identical things, but both are a 0–1 "how much do you trust this
 * point" signal from the same underlying model family, so reusing the
 * same cutoff is a reasonable starting point, not a re-derivation.
 */
const MINIMUM_KEYPOINT_CONFIDENCE_SCORE = 0.5;

export interface PostureMetricResult {
    id: PostureMetricId;
    name: string;

    /**
     * null when one or more keypoints this metric needs were either
     * not detected at all in this frame, or detected below
     * MINIMUM_KEYPOINT_CONFIDENCE_SCORE — a real "cannot tell" result,
     * not a 0° that would misleadingly read as "perfectly aligned".
     */
    valueDegrees: number | null;

    /**
     * null when valueDegrees is null (nothing to classify), OR when
     * valueDegrees is a real number but the metric's definition has no
     * idealRangeDegrees/warnRangeDegrees configured yet (see
     * footStanceAngle in DEFAULT_POSTURE_METRICS — a real angle with
     * no default classification until a coach captures one).
     */
    status: PostureMetricStatus | null;
}

function confidentKeypoint(frame: PoseFrame, keypointName: string): PoseKeypoint | null {
    const keypoint = findKeypoint(frame, keypointName);
    if (!keypoint || keypoint.confidenceScore < MINIMUM_KEYPOINT_CONFIDENCE_SCORE) {
        return null;
    }
    return keypoint;
}

function midpointKeypoint(name: string, first: PoseKeypoint, second: PoseKeypoint): PoseKeypoint {
    return {
        name,
        xPixels: (first.xPixels + second.xPixels) / 2,
        yPixels: (first.yPixels + second.yPixels) / 2,
        confidenceScore: Math.min(first.confidenceScore, second.confidenceScore)
    };
}

/**
 * Computes the seven posture metrics from `metricDefinitions` (defaults
 * to DEFAULT_POSTURE_METRICS — see metrics.ts for why those specific
 * numbers should not be treated as validated for any real archer yet)
 * against a single PoseFrame.
 *
 * `drawSide` follows the same convention as
 * phase-detection's PhaseDetectionOptions.drawSide: "right" for a
 * right-handed archer who draws the string with their right hand —
 * which means their bow arm is the LEFT one. BlazePose's own
 * "left_"/"right_" keypoint names already follow the pictured
 * person's own anatomical sides, not the camera's left/right, so this
 * does not depend on which way the archer is facing the camera.
 *
 * Each metric is computed independently: a missing/low-confidence
 * keypoint fails only the metrics that need it (e.g. an occluded bow
 * elbow does not prevent computing headTilt), matching the reference
 * implementation's per-landmark visibility check rather than an
 * all-or-nothing "skeleton visible or not" gate.
 */
export function analyzePosture(
    frame: PoseFrame,
    drawSide: "left" | "right",
    metricDefinitions: PostureMetricDefinition[] = DEFAULT_POSTURE_METRICS
): PostureMetricResult[] {
    const bowSide = drawSide === "right" ? "left" : "right";

    const rawValuesByMetricId: Partial<Record<PostureMetricId, number>> = {};

    const leftShoulder = confidentKeypoint(frame, "left_shoulder");
    const rightShoulder = confidentKeypoint(frame, "right_shoulder");
    if (leftShoulder && rightShoulder) {
        rawValuesByMetricId.shoulderLevel = angleFromHorizontalDegrees(leftShoulder, rightShoulder);
    }

    const bowShoulder = confidentKeypoint(frame, `${bowSide}_shoulder`);
    const bowElbow = confidentKeypoint(frame, `${bowSide}_elbow`);
    const bowWrist = confidentKeypoint(frame, `${bowSide}_wrist`);
    if (bowShoulder && bowElbow && bowWrist) {
        rawValuesByMetricId.bowArmElbow = angleAtJointDegrees(bowShoulder, bowElbow, bowWrist);
    }

    const drawShoulder = confidentKeypoint(frame, `${drawSide}_shoulder`);
    const drawElbow = confidentKeypoint(frame, `${drawSide}_elbow`);
    const drawWrist = confidentKeypoint(frame, `${drawSide}_wrist`);
    if (drawShoulder && drawElbow && drawWrist) {
        rawValuesByMetricId.drawArmElbow = angleAtJointDegrees(drawShoulder, drawElbow, drawWrist);
    }

    const leftEar = confidentKeypoint(frame, "left_ear");
    const rightEar = confidentKeypoint(frame, "right_ear");
    if (leftEar && rightEar) {
        rawValuesByMetricId.headTilt = angleFromHorizontalDegrees(leftEar, rightEar);
    }

    const leftHip = confidentKeypoint(frame, "left_hip");
    const rightHip = confidentKeypoint(frame, "right_hip");
    if (leftHip && rightHip) {
        rawValuesByMetricId.hipLevel = angleFromHorizontalDegrees(leftHip, rightHip);
    }

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulder = midpointKeypoint("mid_shoulder", leftShoulder, rightShoulder);
        const midHip = midpointKeypoint("mid_hip", leftHip, rightHip);
        rawValuesByMetricId.torsoVerticality = tiltFromVerticalDegrees(midShoulder, midHip);
    }

    /**
     * Stance "opening" relative to the pelvis: the angle between the
     * feet line (left_heel↔right_heel — heels, not ankles or toes,
     * per direct request) and the hip line (left_hip↔right_hip). Uses
     * angleBetweenLinesDegrees() because these two lines do not share
     * a vertex, unlike angleAtJointDegrees()'s use elsewhere in this
     * function. See metrics.ts's DEFAULT_POSTURE_METRICS entry for why
     * this metric has no default ideal/warn range.
     */
    const leftHeel = confidentKeypoint(frame, "left_heel");
    const rightHeel = confidentKeypoint(frame, "right_heel");
    if (leftHeel && rightHeel && leftHip && rightHip) {
        rawValuesByMetricId.footStanceAngle = angleBetweenLinesDegrees(leftHeel, rightHeel, leftHip, rightHip);
    }

    return metricDefinitions.map((definition) => {
        const valueDegrees = rawValuesByMetricId[definition.id];
        if (valueDegrees === undefined) {
            return { id: definition.id, name: definition.name, valueDegrees: null, status: null };
        }
        return {
            id: definition.id,
            name: definition.name,
            valueDegrees,
            status: evaluatePostureMetric(valueDegrees, definition)
        };
    });
}
