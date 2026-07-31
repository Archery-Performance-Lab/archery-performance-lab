/**
 * Uniform Motion — Distance
 *
 * distance = velocity * time
 */
export function distanceFromVelocityAndTime(
    velocityMetersPerSecond: number,
    timeSeconds: number
): number {
    return velocityMetersPerSecond * timeSeconds;
}

/**
 * Uniform Motion — Time
 *
 * time = distance / velocity
 */
export function timeFromDistanceAndVelocity(
    distanceMeters: number,
    velocityMetersPerSecond: number
): number {
    return distanceMeters / velocityMetersPerSecond;
}

/**
 * Uniform Motion — Average Velocity
 *
 * velocity = distance / time
 */
export function averageVelocity(
    distanceMeters: number,
    timeSeconds: number
): number {
    return distanceMeters / timeSeconds;
}

/**
 * Time of Flight under Quadratic Drag
 *
 * Analytic solution of dv/dt = -k * v^2 (motion with no forces other
 * than a drag deceleration proportional to velocity squared, and no
 * gravity term — see the limitation note below):
 *
 * velocity(t)  = v0 / (1 + k * v0 * t)
 * position(t)  = (1 / k) * ln(1 + k * v0 * t)
 *
 * Solving position(t) = distance for t gives:
 *
 * t = (e^(k * distance) - 1) / (k * v0)
 *
 * k is the drag deceleration constant from
 * physics/drag.ts dragDecelerationConstant().
 *
 * Limitation: this is a 1D model along the line of the shot. It
 * captures the arrow slowing down due to air resistance, but not the
 * vertical drop caused by gravity, so it is most accurate for flat,
 * close-to-level target distances rather than very long or arced
 * trajectories.
 */
export function timeOfFlightWithDrag(
    initialVelocityMetersPerSecond: number,
    distanceMeters: number,
    dragDecelerationConstantPerMeter: number
): number {
    return (
        (Math.exp(dragDecelerationConstantPerMeter * distanceMeters) - 1) /
        (dragDecelerationConstantPerMeter * initialVelocityMetersPerSecond)
    );
}

/**
 * Velocity after a given time under Quadratic Drag
 *
 * velocity(t) = v0 / (1 + k * v0 * t)
 */
export function velocityAfterTimeWithDrag(
    initialVelocityMetersPerSecond: number,
    timeSeconds: number,
    dragDecelerationConstantPerMeter: number
): number {
    return (
        initialVelocityMetersPerSecond /
        (1 +
            dragDecelerationConstantPerMeter *
                initialVelocityMetersPerSecond *
                timeSeconds)
    );
}
