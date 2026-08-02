import type { PoseKeypoint } from "../types";

/**
 * A rectangular pixel region within a video frame, in the same
 * top-left-origin, y-down pixel coordinates as PoseKeypoint. Integer
 * pixel values, suitable for a tensor slice.
 */
export interface CropRegion {

    xPixels: number;

    yPixels: number;

    widthPixels: number;

    heightPixels: number;

}

/**
 * A square-ish region of `sizePixels` centered on `keypoint`, clamped
 * to stay fully inside a frame of `frameWidthPixels` x
 * `frameHeightPixels`.
 *
 * Building block for hand-tension/'s texture analysis: given the
 * draw-side wrist keypoint (the closest BlazePose landmark to the
 * string hand — BlazePose has no individual finger joints, see
 * types/phase.ts's Release doc comment), this crops out the region of
 * the frame most likely to actually contain the hand, so texture
 * analysis runs on the hand's skin rather than the whole frame.
 *
 * `sizePixels` is deliberately a plain parameter here, not computed
 * inside this function: how large a crop actually captures "the hand"
 * depends on the archer's scale in frame (camera distance/zoom), which
 * this package has no absolute measure of — same reasoning as the
 * biomechanics/ velocity and distance signals being normalized by
 * shoulder width rather than used as raw pixels. Callers should derive
 * `sizePixels` from something scale-relative, like shoulder width, not
 * hardcode a fixed pixel count that would only work for one video's
 * resolution and camera distance.
 *
 * Clamping keeps the crop within frame bounds without changing its
 * requested size where possible: it shifts the crop's position (not
 * its size) when the keypoint is near an edge, only shrinking the
 * region if `sizePixels` is larger than the frame itself.
 */
export function computeCropRegionAroundKeypoint(
    keypoint: PoseKeypoint,
    sizePixels: number,
    frameWidthPixels: number,
    frameHeightPixels: number
): CropRegion {
    if (sizePixels <= 0) {
        throw new Error(`sizePixels must be positive, got ${sizePixels}`);
    }
    if (frameWidthPixels <= 0 || frameHeightPixels <= 0) {
        throw new Error(
            `Frame dimensions must be positive, got ${frameWidthPixels}x${frameHeightPixels}`
        );
    }

    const widthPixels = Math.round(Math.min(sizePixels, frameWidthPixels));
    const heightPixels = Math.round(Math.min(sizePixels, frameHeightPixels));

    const idealXPixels = keypoint.xPixels - widthPixels / 2;
    const idealYPixels = keypoint.yPixels - heightPixels / 2;

    const xPixels = Math.round(
        Math.min(Math.max(idealXPixels, 0), frameWidthPixels - widthPixels)
    );
    const yPixels = Math.round(
        Math.min(Math.max(idealYPixels, 0), frameHeightPixels - heightPixels)
    );

    return { xPixels, yPixels, widthPixels, heightPixels };
}
