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
