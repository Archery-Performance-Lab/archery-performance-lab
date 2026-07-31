import { GRAVITY } from "../constants";

/**
 * 2D trajectory state.
 *
 * heightMeters is measured relative to the horizontal line of
 * departure: positive means above it, negative means below it (i.e.
 * how far the arrow has dropped).
 */
export interface TrajectoryState {
    xMeters: number;
    heightMeters: number;
    velocityXMetersPerSecond: number;
    velocityYMetersPerSecond: number;
}

/**
 * Trajectory Acceleration (gravity + quadratic drag)
 *
 * accelerationX = -dragConstant * speed * velocityX
 * accelerationY = -GRAVITY - dragConstant * speed * velocityY
 *
 * speed = sqrt(velocityX^2 + velocityY^2)
 *
 * dragConstant is the drag deceleration constant from
 * physics/drag.ts dragDecelerationConstant(). Drag always opposes the
 * direction of travel, which is why both components are scaled by the
 * same (speed * dragConstant) factor.
 */
function trajectoryAcceleration(
    velocityXMetersPerSecond: number,
    velocityYMetersPerSecond: number,
    dragDecelerationConstantPerMeter: number
): {
    accelerationXMetersPerSecondSquared: number;
    accelerationYMetersPerSecondSquared: number;
} {
    const speedMetersPerSecond = Math.sqrt(
        velocityXMetersPerSecond * velocityXMetersPerSecond +
            velocityYMetersPerSecond * velocityYMetersPerSecond
    );

    return {
        accelerationXMetersPerSecondSquared:
            -dragDecelerationConstantPerMeter *
            speedMetersPerSecond *
            velocityXMetersPerSecond,
        accelerationYMetersPerSecondSquared:
            -GRAVITY -
            dragDecelerationConstantPerMeter *
                speedMetersPerSecond *
                velocityYMetersPerSecond
    };
}

function trajectoryDerivative(
    state: TrajectoryState,
    dragDecelerationConstantPerMeter: number
): TrajectoryState {
    const acceleration = trajectoryAcceleration(
        state.velocityXMetersPerSecond,
        state.velocityYMetersPerSecond,
        dragDecelerationConstantPerMeter
    );

    return {
        xMeters: state.velocityXMetersPerSecond,
        heightMeters: state.velocityYMetersPerSecond,
        velocityXMetersPerSecond:
            acceleration.accelerationXMetersPerSecondSquared,
        velocityYMetersPerSecond:
            acceleration.accelerationYMetersPerSecondSquared
    };
}

function addScaledState(
    base: TrajectoryState,
    delta: TrajectoryState,
    scale: number
): TrajectoryState {
    return {
        xMeters: base.xMeters + delta.xMeters * scale,
        heightMeters: base.heightMeters + delta.heightMeters * scale,
        velocityXMetersPerSecond:
            base.velocityXMetersPerSecond +
            delta.velocityXMetersPerSecond * scale,
        velocityYMetersPerSecond:
            base.velocityYMetersPerSecond +
            delta.velocityYMetersPerSecond * scale
    };
}

/**
 * Advances a trajectory state by one 4th-order Runge-Kutta (RK4) step.
 *
 * The coupled 2D system of gravity plus quadratic (v^2) drag has no
 * general closed-form solution — unlike the 1D drag-only case in
 * motion.ts, where the horizontal motion alone integrates to a simple
 * formula. RK4 is a standard, well-documented numerical method for
 * ordinary differential equations in exactly this situation.
 *
 * timeStepSeconds controls the trade-off between accuracy and
 * performance: smaller steps reduce discretization error at the cost
 * of more steps. It is not a physical constant, so it is left to the
 * caller (see calculations/ballistics/calculator.ts for the default
 * used there).
 */
export function stepTrajectoryRK4(
    state: TrajectoryState,
    dragDecelerationConstantPerMeter: number,
    timeStepSeconds: number
): TrajectoryState {

    const k1 = trajectoryDerivative(state, dragDecelerationConstantPerMeter);
    const k2 = trajectoryDerivative(
        addScaledState(state, k1, timeStepSeconds / 2),
        dragDecelerationConstantPerMeter
    );
    const k3 = trajectoryDerivative(
        addScaledState(state, k2, timeStepSeconds / 2),
        dragDecelerationConstantPerMeter
    );
    const k4 = trajectoryDerivative(
        addScaledState(state, k3, timeStepSeconds),
        dragDecelerationConstantPerMeter
    );

    return {
        xMeters:
            state.xMeters +
            (timeStepSeconds / 6) *
                (k1.xMeters + 2 * k2.xMeters + 2 * k3.xMeters + k4.xMeters),
        heightMeters:
            state.heightMeters +
            (timeStepSeconds / 6) *
                (k1.heightMeters +
                    2 * k2.heightMeters +
                    2 * k3.heightMeters +
                    k4.heightMeters),
        velocityXMetersPerSecond:
            state.velocityXMetersPerSecond +
            (timeStepSeconds / 6) *
                (k1.velocityXMetersPerSecond +
                    2 * k2.velocityXMetersPerSecond +
                    2 * k3.velocityXMetersPerSecond +
                    k4.velocityXMetersPerSecond),
        velocityYMetersPerSecond:
            state.velocityYMetersPerSecond +
            (timeStepSeconds / 6) *
                (k1.velocityYMetersPerSecond +
                    2 * k2.velocityYMetersPerSecond +
                    2 * k3.velocityYMetersPerSecond +
                    k4.velocityYMetersPerSecond)
    };
}
