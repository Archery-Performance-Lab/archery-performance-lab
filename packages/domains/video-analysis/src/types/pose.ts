/**
 * A single tracked body landmark within one video frame.
 *
 * `name` is intentionally a plain string rather than a fixed union:
 * the exact landmark set (names and count) depends on which pose
 * estimation model is used (e.g. BlazePose's 33 landmarks vs.
 * MoveNet's 17 COCO keypoints), and that choice has not been
 * integrated into code yet — see README.md. Once the model is wired
 * up, this can be narrowed to a real union type matching its actual
 * output, rather than one guessed in advance.
 */
export interface PoseKeypoint {

    name: string;

    xPixels: number;

    yPixels: number;

    confidenceScore: number;

}

/**
 * All tracked landmarks detected in a single video frame.
 */
export interface PoseFrame {

    timestampMilliseconds: number;

    keypoints: PoseKeypoint[];

}
