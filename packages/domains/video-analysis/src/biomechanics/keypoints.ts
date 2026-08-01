import type { PoseFrame, PoseKeypoint } from "../types";

/**
 * Looks up a single named keypoint within a frame (e.g. "left_wrist",
 * "right_shoulder" — see @tensorflow-models/pose-detection's BlazePose
 * README for the full 33-landmark name list). Returns undefined
 * rather than throwing when missing, since a keypoint can genuinely
 * be absent or filtered out by the pose estimator for a given frame
 * (e.g. occluded by the bow) — callers decide whether that is
 * recoverable.
 */
export function findKeypoint(
    frame: PoseFrame,
    keypointName: string
): PoseKeypoint | undefined {
    return frame.keypoints.find((keypoint) => keypoint.name === keypointName);
}
