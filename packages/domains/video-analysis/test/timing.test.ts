import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { calculatePhaseDurations } from "../src/calculations";
import type { ShootingPhaseSegment } from "../src/types";

describe("calculations/timing/calculatePhaseDurations", () => {
    it("computes the duration of each segment", () => {
        const segments: ShootingPhaseSegment[] = [
            { phase: "Stance", startTimeMilliseconds: 0, endTimeMilliseconds: 500 },
            { phase: "Drawing", startTimeMilliseconds: 500, endTimeMilliseconds: 1800 }
        ];

        const durations = calculatePhaseDurations(segments);

        assert.deepEqual(durations, [
            { phase: "Stance", durationMilliseconds: 500 },
            { phase: "Drawing", durationMilliseconds: 1300 }
        ]);
    });

    it("sums non-contiguous segments of the same phase", () => {
        const segments: ShootingPhaseSegment[] = [
            { phase: "Anchor", startTimeMilliseconds: 0, endTimeMilliseconds: 300 },
            { phase: "Release", startTimeMilliseconds: 300, endTimeMilliseconds: 350 },
            { phase: "Anchor", startTimeMilliseconds: 350, endTimeMilliseconds: 500 }
        ];

        const durations = calculatePhaseDurations(segments);

        const anchor = durations.find((d) => d.phase === "Anchor");
        assert.equal(anchor?.durationMilliseconds, 450);
    });

    it("returns an empty array for no segments", () => {
        assert.deepEqual(calculatePhaseDurations([]), []);
    });
});
