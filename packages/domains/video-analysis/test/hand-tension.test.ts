import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as tf from "@tensorflow/tfjs";

import { computeCropRegionAroundKeypoint, cropFrameRegion, computeHandTensionMetric } from "../src/hand-tension";
import type { PoseKeypoint } from "../src/types";

function keypoint(xPixels: number, yPixels: number): PoseKeypoint {
    return { name: "test_keypoint", xPixels, yPixels, confidenceScore: 1 };
}

describe("hand-tension/computeCropRegionAroundKeypoint", () => {
    it("centers a square region on the keypoint when there's room", () => {
        const region = computeCropRegionAroundKeypoint(keypoint(500, 400), 100, 1920, 1080);

        assert.deepEqual(region, {
            xPixels: 450,
            yPixels: 350,
            widthPixels: 100,
            heightPixels: 100
        });
    });

    it("clamps position (not size) when the keypoint is near the left/top edge", () => {
        const region = computeCropRegionAroundKeypoint(keypoint(10, 5), 100, 1920, 1080);

        // Ideal top-left would be (10 - 50, 5 - 50) = (-40, -45): clamped to 0.
        assert.deepEqual(region, {
            xPixels: 0,
            yPixels: 0,
            widthPixels: 100,
            heightPixels: 100
        });
    });

    it("clamps position (not size) when the keypoint is near the right/bottom edge", () => {
        const region = computeCropRegionAroundKeypoint(keypoint(1910, 1075), 100, 1920, 1080);

        // Ideal top-left would be (1860, 1025); clamped so the region
        // still fits: xPixels + widthPixels must not exceed 1920/1080.
        assert.deepEqual(region, {
            xPixels: 1820,
            yPixels: 980,
            widthPixels: 100,
            heightPixels: 100
        });
    });

    it("shrinks the region (not just clamps position) when sizePixels exceeds the frame", () => {
        const region = computeCropRegionAroundKeypoint(keypoint(50, 50), 500, 200, 150);

        assert.deepEqual(region, {
            xPixels: 0,
            yPixels: 0,
            widthPixels: 200,
            heightPixels: 150
        });
    });

    it("throws for a non-positive sizePixels", () => {
        assert.throws(() => computeCropRegionAroundKeypoint(keypoint(10, 10), 0, 100, 100));
    });

    it("throws for non-positive frame dimensions", () => {
        assert.throws(() => computeCropRegionAroundKeypoint(keypoint(10, 10), 10, 0, 100));
    });
});

describe("hand-tension/cropFrameRegion", () => {
    it("crops the requested rectangle out of a frame", () => {
        // A 4x4x1 frame where every pixel's value is (row*10 + col),
        // so the crop's contents can be checked exactly.
        const values: number[] = [];
        for (let row = 0; row < 4; row += 1) {
            for (let col = 0; col < 4; col += 1) {
                values.push(row * 10 + col);
            }
        }
        const frame = tf.tensor3d(values, [4, 4, 1]);

        const cropped = cropFrameRegion(frame, {
            xPixels: 1,
            yPixels: 1,
            widthPixels: 2,
            heightPixels: 2
        });

        assert.deepEqual(cropped.shape, [2, 2, 1]);
        assert.deepEqual(Array.from(cropped.dataSync()), [11, 12, 21, 22]);

        frame.dispose();
        cropped.dispose();
    });
});

describe("hand-tension/computeHandTensionMetric", () => {
    it("returns (near) zero variance for a perfectly uniform region", () => {
        const frame = tf.fill([5, 5, 1], 42) as unknown as tf.Tensor3D;

        const variance = computeHandTensionMetric(frame);

        assert.ok(Math.abs(variance) < 1e-6, `expected ~0, got ${variance}`);

        frame.dispose();
    });

    it("matches a hand-computed Laplacian variance for a single bright center pixel", () => {
        // A 5x5, single-channel image that is 0 everywhere except the
        // exact center (value 4). With a "valid" 3x3 convolution the
        // output is 3x3 (9 values); by hand, tracking which kernel
        // weight the center pixel lands on for each of the 9 output
        // positions, the Laplacian responses are:
        //   [0, 4, 0, 4, -16, 4, 0, 4, 0]
        // mean = 0 (they sum to zero), so variance = mean of squares:
        //   (0+16+0+16+256+16+0+16+0) / 9 = 320/9
        const values = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 4, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0
        ];
        const frame = tf.tensor3d(values, [5, 5, 1]);

        const variance = computeHandTensionMetric(frame);
        const expectedVariance = 320 / 9;

        assert.ok(
            Math.abs(variance - expectedVariance) < 1e-3,
            `expected ~${expectedVariance}, got ${variance}`
        );

        frame.dispose();
    });

    it("gives a 3-channel RGB region a variance consistent with its grayscale conversion", () => {
        // Same spatial pattern as the previous test, but replicated
        // across 3 channels with the standard 601 luma weights baked
        // in so the grayscale conversion collapses it back to exactly
        // the same single-channel image, and therefore the same
        // expected variance — this is checking the RGB path produces
        // the same real number as the already-verified 1-channel path,
        // not deriving a new expected value by hand.
        const pixelValue = (grayscaleValue: number): [number, number, number] => [
            grayscaleValue / 0.299,
            0,
            0
        ];
        // Simpler: put the entire luma value into the red channel
        // divided by its weight, and zero elsewhere, so
        // R*0.299 + G*0.587 + B*0.114 == grayscaleValue exactly.
        const grayscaleGrid = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 4, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0
        ];
        const rgbValues: number[] = [];
        for (const grayscaleValue of grayscaleGrid) {
            const [r, g, b] = pixelValue(grayscaleValue);
            rgbValues.push(r, g, b);
        }
        const frame = tf.tensor3d(rgbValues, [5, 5, 3]);

        const variance = computeHandTensionMetric(frame);
        const expectedVariance = 320 / 9;

        assert.ok(
            Math.abs(variance - expectedVariance) < 1e-2,
            `expected ~${expectedVariance}, got ${variance}`
        );

        frame.dispose();
    });

    it("throws for a region smaller than the 3x3 kernel", () => {
        const frame = tf.fill([2, 2, 1], 10) as unknown as tf.Tensor3D;

        assert.throws(() => computeHandTensionMetric(frame));

        frame.dispose();
    });
});
