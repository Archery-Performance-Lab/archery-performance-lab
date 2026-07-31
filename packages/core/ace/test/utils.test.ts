import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    square,
    cube,
    clamp,
    round,
    grainsToGrams,
    gramsToKilograms,
    inchesToMeters,
    millimetersToMeters,
    poundsForceToNewtons
} from "../src/utils";

describe("utils/math", () => {
    it("square", () => {
        assert.equal(square(4), 16);
        assert.equal(square(-3), 9);
    });

    it("cube", () => {
        assert.equal(cube(3), 27);
        assert.equal(cube(-2), -8);
    });

    it("clamp", () => {
        assert.equal(clamp(5, 0, 10), 5);
        assert.equal(clamp(-5, 0, 10), 0);
        assert.equal(clamp(15, 0, 10), 10);
    });

    it("round", () => {
        assert.equal(round(1.2345, 2), 1.23);
        assert.equal(round(1.2355, 2), 1.24);
        assert.equal(round(1.2345), 1.23);
    });
});

describe("utils/conversions", () => {
    it("grainsToGrams matches the standard grain definition", () => {
        // 1 grain = 0.06479891 g exactly (international standard)
        assert.ok(Math.abs(grainsToGrams(1) - 0.06479891) < 1e-9);
        assert.ok(Math.abs(grainsToGrams(350) - 22.679619) < 1e-6);
    });

    it("gramsToKilograms", () => {
        assert.equal(gramsToKilograms(1000), 1);
        assert.equal(gramsToKilograms(22.68), 0.02268);
    });

    it("inchesToMeters", () => {
        assert.ok(Math.abs(inchesToMeters(1) - 0.0254) < 1e-12);
        assert.ok(Math.abs(inchesToMeters(28) - 0.7112) < 1e-9);
    });

    it("millimetersToMeters", () => {
        assert.equal(millimetersToMeters(1000), 1);
        assert.equal(millimetersToMeters(5.7), 0.0057);
    });

    it("poundsForceToNewtons matches the standard pound-force definition", () => {
        // 1 lbf = 4.4482216152605 N exactly (international standard)
        assert.ok(Math.abs(poundsForceToNewtons(1) - 4.4482216152605) < 1e-9);
        assert.ok(Math.abs(poundsForceToNewtons(40) - 177.9288646) < 1e-6);
    });
});
