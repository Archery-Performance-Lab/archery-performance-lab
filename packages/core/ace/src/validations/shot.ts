import type { Shot } from "../types";

/**
 * Minimum and maximum score for a single arrow under World Archery
 * target scoring rules: 0 (a complete miss, "M") through 10 (the
 * innermost ring). This is a fixed rule of the sport, not an assumed
 * "typical" range.
 */
const MINIMUM_SCORE = 0;
const MAXIMUM_SCORE = 10;

/**
 * Validates a single Shot before it is accepted as Raw Data.
 *
 * x/yCoordinateMillimeters are not bounded here: their valid range
 * depends on the target face size, which is not part of the Shot
 * type, so no coordinate limit can be asserted without external
 * information.
 */
export function isValidShot(shot: Shot): boolean {

    const hasPositiveIntegerShotNumber =
        Number.isInteger(shot.shotNumber) && shot.shotNumber > 0;

    const hasPositiveFiniteDistance =
        Number.isFinite(shot.distanceMeters) && shot.distanceMeters > 0;

    const hasValidScore =
        Number.isFinite(shot.score) &&
        shot.score >= MINIMUM_SCORE &&
        shot.score <= MAXIMUM_SCORE;

    const hasFiniteCoordinates =
        Number.isFinite(shot.xCoordinateMillimeters) &&
        Number.isFinite(shot.yCoordinateMillimeters);

    const hasValidOptionalVelocity =
        shot.arrowVelocityMetersPerSecond === undefined ||
        (Number.isFinite(shot.arrowVelocityMetersPerSecond) &&
            shot.arrowVelocityMetersPerSecond > 0);

    const hasValidOptionalFlightTime =
        shot.flightTimeSeconds === undefined ||
        (Number.isFinite(shot.flightTimeSeconds) && shot.flightTimeSeconds > 0);

    return (
        hasPositiveIntegerShotNumber &&
        hasPositiveFiniteDistance &&
        hasValidScore &&
        hasFiniteCoordinates &&
        hasValidOptionalVelocity &&
        hasValidOptionalFlightTime
    );
}
