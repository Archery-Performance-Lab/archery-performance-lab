import type { Tensor3D } from "@tensorflow/tfjs";
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

/**
 * One frame's pose estimate, paired with the still-undisposed pixel
 * tensor it came from.
 *
 * `frame` is owned by the caller of analyzeShotVideoWithFrames() and
 * MUST be disposed once no longer needed (standard TensorFlow.js
 * memory management, same rule extractFramesFromVideo() itself already
 * follows) — this generator deliberately does not dispose it, unlike
 * analyzeShotVideo() above, because callers that need the raw pixels
 * (e.g. hand-tension/'s texture analysis, which needs to crop and
 * inspect the actual image, not just keypoint positions) have nothing
 * left to work with once the frame is gone.
 */
export interface PoseFrameWithImage {

    poseFrame: PoseFrame;

    frame: Tensor3D;

}

/**
 * Same pipeline as analyzeShotVideo(), but yields the decoded frame
 * tensor alongside its PoseFrame instead of disposing it internally.
 *
 * Use this instead of analyzeShotVideo() only when something beyond
 * keypoint positions is actually needed from the image itself — see
 * PoseFrameWithImage's doc comment for why, and remember to dispose
 * `frame` when done with it (e.g. in a try/finally around whatever
 * per-frame work follows, mirroring analyzeShotVideo()'s own internal
 * pattern).
 */
export async function* analyzeShotVideoWithFrames(
    videoFilePath: string,
    detector: PoseDetector,
    options: AnalyzeShotVideoOptions = {}
): AsyncGenerator<PoseFrameWithImage> {
    for await (const { frame, timestampMilliseconds } of extractFramesFromVideo(
        videoFilePath,
        options
    )) {
        const poseFrame = await estimatePoseFrame(detector, frame, timestampMilliseconds);
        yield { poseFrame, frame };
    }
}
