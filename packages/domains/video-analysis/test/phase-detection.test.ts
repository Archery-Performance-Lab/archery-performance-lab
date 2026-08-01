import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { detectShootingPhases } from "../src/phase-detection";
import type { PoseFrame, PoseKeypoint } from "../src/types";

function keypoint(name: string, xPixels: number, yPixels: number): PoseKeypoint {
    return { name, xPixels, yPixels, confidenceScore: 1 };
}

/**
 * Builds a synthetic pose sequence shaped like the real pattern found
 * in the first usable calibration video (IMG_1219 — see
 * ~/Development/apl-video-calibration/signals/): a quiet hold with
 * the draw-side wrist essentially at the face keypoint, then a fast,
 * sustained move away from it (Release), then a calm tail
 * (FollowThrough). Shoulder width is held constant at 100px so the
 * normalized (shoulder-widths) and raw pixel numbers are easy to
 * reason about by hand.
 */
function buildSyntheticShotSequence(): PoseFrame[] {
    const leftShoulder = keypoint("left_shoulder", -50, 0);
    const rightShoulder = keypoint("right_shoulder", 50, 0);
    const mouthRight = keypoint("mouth_right", 0, -30);

    const timestamps = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240];

    // Wrist stays exactly on the face keypoint (distance 0) through
    // t=100, then moves 40px every 20ms (2000px/s, 20 shoulder-widths/
    // second — far above every threshold) through t=200, then holds
    // still again.
    const wristYByTimestamp: Record<number, number> = {
        0: -30,
        20: -30,
        40: -30,
        60: -30,
        80: -30,
        100: -30,
        120: 10,
        140: 50,
        160: 90,
        180: 130,
        200: 170,
        220: 170,
        240: 170
    };

    return timestamps.map((timestampMilliseconds) => ({
        timestampMilliseconds,
        keypoints: [
            leftShoulder,
            rightShoulder,
            mouthRight,
            keypoint("right_wrist", 0, wristYByTimestamp[timestampMilliseconds] as number)
        ]
    }));
}

describe("phase-detection/detectShootingPhases", () => {
    it("detects Anchor, Release and FollowThrough on a clean synthetic sequence", () => {
        const poseFrames = buildSyntheticShotSequence();

        const segments = detectShootingPhases(poseFrames, { drawSide: "right" });

        assert.deepEqual(
            segments.map((segment) => segment.phase),
            ["Anchor", "Release", "FollowThrough"]
        );

        const [anchor, release, followThrough] = segments;

        assert.equal(anchor?.startTimeMilliseconds, 0);
        assert.equal(anchor?.endTimeMilliseconds, 100);

        assert.equal(release?.startTimeMilliseconds, 120);
        assert.equal(release?.endTimeMilliseconds, 200);

        assert.equal(followThrough?.startTimeMilliseconds, 220);
        assert.equal(followThrough?.endTimeMilliseconds, 240);
    });

    it("returns an empty array when no sustained velocity rise is found", () => {
        // Every frame identical: no Release signal at all.
        const leftShoulder = keypoint("left_shoulder", -50, 0);
        const rightShoulder = keypoint("right_shoulder", 50, 0);
        const wrist = keypoint("right_wrist", 0, -30);

        const poseFrames: PoseFrame[] = [0, 20, 40, 60, 80].map((timestampMilliseconds) => ({
            timestampMilliseconds,
            keypoints: [leftShoulder, rightShoulder, wrist]
        }));

        assert.deepEqual(detectShootingPhases(poseFrames, { drawSide: "right" }), []);
    });

    it("ignores a brief jump-and-return that is not sustained", () => {
        const leftShoulder = keypoint("left_shoulder", -50, 0);
        const rightShoulder = keypoint("right_shoulder", 50, 0);
        const mouthRight = keypoint("mouth_right", 0, -30);

        // A large jump away and straight back: velocity spikes for
        // two frames (out and back) then immediately settles — too
        // short a run to be mistaken for a real, sustained Release
        // ramp (which needs releaseSustainedFrameCount consecutive
        // elevated frames).
        const wristYByTimestamp: Record<number, number> = {
            0: -30,
            20: -30,
            40: 200, // one-frame spike (huge velocity)
            60: -30, // immediately back — not sustained
            80: -30
        };

        const poseFrames: PoseFrame[] = Object.keys(wristYByTimestamp).map((key) => {
            const timestampMilliseconds = Number(key);
            return {
                timestampMilliseconds,
                keypoints: [
                    leftShoulder,
                    rightShoulder,
                    mouthRight,
                    keypoint("right_wrist", 0, wristYByTimestamp[timestampMilliseconds] as number)
                ]
            };
        });

        assert.deepEqual(detectShootingPhases(poseFrames, { drawSide: "right" }), []);
    });
});
