import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isValidStaticSpineMeasurement } from "../src/validations";

describe("validations/isValidStaticSpineMeasurement", () => {
    it("accepts a well-formed ASTM-F2031 measurement", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: 400
            }),
            true
        );
    });

    it("accepts a well-formed AMO-ATA measurement", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "AMO-ATA",
                deflectionThousandthsInch: 340
            }),
            true
        );
    });

    it("rejects an unrecognized standard", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                // @ts-expect-error deliberately invalid standard for the test
                standard: "SOME-OTHER-STANDARD",
                deflectionThousandthsInch: 400
            }),
            false
        );
    });

    it("rejects a non-positive deflection", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: 0
            }),
            false
        );
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: -10
            }),
            false
        );
    });

    it("rejects a non-finite deflection", () => {
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: NaN
            }),
            false
        );
        assert.equal(
            isValidStaticSpineMeasurement({
                standard: "ASTM-F2031",
                deflectionThousandthsInch: Infinity
            }),
            false
        );
    });
});
