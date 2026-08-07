import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    analyzePosture,
    evaluatePostureMetric,
    computeMetricScorePercent,
    computePostureScorePercent,
    DEFAULT_POSTURE_METRICS
} from "../src/posture-analysis";
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

    it("returns null for a metric with no configured ranges", () => {
        const uncalibratedDefinition = {
            id: "footStanceAngle" as PostureMetricId,
            name: "Test",
            idealRangeDegrees: null,
            warnRangeDegrees: null
        };
        assert.equal(evaluatePostureMetric(0, uncalibratedDefinition), null);
        assert.equal(evaluatePostureMetric(45, uncalibratedDefinition), null);
    });

    it("classifies footStanceAngle's own default range (a direct request, not ported from a reference tool)", () => {
        const footStanceDefinition = DEFAULT_POSTURE_METRICS.find((m) => m.id === "footStanceAngle")!;
        assert.deepEqual(footStanceDefinition.idealRangeDegrees, [-2.5, 4.0]);
        assert.deepEqual(footStanceDefinition.warnRangeDegrees, [-11.25, 12.75]);
        assert.equal(evaluatePostureMetric(0, footStanceDefinition), "ok");
        assert.equal(evaluatePostureMetric(10, footStanceDefinition), "warning");
        assert.equal(evaluatePostureMetric(20, footStanceDefinition), "outOfRange");
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
        // Feet: heel line parallel to the hip line above (both
        // horizontal) => footStanceAngle = 0°, a "square" stance.
        left_heel: keypoint("left_heel", 90, 500),
        right_heel: keypoint("right_heel", 210, 500),
        ...overrides
    };

    return {
        timestampMilliseconds: 0,
        keypoints: Object.values(keypoints)
    };
}

