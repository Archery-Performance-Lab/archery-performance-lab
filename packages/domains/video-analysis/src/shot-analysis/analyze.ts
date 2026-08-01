import type { PoseDetector } from "@tensorflow-models/pose-detection";
import { extractFramesFromVideo, type FrameExtractionOptions } from "../frame-extraction";
import { estimatePoseFrame } from "../pose-estimation";
import type { PoseFrame } from "../types";

export type AnalyzeShotVideoOptions = FrameExtractionOptions;

/**
 * Decodes a video file and runs pose estimation on every extracted
 * frame, yielding one PoseFrame at a time.
 *
 * This is frame-extraction/extractFramesFromVideo() and
 * pose-estimation/estimatePoseFrame() wired together — kept as its
 * own function rather than left for every caller to compose by hand,
 * because getting the tensor lifecycle right matters:
 * extractFramesFromVideo() yields a fresh Tensor3D per frame that
 * must be disposed once no longer needed (standard TensorFlow.js
 * memory management — tensors are not garbage collected), and it's
 * easy to forget that disposal has to happen even if
 * estimatePoseFrame() throws for a given frame. The try/finally here
 * makes that automatic.
 *
 * Callers create the PoseDetector once (via createPoseDetector(), see
 * pose-estimation/) and pass it in, rather than this function
 * creating one per call — detector creation loads model weights and
 * is comparatively slow, and a single detector is meant to be reused
 * across every frame of a video (and across multiple videos, if
 * desired).
 */
export async function* analyzeShotVideo(
    videoFilePath: string,
    detector: PoseDetector,
    options: AnalyzeShotVideoOptions = {}
): AsyncGenerator<PoseFrame> {
    for await (const { frame, timestampMilliseconds } of extractFramesFromVideo(
        videoFilePath,
        options
    )) {
        try {
            yield await estimatePoseFrame(detector, frame, timestampMilliseconds);
        } finally {
            frame.dispose();
        }
    }
}
