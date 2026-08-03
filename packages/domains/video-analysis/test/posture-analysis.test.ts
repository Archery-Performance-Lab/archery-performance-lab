import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { analyzePosture, evaluatePostureMetric, DEFAULT_POSTURE_METRICS } from "../src/posture-analysis";
import type { PostureMetricId, PostureMetricResult } from "../src/posture-analysis";
import type { PoseFrame, PoseKeypoint } from "../src/types";

function getResult(results: PostureMetricResult[], id: PostureMetricId): PostureMetricResult {
    const result = results.find((r) => r.id === id);
    if (!result) {
        throw new Error(`No result for metric "${id}" — test setup bug`);
    }
    return result;
}

function keypoint(name: string, xPixels: number, yPixels: number, confidenceScore = 1): PoseKeypoint {
    return { name, xPixels, yPixels, confidenceScore };
}

describe("posture-analysis/metrics/evaluatePostureMetric", () => {
    const definition = DEFAULT_POSTURE_METRICS.find((m) => m.id === "shoulderLevel")!;

    it("returns ok inside the ideal range", () => {
        assert.equal(evaluatePostureMetric(5, definition), "ok");
    });

    it("returns warning inside the warn range but outside ideal", () => {
        assert.equal(evaluatePostureMetric(15, definition), "warning");
    });

    it("returns outOfRange outside both ranges", () => {
        assert.equal(evaluatePostureMetric(30, definition), "outOfRange");
    });
});

// A full, plausible frame for a right-handed archer at full draw,
// viewed from behind — the same viewing angle as the "Archery Posture
// Tracker" reference screen recording this module was ported from.
// Coordinates are not from a real detection, but are internally
// consistent (level shoulders/hips, a straight bow arm, a bent draw
// arm, a plumb torso) so each metric's expected value can be reasoned
// about by hand rather than just "some number came out".
function buildFrame(overrides: Partial<Record<string, PoseKeypoint>> = {}): PoseFrame {
    const keypoints: Record<string, PoseKeypoint> = {
        left_shoulder: keypoint("left_shoulder", 100, 200),
        right_shoulder: keypoint("right_shoulder", 200, 200),
        left_hip: keypoint("left_hip", 100, 350),
        right_hip: keypoint("right_hip", 200, 350),
        left_ear: keypoint("left_ear", 130, 150),
        right_ear: keypoint("right_ear", 170, 150),
        // Bow arm (left, for a right-handed drawSide): straight line
        // shoulder->elbow->wrist => 180°.
        left_elbow: keypoint("left_elbow", 50, 200),
        left_wrist: keypoint("left_wrist", 0, 200),
        // Draw arm (right): bent 90° at the elbow.
        right_elbow: keypoint("right_elbow", 200, 260),
        right_wrist: keypoint("right_wrist", 260, 260),
        ...overrides
    };

    return {
        timestampMilliseconds: 0,
        keypoints: Object.values(keypoints)
    };
}

describe("posture-analysis/analyze/analyzePosture", () => {
    it("computes all six metrics for a fully-visible frame", () => {
        const results = analyzePosture(buildFrame(), "right");

        assert.ok(Math.abs((getResult(results, "shoulderLevel").valueDegrees ?? NaN) - 0) < 1e-9);
        assert.equal(getResult(results, "shoulderLevel").status, "ok");

        assert.ok(Math.abs((getResult(results, "bowArmElbow").valueDegrees ?? NaN) - 180) < 1e-9);
        assert.equal(getResult(results, "bowArmElbow").status, "ok");

        // right_elbow at (200,260): ray to shoulder (200,200) points
        // straight up (0,-60); ray to wrist (260,260) points straight
        // right (60,0) — perpendicular, so 90°.
        assert.ok(Math.abs((getResult(results, "drawArmElbow").valueDegrees ?? NaN) - 90) < 1e-9);
        assert.equal(getResult(results, "drawArmElbow").status, "outOfRange");

        assert.ok(Math.abs((getResult(results, "headTilt").valueDegrees ?? NaN) - 0) < 1e-9);
        assert.equal(getResult(results, "headTilt").status, "ok");

        assert.ok(Math.abs((getResult(results, "hipLevel").valueDegrees ?? NaN) - 0) < 1e-9);
        assert.equal(getResult(results, "hipLevel").status, "ok");

        // mid_shoulder (150,200) directly above mid_hip (150,350): 0°.
        assert.ok(Math.abs((getResult(results, "torsoVerticality").valueDegrees ?? NaN) - 0) < 1e-9);
        assert.equal(getResult(results, "torsoVerticality").status, "ok");
    });

    it("swaps bow/draw arm assignment for the opposite drawSide", () => {
        // Same frame, but now treat "left" as the draw side: the
        // straight (180°) arm should be reported as bowArmElbow only
        // when it is NOT the draw side. With drawSide="left", the
        // straight arm (left) becomes drawArmElbow instead.
        const results = analyzePosture(buildFrame(), "left");

        assert.ok(Math.abs((getResult(results, "drawArmElbow").valueDegrees ?? NaN) - 180) < 1e-9);
        assert.ok(Math.abs((getResult(results, "bowArmElbow").valueDegrees ?? NaN) - 90) < 1e-9);
    });

    it("returns null value and status for a metric with a missing keypoint", () => {
        const frame = buildFrame();
        frame.keypoints = frame.keypoints.filter((k) => k.name !== "right_ear");

        const results = analyzePosture(frame, "right");
        const headTilt = results.find((r) => r.id === "headTilt")!;

        assert.equal(headTilt.valueDegrees, null);
        assert.equal(headTilt.status, null);
    });

    it("treats a low-confidence keypoint the same as a missing one", () => {
        const frame = buildFrame({
            right_ear: keypoint("right_ear", 170, 150, 0.2)
        });

        const results = analyzePosture(frame, "right");
        const headTilt = results.find((r) => r.id === "headTilt")!;

        assert.equal(headTilt.valueDegrees, null);
    });

    it("still computes unaffected metrics when one keypoint is missing", () => {
        const frame = buildFrame();
        frame.keypoints = frame.keypoints.filter((k) => k.name !== "right_ear");

        const results = analyzePosture(frame, "right");
        const shoulderLevel = results.find((r) => r.id === "shoulderLevel")!;

        assert.ok(Math.abs((shoulderLevel.valueDegrees ?? NaN) - 0) < 1e-9);
    });
});
