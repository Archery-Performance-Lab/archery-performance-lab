import type { Tensor3D } from "@tensorflow/tfjs-node";
import type { PoseDetector } from "@tensorflow-models/pose-detection";
import type { PoseFrame, PoseKeypoint } from "../types";

/**
 * Runs pose estimation on a single already-decoded frame and converts
 * the result into APL's PoseFrame domain type.
 *
 * `frame` must already be a decoded Tensor3D (e.g. via
 * tf.node.decodeImage() on a JPEG/PNG buffer). Extracting frames from
 * a video file (e.g. with ffmpeg) is a separate, not-yet-implemented
 * concern — see README.md.
 *
 * If the underlying library ever omits `name` on a keypoint
 * (confirmed, by reading its BlazePose/tfjs implementation, to always
 * set it in practice — see node_modules/@tensorflow-models/
 * pose-detection/dist/blazepose_tfjs/detector.js — but the type
 * itself marks it optional since Keypoint is shared across models),
 * this falls back to a positional placeholder rather than throwing,
 * so one unexpected keypoint does not fail the whole frame.
 */
export async function estimatePoseFrame(
    detector: PoseDetector,
    frame: Tensor3D,
    timestampMilliseconds: number
): Promise<PoseFrame> {

    const poses = await detector.estimatePoses(
        frame,
        undefined,
        timestampMilliseconds
    );

    const firstPose = poses[0];

    const keypoints: PoseKeypoint[] = (firstPose?.keypoints ?? []).map(
        (keypoint, index) => ({
            name: keypoint.name ?? `keypoint_${index}`,
            xPixels: keypoint.x,
            yPixels: keypoint.y,
            confidenceScore: keypoint.score ?? 0
        })
    );

    return {
        timestampMilliseconds,
        keypoints
    };
}
