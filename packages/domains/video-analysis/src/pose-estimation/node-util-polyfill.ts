import util from "node:util";

/**
 * Workaround for a real upstream incompatibility, not a bug in this
 * package: @tensorflow/tfjs-node (last published ~2024, version
 * 4.22.0) still calls the long-deprecated util.isNullOrUndefined(),
 * which Node.js has since removed entirely (confirmed removed as of
 * Node 26, the version this project targets). Without this patch,
 * creating a BlazePose/tfjs detector and calling estimatePoses()
 * crashes with:
 *
 *   TypeError: (0 , util_1.isNullOrUndefined) is not a function
 *
 * thrown from nodejs_kernel_backend.js's Cast kernel.
 *
 * This must be imported BEFORE "@tensorflow/tfjs-node" anywhere in
 * the process: Node caches the `util` module singleton, so patching
 * it once here is enough for tfjs-node's own internal `require("util")`
 * to see the patched version too.
 *
 * Remove this once @tensorflow/tfjs-node ships a fix upstream, or if
 * this package moves to the WASM/pure-JS tfjs backend instead, which
 * does not go through this native-bridge code path at all.
 */
type UtilWithLegacyCheck = typeof util & {
    isNullOrUndefined?: (value: unknown) => boolean;
};

const utilWithLegacyCheck = util as UtilWithLegacyCheck;

if (typeof utilWithLegacyCheck.isNullOrUndefined !== "function") {
    utilWithLegacyCheck.isNullOrUndefined = (value: unknown): boolean =>
        value === null || value === undefined;
}
