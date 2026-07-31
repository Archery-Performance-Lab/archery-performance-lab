/**
 * Single shot information.
 */
export interface Shot {

    shotNumber: number;

    distanceMeters: number;

    score: number;

    xCoordinateMillimeters: number;

    yCoordinateMillimeters: number;

    arrowVelocityMetersPerSecond?: number;

    flightTimeSeconds?: number;

}