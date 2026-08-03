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

/**
 * How far a line between two keypoints deviates from perfectly
 * horizontal, in degrees — 0 means level, 90 means vertical. Folded
 * into [0, 90] (via min(angle, 180-angle)) so the result does not
 * depend on which keypoint is passed first: a line and its reverse
 * describe the same tilt.
 *
 * This is the building block behind "are the two shoulders level?" /
 * "are the two hips level?" / "is the head tilted?" checks — each is
 * just this function applied to a different pair of keypoints
 * (left/right shoulder, left/right hip, left/right ear). Ported from
 * a real, working reference implementation (a third-party browser
 * tool, "Archery Posture Tracker" at ghiggo.altervista.org/posture,
 * whose client-side source was read directly — its `angleLine()` +
 * `Math.min(angle, 180-angle)` folding does exactly this), not
 * invented from scratch — see posture-analysis/ for how the six
 * metrics that reference tool computes are reproduced here with our
 * own keypoint/geometry primitives.
 *
 * Throws if the two keypoints coincide, for the same reason
 * angleAtJointDegrees() throws on a zero-length ray: the angle of a
 * single point is undefined, not zero.
 */
export function angleFromHorizontalDegrees(
    firstKeypoint: PoseKeypoint,
    secondKeypoint: PoseKeypoint
): number {
    const deltaX = secondKeypoint.xPixels - firstKeypoint.xPixels;
    const deltaY = secondKeypoint.yPixels - firstKeypoint.yPixels;

    const ZERO_LENGTH_TOLERANCE_PIXELS = 1e-9;
    if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) < ZERO_LENGTH_TOLERANCE_PIXELS) {
        throw new Error(
            "Cannot compute an angle from horizontal: the two keypoints coincide"
        );
    }

    const rawAngleDegrees = Math.abs((Math.atan2(deltaY, deltaX) * 180) / Math.PI);

    return Math.min(rawAngleDegrees, 180 - rawAngleDegrees);
}

/**
 * How far a line between two keypoints deviates from perfectly
 * vertical, in degrees — 0 means a plumb-straight line (top keypoint
 * directly above bottomKeypoint), larger values mean it leans
 * sideways. Unlike angleFromHorizontalDegrees(), this is NOT folded
 * into [0, 90]: for a standing archer this stays a small number near
 * 0 regardless, and keeping the direct atan2 result (rather than
 * min(angle, 180-angle)) matches the reference implementation this
 * was ported from (see angleFromHorizontalDegrees()'s doc comment)
 * exactly, so results are directly comparable.
 *
 * Intended use: torso verticality, passing the midpoint between both
 * shoulders as `topKeypoint` and the midpoint between both hips as
 * `bottomKeypoint` — a real archer's torso should stay close to
 * upright throughout the shot, not lean toward the target or away
 * from it.
 *
 * Throws if the two keypoints coincide, same reasoning as
 * angleAtJointDegrees()/angleFromHorizontalDegrees().
 */
export function tiltFromVerticalDegrees(
    topKeypoint: PoseKeypoint,
    bottomKeypoint: PoseKeypoint
): number {
    const deltaX = bottomKeypoint.xPixels - topKeypoint.xPixels;
    const deltaY = bottomKeypoint.yPixels - topKeypoint.yPixels;

    const ZERO_LENGTH_TOLERANCE_PIXELS = 1e-9;
    if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) < ZERO_LENGTH_TOLERANCE_PIXELS) {
        throw new Error(
            "Cannot compute a tilt from vertical: the two keypoints coincide"
        );
    }

    return Math.abs((Math.atan2(deltaX, deltaY) * 180) / Math.PI);
}
