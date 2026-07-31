import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { calculateBallisticTrajectory } from "../src/ballistics";

describe("ballistics/calculateBallisticTrajectory", () => {
    const baseInput = {
        distanceMeters: 70,
        arrowVelocityMetersPerSecond: 63.4,
        arrowMassGrams: 22.679619,
        shaftDiameterMillimeters: 5.7,
        dragCoefficient: 1.5
    };

    it("matches the manually verified level-shot reference scenario", () => {
        const result = calculateBallisticTrajectory({
            ...baseInput,
            launchAngleDegrees: 0
        });

        assert.ok(Math.abs(result.timeOfFlightSeconds - 1.145) < 0.01);
        assert.ok(Math.abs(result.heightAtTargetMeters - (-6.28)) < 0.1);
        assert.ok(result.impactVelocityMetersPerSecond < 63.4);
    });

    it("time of flight is nearly identical to the horizontal-only model at 0 degrees", () => {
        // Gravity should barely affect how long it takes to cover the
        // horizontal distance for a flat target-archery trajectory.
        const result = calculateBallisticTrajectory({
            ...baseInput,
            launchAngleDegrees: 0
        });
        const horizontalOnlyEstimateSeconds = 1.145;
        assert.ok(
            Math.abs(result.timeOfFlightSeconds - horizontalOnlyEstimateSeconds) <
                0.01
        );
    });

    it("aiming above horizontal reduces drop at the target", () => {
        const level = calculateBallisticTrajectory({
            ...baseInput,
            launchAngleDegrees: 0
        });
        const aimed = calculateBallisticTrajectory({
            ...baseInput,
            launchAngleDegrees: 3
        });

        // heightAtTargetMeters is negative when below the line of
        // departure, so "less drop" means a less negative value.
        assert.ok(aimed.heightAtTargetMeters > level.heightAtTargetMeters);
    });
});
