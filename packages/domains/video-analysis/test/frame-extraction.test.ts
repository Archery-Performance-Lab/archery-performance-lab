import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseFrameRate } from "../src/frame-extraction";

describe("frame-extraction/metadata/parseFrameRate", () => {
    it("parses a plain integer rate", () => {
        assert.equal(parseFrameRate("25/1"), 25);
    });

    it("parses a non-integer rational rate (NTSC 29.97 fps)", () => {
        const frameRate = parseFrameRate("30000/1001");
        assert.ok(Math.abs(frameRate - 29.97) < 0.01);
    });

    it("parses a bare number with no denominator", () => {
        assert.equal(parseFrameRate("24"), 24);
    });

    it("throws for an undefined rate string", () => {
        assert.throws(() => parseFrameRate(undefined));
    });

    it("throws for a zero denominator", () => {
        assert.throws(() => parseFrameRate("30/0"));
    });

    it("throws for a non-numeric rate string", () => {
        assert.throws(() => parseFrameRate("not-a-rate"));
    });
});
