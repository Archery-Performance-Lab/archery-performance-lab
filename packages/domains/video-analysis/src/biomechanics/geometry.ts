import type { PoseKeypoint } from "../types";

/**
 * Straight-line distance between two keypoints, in pixels.
 *
 * Deliberately pixel-based, not a real-world unit (millimeters,
 * etc.): converting pixel distances to real-world distances needs
 * camera calibration (focal length, sensor size, distance to
 * subject) that this package does not have. A shrinking/growing pixel
 * distance is still meaningful for phase detection (e.g. the
 * string-hand-to-face distance decreasing during Drawing) even
 * without knowing its real-world scale.
 */
export function distanceBetweenKeypoints(
    firstKeypoint: PoseKeypoint,
    secondKeypoint: PoseKeypoint
): number {
    const deltaXPixels = secondKeypoint.xPixels - firstKeypoint.xPixels;
    const deltaYPixels = secondKeypoint.yPixels - firstKeypoint.yPixels;

    return Math.sqrt(deltaXPixels * deltaXPixels + deltaYPixels * deltaYPixels);
}

/**
 * The angle, in degrees, at `jointKeypoint` formed by the two rays
 * jointKeypoint→firstKeypoint and jointKeypoint→secondKeypoint.
 *
 * Example: angleAtJointDegrees(shoulder, elbow, wrist) gives the
 * elbow's bend angle — 180° is a fully straight arm, smaller values
 * are more bent. This is the building block for checks like "is the
 * string-arm elbow aligned in a straight line from the grip hand
 * through the shoulders" that Anchor-phase quality checks need
 * (see types/phase.ts).
 *
 * Throws if either ray has (effectively) zero length, since the
 * angle is undefined when a keypoint coincides with the joint — this
 * signals a genuine data problem (e.g. two keypoints collapsed to the
 * same pixel) rather than a normal edge case to silently paper over.
 */
export function angleAtJointDegrees(
    firstKeypoint: PoseKeypoint,
    jointKeypoint: PoseKeypoint,
    secondKeypoint: PoseKeypoint
): number {
    const firstRayX = firstKeypoint.xPixels - jointKeypoint.xPixels;
    const firstRayY = firstKeypoint.yPixels - jointKeypoint.yPixels;
    const secondRayX = secondKeypoint.xPixels - jointKeypoint.xPixels;
    const secondRayY = secondKeypoint.yPixels - jointKeypoint.yPixels;

    const firstRayLength = Math.sqrt(firstRayX * firstRayX + firstRayY * firstRayY);
    const secondRayLength = Math.sqrt(secondRayX * secondRayX + secondRayY * secondRayY);

    const ZERO_LENGTH_TOLERANCE_PIXELS = 1e-9;
    if (firstRayLength < ZERO_LENGTH_TOLERANCE_PIXELS || secondRayLength < ZERO_LENGTH_TOLERANCE_PIXELS) {
        throw new Error(
            "Cannot compute an angle: one of the keypoints coincides with the joint keypoint"
        );
    }

    const dotProduct = firstRayX * secondRayX + firstRayY * secondRayY;
    const cosineOfAngle = dotProduct / (firstRayLength * secondRayLength);

    // Guard against floating-point drift pushing the cosine just
    // outside [-1, 1], which would make Math.acos return NaN.
    const clampedCosine = Math.min(1, Math.max(-1, cosineOfAngle));

    return (Math.acos(clampedCosine) * 180) / Math.PI;
}

/**
 * How far a keypoint sits from the straight line through two other
 * keypoints, in pixels — signed (via the 2D cross product) so the
 * caller can tell which side of the line it falls on, though the
 * sign's visual meaning ("left" vs. "right") depends on image pixel
 * coordinates being y-down, not standard math y-up axes — callers
 * needing a direction should verify empirically rather than assume.
 *
 * Building block for "is the grip hand, both shoulders and the
 * string elbow in a straight line" (Anchor-phase quality check): a
 * value near zero for a keypoint in the middle of that chain means
 * good alignment.
 */
export function perpendicularDistanceFromLinePixels(
    pointKeypoint: PoseKeypoint,
    lineStartKeypoint: PoseKeypoint,
    lineEndKeypoint: PoseKeypoint
): number {
    const lineDeltaX = lineEndKeypoint.xPixels - lineStartKeypoint.xPixels;
    const lineDeltaY = lineEndKeypoint.yPixels - lineStartKeypoint.yPixels;
    const lineLength = Math.sqrt(lineDeltaX * lineDeltaX + lineDeltaY * lineDeltaY);

    const ZERO_LENGTH_TOLERANCE_PIXELS = 1e-9;
    if (lineLength < ZERO_LENGTH_TOLERANCE_PIXELS) {
        throw new Error(
            "Cannot compute a perpendicular distance: the two line keypoints coincide"
        );
    }

    const pointDeltaX = pointKeypoint.xPixels - lineStartKeypoint.xPixels;
    const pointDeltaY = pointKeypoint.yPixels - lineStartKeypoint.yPixels;

    const crossProduct = lineDeltaX * pointDeltaY - lineDeltaY * pointDeltaX;

    return crossProduct / lineLength;
}
