import {
    dragDecelerationConstant,
    stepTrajectoryRK4,
    type TrajectoryState
} from "../physics";
import { gramsToKilograms, millimetersToMeters, square } from "../utils";

/**
 * Arrow Ballistics — full trajectory under gravity and drag
 *
 * Extends calculations/time-of-flight (which only models the
 * horizontal slow-down from drag) with the vertical drop caused by
 * gravity, coupled together through the drag force, which depends on
 * total speed, not just the horizontal component.
 *
 * The trajectory is integrated step-by-step with RK4 (see
 * physics/trajectory.ts) from launch until the horizontal distance
 * reaches distanceMeters, then linearly interpolated between the last
 * two steps to reduce the discretization error from the fixed time
 * step.
 *
 * launchAngleDegrees lets the caller model an arrow aimed above the
 * horizontal (as archers do, to compensate for drop over distance);
 * pass 0 for a perfectly level shot.
 *
 * heightAtTargetMeters is measured relative to the horizontal line of
 * departure: negative means the arrow has dropped below it by that
 * point, positive means it is still above it.
 */

export interface BallisticsInput {
    distanceMeters: number;
    arrowVelocityMetersPerSecond: number;
    launchAngleDegrees: number;
    arrowMassGrams: number;
    shaftDiameterMillimeters: number;
    dragCoefficient: number;
    airDensityKilogramsPerCubicMeter?: number;
    timeStepSeconds?: number;
}

export interface BallisticsResult {
    timeOfFlightSeconds: number;
    heightAtTargetMeters: number;
    impactVelocityMetersPerSecond: number;
}

const DEFAULT_TIME_STEP_SECONDS = 0.001;

export function calculateBallisticTrajectory(
    input: BallisticsInput
): BallisticsResult {

    const arrowMassKilograms = gramsToKilograms(input.arrowMassGrams);
    const shaftRadiusMeters =
        millimetersToMeters(input.shaftDiameterMillimeters) / 2;
    const frontalAreaSquareMeters = Math.PI * square(shaftRadiusMeters);

    const dragConstant = dragDecelerationConstant(
        input.dragCoefficient,
        frontalAreaSquareMeters,
        arrowMassKilograms,
        input.airDensityKilogramsPerCubicMeter
    );

    const timeStepSeconds =
        input.timeStepSeconds ?? DEFAULT_TIME_STEP_SECONDS;

    const launchAngleRadians = (input.launchAngleDegrees * Math.PI) / 180;

    let currentState: TrajectoryState = {
        xMeters: 0,
        heightMeters: 0,
        velocityXMetersPerSecond:
            input.arrowVelocityMetersPerSecond * Math.cos(launchAngleRadians),
        velocityYMetersPerSecond:
            input.arrowVelocityMetersPerSecond * Math.sin(launchAngleRadians)
    };

    let previousState = currentState;
    let elapsedTimeSeconds = 0;

    while (currentState.xMeters < input.distanceMeters) {
        previousState = currentState;
        currentState = stepTrajectoryRK4(
            currentState,
            dragConstant,
            timeStepSeconds
        );
        elapsedTimeSeconds += timeStepSeconds;
    }

    const segmentFraction =
        (input.distanceMeters - previousState.xMeters) /
        (currentState.xMeters - previousState.xMeters);

    const heightAtTargetMeters =
        previousState.heightMeters +
        segmentFraction *
            (currentState.heightMeters - previousState.heightMeters);

    const velocityXAtTarget =
        previousState.velocityXMetersPerSecond +
        segmentFraction *
            (currentState.velocityXMetersPerSecond -
                previousState.velocityXMetersPerSecond);

    const velocityYAtTarget =
        previousState.velocityYMetersPerSecond +
        segmentFraction *
            (currentState.velocityYMetersPerSecond -
                previousState.velocityYMetersPerSecond);

    const timeOfFlightSeconds =
        elapsedTimeSeconds - timeStepSeconds + segmentFraction * timeStepSeconds;

    return {
        timeOfFlightSeconds,
        heightAtTargetMeters,
        impactVelocityMetersPerSecond: Math.sqrt(
            velocityXAtTarget * velocityXAtTarget +
                velocityYAtTarget * velocityYAtTarget
        )
    };
}
