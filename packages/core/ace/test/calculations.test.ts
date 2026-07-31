import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    calculateArrowMass,
    calculateFrontOfCenter,
    calculateArrowKineticEnergy,
    calculateArrowMomentum,
    estimateArrowSpeed,
    calculateTimeOfFlight,
    calculateRecommendedPlungerSpringTension
} from "../src/calculations";

describe("calculations/arrow-mass", () => {
    it("sums component masses and converts to kilograms", () => {
        const result = calculateArrowMass({
            shaftGrams: 12,
            pointGrams: 6.5,
            nockGrams: 0.5,
            vaneGrams: 1.2
        });
        assert.ok(Math.abs(result.totalGrams - 20.2) < 1e-9);
        assert.ok(Math.abs(result.totalKilograms - 0.0202) < 1e-9);
    });

    it("includes optional insert/pin mass when provided", () => {
        const withExtras = calculateArrowMass({
            shaftGrams: 12,
            pointGrams: 6.5,
            nockGrams: 0.5,
            vaneGrams: 1.2,
            insertGrams: 1,
            pinGrams: 0.3
        });
        assert.ok(Math.abs(withExtras.totalGrams - 21.5) < 1e-9);
    });
});

describe("calculations/foc", () => {
    it("returns 0% when the balance point is exactly at the midpoint", () => {
        const result = calculateFrontOfCenter({
            arrowLengthMillimeters: 650,
            balancePointFromNockMillimeters: 325
        });
        assert.equal(result.frontOfCenterPercent, 0);
    });

    it("returns a positive percentage when the balance point is forward of center", () => {
        const result = calculateFrontOfCenter({
            arrowLengthMillimeters: 650,
            balancePointFromNockMillimeters: 350
        });
        // (350 - 325) / 650 * 100
        assert.ok(Math.abs(result.frontOfCenterPercent - 3.8461538) < 1e-5);
    });
});

describe("calculations/kinetic-energy", () => {
    it("matches the manually verified reference scenario (350gr @ 85.3 m/s)", () => {
        const result = calculateArrowKineticEnergy({
            arrowMassGrams: 22.679619,
            arrowVelocityMetersPerSecond: 85.3
        });
        assert.ok(Math.abs(result.kineticEnergyJoules - 82.6) < 1);
    });
});

describe("calculations/momentum", () => {
    it("matches the manually verified reference scenario (350gr @ 85.3 m/s)", () => {
        const result = calculateArrowMomentum({
            arrowMassGrams: 22.679619,
            arrowVelocityMetersPerSecond: 85.3
        });
        assert.ok(Math.abs(result.momentumKilogramMetersPerSecond - 1.935) < 0.01);
    });
});

describe("calculations/arrow-speed", () => {
    it("matches the manually verified reference scenario (40lb / 28in / 350gr / 0.72 efficiency)", () => {
        const result = estimateArrowSpeed({
            drawWeightPounds: 40,
            drawLengthInches: 28,
            bowEfficiency: 0.72,
            arrowMassGrams: 22.679619
        });
        // Verified by hand: ~63.4 m/s (~208 fps)
        assert.ok(Math.abs(result.estimatedVelocityMetersPerSecond - 63.4) < 0.5);
    });

    it("a heavier arrow is estimated slower for the same bow", () => {
        const lighter = estimateArrowSpeed({
            drawWeightPounds: 40,
            drawLengthInches: 28,
            bowEfficiency: 0.72,
            arrowMassGrams: 20
        });
        const heavier = estimateArrowSpeed({
            drawWeightPounds: 40,
            drawLengthInches: 28,
            bowEfficiency: 0.72,
            arrowMassGrams: 30
        });
        assert.ok(
            heavier.estimatedVelocityMetersPerSecond <
                lighter.estimatedVelocityMetersPerSecond
        );
    });
});

describe("calculations/time-of-flight", () => {
    it("matches the manually verified 70m reference scenario", () => {
        const result = calculateTimeOfFlight({
            distanceMeters: 70,
            arrowVelocityMetersPerSecond: 63.4,
            arrowMassGrams: 22.679619,
            shaftDiameterMillimeters: 5.7,
            dragCoefficient: 1.5
        });
        assert.ok(Math.abs(result.timeOfFlightSeconds - 1.145) < 0.01);
        assert.ok(result.velocityAtTargetMetersPerSecond < 63.4);
    });

    it("flight takes longer than the no-drag estimate over the same distance", () => {
        const result = calculateTimeOfFlight({
            distanceMeters: 70,
            arrowVelocityMetersPerSecond: 63.4,
            arrowMassGrams: 22.679619,
            shaftDiameterMillimeters: 5.7,
            dragCoefficient: 1.5
        });
        const noDragTime = 70 / 63.4;
        assert.ok(result.timeOfFlightSeconds > noDragTime);
    });
});

describe("calculations/plunger-tuning", () => {
    it("applies the 10 g/lb domain rule", () => {
        const result = calculateRecommendedPlungerSpringTension({
            measuredDrawWeightPounds: 38
        });
        assert.equal(result.recommendedSpringTensionGrams, 380);
        assert.equal(result.referenceDeflectionMillimeters, 2);
    });
});
