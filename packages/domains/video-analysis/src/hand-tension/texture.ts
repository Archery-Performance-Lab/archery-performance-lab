import * as tf from "@tensorflow/tfjs";
import type { Tensor3D, Tensor4D } from "@tensorflow/tfjs";
import type { CropRegion } from "./crop";

/**
 * Crops `region` out of `frame` (a [height, width, channels] pixel
 * tensor, e.g. from frame-extraction/extractFramesFromVideo()).
 *
 * Returns a new tensor the caller owns and must dispose — same
 * ownership rule as the frame tensors this package already hands out
 * elsewhere (see shot-analysis/analyzeShotVideo()'s doc comment).
 */
export function cropFrameRegion(frame: Tensor3D, region: CropRegion): Tensor3D {
    return frame.slice(
        [region.yPixels, region.xPixels, 0],
        [region.heightPixels, region.widthPixels, frame.shape[2]]
    );
}

// Standard ITU-R BT.601 luma weights, used to convert RGB to
// grayscale — a well-established constant, not one invented for this
// project (see e.g. the "601" coefficients in any colorspace-
// conversion reference).
const GRAYSCALE_LUMINANCE_WEIGHTS = [0.299, 0.587, 0.114];

// The standard discrete Laplacian edge-detection kernel. Also not
// invented: this is one of the most common edge/texture operators in
// classical computer vision, and — unlike a learned model — its
// output is fully explainable: it responds to local intensity
// changes (edges), and is near-zero over smooth, uniform regions.
const LAPLACIAN_KERNEL_3X3 = [0, 1, 0, 1, -4, 1, 0, 1, 0];

const MINIMUM_REGION_SIZE_PIXELS = 3;

/**
 * A texture/edge-density metric over a cropped image region: the
 * variance of its Laplacian response. Higher values mean more local
 * intensity variation (more visible edges/structure); a smooth,
 * uniform region scores near zero.
 *
 * This exists as a candidate proxy for a specific, real coaching
 * observation (see types/phase.ts's Release doc comment): a tensed
 * hand visibly shows its tendons standing out under the skin, a
 * relaxed one doesn't — a difference in surface texture, not hand
 * position, and therefore not something BlazePose's keypoint model
 * (position-only, no finger joints) can capture at all. Variance of
 * the Laplacian is a standard, well-understood "how much texture/edge
 * content is in this image" measure (classically used for blur
 * detection); using it here for tendon visibility specifically is a
 * hypothesis, not a validated result — it needs checking against real
 * footage (e.g. does this metric actually rise around Anchor/
 * Expansion, when tension is real, versus a relaxed moment?) before
 * being trusted for anything, same discipline as every other
 * threshold in this package.
 *
 * Throws if the region is smaller than the 3x3 kernel needs — a
 * degenerate crop (e.g. a keypoint right at a frame's corner with a
 * tiny `sizePixels`) should fail loudly, not silently produce a
 * meaningless number.
 */
export function computeHandTensionMetric(croppedFrame: Tensor3D): number {
    const [heightPixels, widthPixels, channels] = croppedFrame.shape;

    if (heightPixels < MINIMUM_REGION_SIZE_PIXELS || widthPixels < MINIMUM_REGION_SIZE_PIXELS) {
        throw new Error(
            `Cropped region too small (${widthPixels}x${heightPixels}) to compute a texture ` +
                `metric — need at least ${MINIMUM_REGION_SIZE_PIXELS}x${MINIMUM_REGION_SIZE_PIXELS} pixels.`
        );
    }

    return tf.tidy(() => {
        const floatFrame = croppedFrame.toFloat();

        const grayscale =
            channels === 1
                ? floatFrame
                : floatFrame.mul(
                      tf.tensor1d(GRAYSCALE_LUMINANCE_WEIGHTS.slice(0, channels))
                  ).sum(-1, true);

        const kernel = tf.tensor4d(LAPLACIAN_KERNEL_3X3, [3, 3, 1, 1]);
        const batchedGrayscale = grayscale.expandDims(0) as Tensor4D;
        const laplacianResponse = tf.conv2d(batchedGrayscale, kernel, 1, "valid");

        const { variance } = tf.moments(laplacianResponse);
        const varianceValue = variance.dataSync()[0];
        if (varianceValue === undefined) {
            throw new Error("tf.moments() returned an empty variance tensor");
        }
        return varianceValue;
    });
}
