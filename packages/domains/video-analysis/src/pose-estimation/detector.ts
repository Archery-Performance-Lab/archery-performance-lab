import "@tensorflow/tfjs-node";
import * as poseDetection from "@tensorflow-models/pose-detection";

/**
 * Creates a BlazePose detector running on the 'tfjs' runtime, backed
 * by @tensorflow/tfjs-node's native Node bindings (registered as a
 * side effect by the import above).
 *
 * modelType 'full' is the library's own balanced accuracy/speed
 * default (see node_modules/@tensorflow-models/pose-detection/dist/
 * blazepose_tfjs/types.d.ts) — a reasonable starting point for
 * offline video analysis, where accuracy matters more than the
 * latency trade-off a live camera feed would require ('lite').
 */
export async function createPoseDetector(): Promise<
    poseDetection.PoseDetector
> {
    return poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
        runtime: "tfjs",
        modelType: "full"
    });
}