describe("posture-analysis/analyze/analyzePosture", () => {
    it("computes all seven metrics for a fully-visible frame", () => {
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

        // Heel line (90,500)->(210,500) is parallel to the hip line
        // (100,350)->(200,350): both horizontal, so 0° — inside
        // footStanceAngle's default ideal range [-2.5, 4.0] (see
        // metrics.ts), so "ok".
        assert.ok(Math.abs((getResult(results, "footStanceAngle").valueDegrees ?? NaN) - 0) < 1e-9);
        assert.equal(getResult(results, "footStanceAngle").status, "ok");
    });

    it("computes a non-zero footStanceAngle when the feet line is not parallel to the hip line", () => {
        // left_heel->right_heel = (100,-100): 45° from horizontal.
        // left_hip->right_hip (from buildFrame) is horizontal (0°).
        // angleBetweenLinesDegrees folds to the angle between the two
        // lines directly: 45°.
        const frame = buildFrame({
            left_heel: keypoint("left_heel", 100, 500),
            right_heel: keypoint("right_heel", 200, 400)
        });

        const results = analyzePosture(frame, "right");

        // 45° is outside both footStanceAngle's default ideal
        // ([-2.5, 4.0]) and warn ([-11.25, 12.75]) ranges.
        assert.ok(Math.abs((getResult(results, "footStanceAngle").valueDegrees ?? NaN) - 45) < 1e-9);
        assert.equal(getResult(results, "footStanceAngle").status, "outOfRange");
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

    it("returns null footStanceAngle when a heel keypoint is missing", () => {
        const frame = buildFrame();
        frame.keypoints = frame.keypoints.filter((k) => k.name !== "right_heel");

        const results = analyzePosture(frame, "right");

        assert.equal(getResult(results, "footStanceAngle").valueDegrees, null);
        assert.equal(getResult(results, "footStanceAngle").status, null);
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

describe("posture-analysis/metrics/computeMetricScorePercent", () => {
    // shoulderLevel: idealRangeDegrees [0, 10], warnRangeDegrees [10, 20]
    // — a one-sided range (angleFromHorizontalDegrees is never
    // negative), so only the "high" side of the falloff is reachable.
    const shoulderLevel = DEFAULT_POSTURE_METRICS.find((m) => m.id === "shoulderLevel")!;

    it("returns 100 inside the ideal range", () => {
        assert.equal(computeMetricScorePercent(5, shoulderLevel), 100);
        // Edges of idealRangeDegrees are inclusive, same as evaluatePostureMetric.
        assert.equal(computeMetricScorePercent(0, shoulderLevel), 100);
        assert.equal(computeMetricScorePercent(10, shoulderLevel), 100);
    });

    it("falls off linearly from 100 to 50 across the warn band", () => {
        // Halfway across the [10, 20] warn band: 100 - 50*(5/10) = 75.
        assert.ok(Math.abs(computeMetricScorePercent(15, shoulderLevel) - 75) < 1e-9);
    });

    it("reaches exactly 50 at the warn edge", () => {
        assert.ok(Math.abs(computeMetricScorePercent(20, shoulderLevel) - 50) < 1e-9);
    });

    it("reaches exactly 0 one warn-band-width past the warn edge, and floors there", () => {
        assert.ok(Math.abs(computeMetricScorePercent(30, shoulderLevel) - 0) < 1e-9);
        assert.equal(computeMetricScorePercent(60, shoulderLevel), 0);
    });

    it("handles a metric whose warn range sits BELOW the ideal range", () => {
        // bowArmElbow: idealRangeDegrees [160, 180], warnRangeDegrees
        // [145, 160] — warn band width on the low side is 160-145=15.
        const bowArmElbow = DEFAULT_POSTURE_METRICS.find((m) => m.id === "bowArmElbow")!;

        assert.equal(computeMetricScorePercent(170, bowArmElbow), 100);
        // 10 degrees below the ideal edge (160), 10/15 of the way to the warn edge.
        assert.ok(Math.abs(computeMetricScorePercent(150, bowArmElbow) - (100 - 50 * (10 / 15))) < 1e-9);
        assert.ok(Math.abs(computeMetricScorePercent(145, bowArmElbow) - 50) < 1e-9);
    });

    it("floors at 0 immediately on a side with no warn band at all", () => {
        // bowArmElbow's warnRangeDegrees only extends below idealMin —
        // there is no "too straight" warning zone above idealMax=180.
        const bowArmElbow = DEFAULT_POSTURE_METRICS.find((m) => m.id === "bowArmElbow")!;
        assert.equal(computeMetricScorePercent(190, bowArmElbow), 0);
    });

    it("throws for a definition with no configured ranges", () => {
        const uncalibratedDefinition = {
            id: "footStanceAngle" as PostureMetricId,
            name: "Test",
            idealRangeDegrees: null,
            warnRangeDegrees: null
        };
        assert.throws(() => computeMetricScorePercent(10, uncalibratedDefinition));
    });
});

describe("posture-analysis/metrics/computePostureScorePercent", () => {
    // A synthetic, deliberately-uncalibrated definition — every entry
    // in DEFAULT_POSTURE_METRICS now ships with real ranges (including
    // footStanceAngle, see metrics.ts), so the "excluded: no ranges"
    // case below needs its own definition rather than relying on one
    // from the shipped defaults.
    const uncalibratedDefinition = {
        id: "footStanceAngle" as PostureMetricId,
        name: "Test",
        idealRangeDegrees: null,
        warnRangeDegrees: null
    };

    it("averages scores only across metrics with both a value and configured ranges", () => {
        const shoulderLevel = DEFAULT_POSTURE_METRICS.find((m) => m.id === "shoulderLevel")!;
        const bowArmElbow = DEFAULT_POSTURE_METRICS.find((m) => m.id === "bowArmElbow")!;
        const headTilt = DEFAULT_POSTURE_METRICS.find((m) => m.id === "headTilt")!;
        const definitions = [shoulderLevel, bowArmElbow, uncalibratedDefinition, headTilt];

        const results = [
            { id: "shoulderLevel" as PostureMetricId, valueDegrees: 5 }, // score 100
            { id: "bowArmElbow" as PostureMetricId, valueDegrees: 150 }, // score 100 - 50*(10/15)
            { id: "footStanceAngle" as PostureMetricId, valueDegrees: 10 }, // excluded: no ranges
            { id: "headTilt" as PostureMetricId, valueDegrees: null } // excluded: no value
        ];

        const expectedAverage = (100 + (100 - 50 * (10 / 15))) / 2;
        const score = computePostureScorePercent(results, definitions);

        assert.ok(score !== null && Math.abs(score - expectedAverage) < 1e-9);
    });

    it("returns null when nothing is scorable", () => {
        const shoulderLevel = DEFAULT_POSTURE_METRICS.find((m) => m.id === "shoulderLevel")!;
        const definitions = [shoulderLevel, uncalibratedDefinition];

        const results: { id: PostureMetricId; valueDegrees: number | null }[] = [
            { id: "shoulderLevel", valueDegrees: null }, // excluded: no value
            { id: "footStanceAngle", valueDegrees: 10 } // excluded: no ranges
        ];

        assert.equal(computePostureScorePercent(results, definitions), null);
    });

    it("averages a real mixed frame (six metrics ideal, one deliberately not)", () => {
        const results = analyzePosture(buildFrame(), "right");
        // buildFrame()'s synthetic frame was designed so every ported
        // metric except drawArmElbow (deliberately bent 90°, outside
        // its own ideal AND warn range) reads "ok" — the aggregate
        // should land below 100 (drawArmElbow drags it down) but above
        // 0 (six of seven scorable metrics are still perfect).
        const score = computePostureScorePercent(results, DEFAULT_POSTURE_METRICS);
        assert.ok(score !== null && score > 0 && score < 100);
    });
});
