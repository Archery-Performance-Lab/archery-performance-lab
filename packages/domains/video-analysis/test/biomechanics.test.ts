import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    findKeypoint,
    distanceBetweenKeypoints,
    angleAtJointDegrees,
    perpendicularDistanceFromLinePixels,
    angleFromHorizontalDegrees,
    tiltFromVerticalDegrees,
    keypointVelocityPixelsPerSecond
} from "../src/biomechanics";
import type { PoseFrame, PoseKeypoint } from "../src/types";

function keypoint(name: string, xPixels: number, yPixels: number): PoseKeypoint {
    return { name, xPixels, yPixels, confidenceScore: 1 };
}

describe("biomechanics/keypoints/findKeypoint", () => {
    it("finds a keypoint by name", () => {
        const frame: PoseFrame = {
            timestampMilliseconds: 0,
            keypoints: [keypoint("nose", 10, 20), keypoint("left_wrist", 30, 40)]
        };

        assert.deepEqual(findKeypoint(frame, "left_wrist"), keypoint("left_wrist", 30, 40));
    });

    it("returns undefined for a missing keypoint", () => {
        const frame: PoseFrame = { timestampMilliseconds: 0, keypoints: [] };
        assert.equal(findKeypoint(frame, "nose"), undefined);
    });
});

describe("biomechanics/geometry/distanceBetweenKeypoints", () => {
    it("computes a 3-4-5 right triangle distance", () => {
        const a = keypoint("a", 0, 0);
        const b = keypoint("b", 3, 4);
        assert.equal(distanceBetweenKeypoints(a, b), 5);
    });

    it("is zero for coincident keypoints", () => {
        const a = keypoint("a", 5, 5);
        assert.equal(distanceBetweenKeypoints(a, a), 0);
    });
});

describe("biomechanics/geometry/angleAtJointDegrees", () => {
    it("computes 90 degrees for a right angle", () => {
        const shoulder = keypoint("shoulder", 0, 0);
        const elbow = keypoint("elbow", 0, -10);
        const wrist = keypoint("wrist", 10, -10);

        // Ray elbow->shoulder points straight down (0,10); ray
        // elbow->wrist points straight right (10,0) — perpendicular.
        assert.ok(Math.abs(angleAtJointDegrees(shoulder, elbow, wrist) - 90) < 1e-9);
    });

    it("computes 180 degrees for a straight arm", () => {
        const shoulder = keypoint("shoulder", 0, 0);
        const elbow = keypoint("elbow", 10, 0);
        const wrist = keypoint("wrist", 20, 0);

        assert.ok(Math.abs(angleAtJointDegrees(shoulder, elbow, wrist) - 180) < 1e-9);
    });

    it("computes 0 degrees when both rays point the same direction", () => {
        const joint = keypoint("joint", 0, 0);
        const pointA = keypoint("a", 10, 0);
        const pointB = keypoint("b", 5, 0);

        assert.ok(Math.abs(angleAtJointDegrees(pointA, joint, pointB)) < 1e-9);
    });

    it("throws when a keypoint coincides with the joint", () => {
        const joint = keypoint("joint", 0, 0);
        const other = keypoint("other", 10, 10);
        assert.throws(() => angleAtJointDegrees(joint, joint, other));
    });
});

describe("biomechanics/geometry/perpendicularDistanceFromLinePixels", () => {
    it("is zero for a point exactly on the line", () => {
        const lineStart = keypoint("start", 0, 0);
        const lineEnd = keypoint("end", 10, 0);
        const midpoint = keypoint("mid", 5, 0);

        assert.equal(perpendicularDistanceFromLinePixels(midpoint, lineStart, lineEnd), 0);
    });

    it("returns the perpendicular offset for a point off the line", () => {
        const lineStart = keypoint("start", 0, 0);
        const lineEnd = keypoint("end", 10, 0);
        const offPoint = keypoint("off", 5, 3);

        assert.ok(
            Math.abs(perpendicularDistanceFromLinePixels(offPoint, lineStart, lineEnd) - 3) < 1e-9
        );
    });

    it("throws when the two line keypoints coincide", () => {
        const point = keypoint("start", 0, 0);
        const other = keypoint("other", 5, 5);
        assert.throws(() => perpendicularDistanceFromLinePixels(other, point, point));
    });
});

