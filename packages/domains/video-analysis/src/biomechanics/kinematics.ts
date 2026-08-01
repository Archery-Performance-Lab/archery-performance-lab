import type { PoseKeypoint } from "../types";
import { distanceBetweenKeypoints } from "./geometry";

/**
 * How fast a keypoint moved between two frames, in pixels per second.
 *
 * Like distanceBetweenKeypoints(), this is deliberately pixel-based:
 * without camera calibration (focal length, distance to subject),
 * pixel velocity cannot be converted to a real-world speed. It is
 * still useful as a *relative* signal within one video — e.g. the
 * string-arm wrist's velocity spikes sharply at Release, regardless
 * of the absolute pixel-to-millimeter scale of that particular
 * recording (see types/phase.ts's note on Release detection).
 *
 * Throws if the two timestamps are equal or out of order, since a
 * velocity is undefined over zero or negative elapsed time.
 */
export function keypointVelocityPixelsPerSecond(
    previousKeypoint: PoseKeypoint,
    previousTimestampMilliseconds: number,
    currentKeypoint: PoseKeypoint,
    currentTimestampMilliseconds: number
): number {
    const elapsedMilliseconds = currentTimestampMilliseconds - previousTimestampMilliseconds;

    if (elapsedMilliseconds <= 0) {
        throw new Error(
            `Cannot compute a velocity: timestamps must strictly increase (got ${previousTimestampMilliseconds}ms then ${currentTimestampMilliseconds}ms)`
        );
    }

    const distancePixels = distanceBetweenKeypoints(previousKeypoint, currentKeypoint);
    const elapsedSeconds = elapsedMilliseconds / 1000;

    return distancePixels / elapsedSeconds;
}
