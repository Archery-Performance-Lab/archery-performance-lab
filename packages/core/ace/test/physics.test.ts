import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    force,
    calculateWeightForce,
    dragForce,
    dragDecelerationConstant,
    distanceFromVelocityAndTime,
    timeFromDistanceAndVelocity,
    averageVelocity,
    timeOfFlightWithDrag,
    velocityAfterTimeWithDrag,
    kineticEnergy,
    storedElasticEnergy,
    momentum,
    stepTrajectoryRK4
} from "../src/physics";
import { GRAVITY } from "../src/constants";

describe("physics/force", () => {
    it("force = mass * acceleration", () => {
        assert.equal(force(2, 3), 6);
    });

    it("calculateWeightForce uses standard gravity", () => {
        // 1 kg at standard gravity ~ 9.80665 N
        assert.ok(Math.abs(calculateWeightForce(1) - GRAVITY) < 1e-12);
        assert.ok(Math.abs(calculateWeightForce(0.02268) - 0.02268 * GRAVITY) < 1e-9);
    });
});

describe("physics/motion", () => {
    it("uniform motion relationships are self-consistent", () => {
        assert.equal(distanceFromVelocityAndTime(10, 5), 50);
        assert.equal(timeFromDistanceAndVelocity(50, 10), 5);
        assert.equal(averageVelocity(50, 5), 10);
    });

    it("timeOfFlightWithDrag reduces to distance/velocity as drag approaches zero", () => {
        const distance = 70;
        const v0 = 63.4;
        const almostNoDrag = 1e-9;
        const t = timeOfFlightWithDrag(v0, distance, almostNoDrag);
        assert.ok(Math.abs(t - distance / v0) < 1e-6);
    });

    it("velocityAfterTimeWithDrag never increases speed", () => {
        const v0 = 60;
        const k = 0.001;
        const vAfter = velocityAfterTimeWithDrag(v0, 1, k);
        assert.ok(vAfter < v0);
        assert.ok(vAfter > 0);
    });
});

describe("physics/drag", () => {
    it("dragForce scales with velocity squared", () => {
        const f1 = dragForce(10, 1.5, 0.0001, 1.225);
        const f2 = dragForce(20, 1.5, 0.0001, 1.225);
        // doubling velocity should roughly quadruple the force
        assert.ok(Math.abs(f2 / f1 - 4) < 1e-9);
    });

    it("dragDecelerationConstant matches dragForce/(mass*speed^2)", () => {
        const cd = 1.5;
        const area = 0.0001;
        const mass = 0.0227;
        const airDensity = 1.225;
        const k = dragDecelerationConstant(cd, area, mass, airDensity);
        const speed = 60;
        const expectedForce = k * speed * speed * mass;
        assert.ok(
            Math.abs(expectedForce - dragForce(speed, cd, area, airDensity)) < 1e-9
        );
    });
});

describe("physics/energy and momentum", () => {
    it("kineticEnergy = 0.5 * m * v^2", () => {
        assert.equal(kineticEnergy(2, 10), 100);
    });

    it("storedElasticEnergy = 0.5 * F * x", () => {
        assert.equal(storedElasticEnergy(100, 0.5), 25);
    });

    it("momentum = m * v", () => {
        assert.equal(momentum(2, 10), 20);
    });
});

describe("physics/trajectory", () => {
    it("with zero drag, RK4 reduces to standard projectile motion", () => {
        // Known analytic case: x(t) = v0*t, height(t) = -0.5*g*t^2
        const v0 = 50;
        const dt = 0.0005;
        let state = {
            xMeters: 0,
            heightMeters: 0,
            velocityXMetersPerSecond: v0,
            velocityYMetersPerSecond: 0
        };

        let t = 0;
        const target = 1; // simulate 1 second of flight
        while (t < target) {
            state = stepTrajectoryRK4(state, 0, dt);
            t += dt;
        }

        const expectedX = v0 * t;
        const expectedHeight = -0.5 * GRAVITY * t * t;

        assert.ok(Math.abs(state.xMeters - expectedX) < 1e-6);
        assert.ok(Math.abs(state.heightMeters - expectedHeight) < 1e-3);
    });

    it("drag makes the arrow travel less far than with no drag, for the same time", () => {
        const withDrag = stepTrajectoryRK4(
            { xMeters: 0, heightMeters: 0, velocityXMetersPerSecond: 60, velocityYMetersPerSecond: 0 },
            0.002,
            0.5
        );
        const withoutDrag = stepTrajectoryRK4(
            { xMeters: 0, heightMeters: 0, velocityXMetersPerSecond: 60, velocityYMetersPerSecond: 0 },
            0,
            0.5
        );
        assert.ok(withDrag.xMeters < withoutDrag.xMeters);
    });
});