describe("biomechanics/geometry/angleFromHorizontalDegrees", () => {
    it("is zero for a perfectly level line", () => {
        const left = keypoint("left_shoulder", 0, 50);
        const right = keypoint("right_shoulder", 100, 50);
        assert.ok(Math.abs(angleFromHorizontalDegrees(left, right)) < 1e-9);
    });

    it("is 90 for a perfectly vertical line", () => {
        const top = keypoint("top", 50, 0);
        const bottom = keypoint("bottom", 50, 100);
        assert.ok(Math.abs(angleFromHorizontalDegrees(top, bottom) - 90) < 1e-9);
    });

    it("is symmetric under a small tilt regardless of point order", () => {
        // A 10px rise over 100px run: atan(10/100) ≈ 5.71°.
        const left = keypoint("left", 0, 10);
        const right = keypoint("right", 100, 0);

        const forward = angleFromHorizontalDegrees(left, right);
        const reversed = angleFromHorizontalDegrees(right, left);

        assert.ok(Math.abs(forward - reversed) < 1e-9);
        assert.ok(Math.abs(forward - 5.7106) < 1e-3);
    });

    it("throws when the two keypoints coincide", () => {
        const point = keypoint("point", 5, 5);
        assert.throws(() => angleFromHorizontalDegrees(point, point));
    });
});

describe("biomechanics/geometry/tiltFromVerticalDegrees", () => {
    it("is zero for a perfectly plumb line", () => {
        const top = keypoint("mid_shoulder", 50, 0);
        const bottom = keypoint("mid_hip", 50, 100);
        assert.ok(Math.abs(tiltFromVerticalDegrees(top, bottom)) < 1e-9);
    });

    it("is 90 for a perfectly horizontal line", () => {
        const top = keypoint("a", 0, 50);
        const bottom = keypoint("b", 100, 50);
        assert.ok(Math.abs(tiltFromVerticalDegrees(top, bottom) - 90) < 1e-9);
    });

    it("computes a small lean angle", () => {
        // 10px of horizontal drift over a 100px vertical drop:
        // atan(10/100) ≈ 5.71°, same magnitude as the horizontal-line
        // test above but measured from the vertical axis instead.
        const top = keypoint("mid_shoulder", 0, 0);
        const bottom = keypoint("mid_hip", 10, 100);

        assert.ok(Math.abs(tiltFromVerticalDegrees(top, bottom) - 5.7106) < 1e-3);
    });

    it("throws when the two keypoints coincide", () => {
        const point = keypoint("point", 5, 5);
        assert.throws(() => tiltFromVerticalDegrees(point, point));
    });
});

describe("biomechanics/kinematics/keypointVelocityPixelsPerSecond", () => {
    it("computes velocity for a keypoint moving over one second", () => {
        const previous = keypoint("wrist", 0, 0);
        const current = keypoint("wrist", 100, 0);

        assert.equal(keypointVelocityPixelsPerSecond(previous, 0, current, 1000), 100);
    });

    it("scales correctly for a sub-second interval", () => {
        const previous = keypoint("wrist", 0, 0);
        const current = keypoint("wrist", 10, 0);

        // 10 pixels in 100ms = 100 pixels/second.
        assert.equal(keypointVelocityPixelsPerSecond(previous, 0, current, 100), 100);
    });

    it("throws for zero elapsed time", () => {
        const point = keypoint("wrist", 0, 0);
        assert.throws(() => keypointVelocityPixelsPerSecond(point, 500, point, 500));
    });

    it("throws for out-of-order timestamps", () => {
        const point = keypoint("wrist", 0, 0);
        assert.throws(() => keypointVelocityPixelsPerSecond(point, 500, point, 100));
    });
});
