import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import * as poseDetection from "@tensorflow-models/pose-detection";

/**
 * Why the WASM backend instead of @tensorflow/tfjs-node (native
 * bindings), which is the more common choice for server-side TF.js:
 *
 * tfjs-node's native "tensorflow" backend does not implement several
 * image-preprocessing kernels BlazePose depends on (Transform,
 * RotateWithOffset, FlipLeftRight) — confirmed as a long-standing,
 * unresolved gap via multiple upstream GitHub issues, not something
 * fixable from this package. The WASM backend implements the full
 * kernel set (it's built to fully replace browser/CPU execution) and
 * has no compiled native addon, so it also isn't tied to the OS/CPU
 * architecture it happened to be installed on.
 *
 * No explicit setWasmPaths() call is needed here: this package's
 * npm "main" entry (dist/tf-backend-wasm.node.js) is a Node-specific
 * build that detects it is running under Node and resolves its
 * '.wasm' binaries relative to its own __dirname — i.e. directly
 * inside node_modules/@tensorflow/tfjs-backend-wasm/dist, where the
 * files actually are (confirmed by reading that bundle's source).
 * setWasmPaths() exists for cases this default can't handle, such as
 * a browser bundle that moves the .wasm files elsewhere.
 */
let backendReadyPromise: Promise<void> | null = null;

async function ensureWasmBackendReady(): Promise<void> {
    if (backendReadyPromise === null) {
        backendReadyPromise = (async () => {
            await tf.setBackend("wasm");
            await tf.ready();
        })();
    }
    return backendReadyPromise;
}

/**
 * Creates a BlazePose detector running on the 'tfjs' runtime, backed
 * by the WASM backend registered as a side effect by the import
 * above.
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
    await ensureWasmBackendReady();

    return poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
        runtime: "tfjs",
        modelType: "full"
    });
}
