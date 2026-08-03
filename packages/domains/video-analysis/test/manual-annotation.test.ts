import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeAnnotatedAngles } from "../src/manual-annotation";
import type { AnnotatedPoint, AnnotatedAngleRequest } from "../src/manual-annotation";

function point(name: string, xPixels: number, yPixels: number): AnnotatedPoint {
    return { name, xPixels, yPixels };
}

describe("manual-annotation/compute/computeAnnotatedAngles", () => {
    it("computes an angleAtJoint request", () => {
        const points: AnnotatedPoint[] = [
            point("mano_arco", 0, 0),
            point("gomito_corda", 10, 0),
            point("testa", 10, 10)
        ];
        const requests: AnnotatedAngleRequest[] = [
            {
                id: "elbow",
                type: "angleAtJoint",
                firstPointName: "mano_arco",
                jointPointName: "gomito_corda",
                secondPointName: "testa"
            }
        ];

        const result = computeAnnotatedAngles(points, requests)[0]!;
        assert.equal(result.error, null);
        assert.equal(result.unit, "degrees");
        assert.ok(Math.abs((result.value ?? NaN) - 90) < 1e-9);
    });

    it("computes an angleFromHorizontal request", () => {
        const points: AnnotatedPoint[] = [point("a", 0, 0), point("b", 10, 10)];
        const requests: AnnotatedAngleRequest[] = [
            { id: "tilt", type: "angleFromHorizontal", firstPointName: "a", secondPointName: "b" }
        ];

        const result = computeAnnotatedAngles(points, requests)[0]!;
        assert.ok(Math.abs((result.value ?? NaN) - 45) < 1e-9);
    });

    it("computes a tiltFromVertical request", () => {
        const points: AnnotatedPoint[] = [point("top", 0, 0), point("bottom", 0, 100)];
        const requests: AnnotatedAngleRequest[] = [
            { id: "vert", type: "tiltFromVertical", topPointName: "top", bottomPointName: "bottom" }
        ];

        const result = computeAnnotatedAngles(points, requests)[0]!;
        assert.ok(Math.abs(result.value ?? NaN) < 1e-9);
    });

    it("computes an angleBetweenLines request (forearm vs. arrow alignment)", () => {
        const points: AnnotatedPoint[] = [
            point("mano_arco", 0, 0),
            point("testa", 100, 0),
            point("gomito_corda", 50, -30),
            point("polso_corda", 60, 0)
        ];
        const requests: AnnotatedAngleRequest[] = [
            {
                id: "forearm_vs_arrow",
                type: "angleBetweenLines",
                firstLineStartPointName: "mano_arco",
                firstLineEndPointName: "testa",
                secondLineStartPointName: "gomito_corda",
                secondLineEndPointName: "polso_corda"
            }
        ];

        const result = computeAnnotatedAngles(points, requests)[0]!;
        assert.equal(result.error, null);
        // Arrow line is horizontal (0,0)->(100,0); forearm line goes
        // from (50,-30) to (60,0): atan(30/10) ≈ 71.57°.
        assert.ok(Math.abs((result.value ?? NaN) - 71.565) < 1e-2);
    });

    it("computes a distance request in pixels", () => {
        const points: AnnotatedPoint[] = [point("a", 0, 0), point("b", 3, 4)];
        const requests: AnnotatedAngleRequest[] = [
            { id: "dist", type: "distance", firstPointName: "a", secondPointName: "b" }
        ];

        const result = computeAnnotatedAngles(points, requests)[0]!;
        assert.equal(result.unit, "pixels");
        assert.equal(result.value, 5);
    });

    it("returns an error result for a missing point name, without affecting other requests", () => {
        const points: AnnotatedPoint[] = [point("a", 0, 0), point("b", 10, 0)];
        const requests: AnnotatedAngleRequest[] = [
            { id: "bad", type: "angleFromHorizontal", firstPointName: "a", secondPointName: "does_not_exist" },
            { id: "good", type: "angleFromHorizontal", firstPointName: "a", secondPointName: "b" }
        ];

        const results = computeAnnotatedAngles(points, requests);
        const bad = results[0]!;
        const good = results[1]!;
        assert.equal(bad.value, null);
        assert.ok(bad.error && bad.error.includes("does_not_exist"));

        assert.equal(good.error, null);
        assert.ok(Math.abs(good.value ?? NaN) < 1e-9);
    });

    it("returns an error result instead of throwing when two required points coincide", () => {
        const points: AnnotatedPoint[] = [point("a", 5, 5), point("b", 5, 5)];
        const requests: AnnotatedAngleRequest[] = [
            { id: "coincident", type: "angleFromHorizontal", firstPointName: "a", secondPointName: "b" }
        ];

        const result = computeAnnotatedAngles(points, requests)[0]!;
        assert.equal(result.value, null);
        assert.ok(result.error);
    });

    it("returns an empty array for an empty request list", () => {
        assert.deepEqual(computeAnnotatedAngles([point("a", 0, 0)], []), []);
    });
});
