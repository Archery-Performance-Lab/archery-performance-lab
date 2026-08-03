/**
 * Which postural check a metric measures. Six checks, ported from a
 * real, working reference implementation — a third-party browser tool
 * ("Archery Posture Tracker", ghiggo.altervista.org/posture) whose
 * client-side source was read directly, not guessed at from watching
 * a screen recording. See analyze.ts for exactly which keypoints and
 * geometry primitives compute each one.
 */
export type PostureMetricId =
    | "shoulderLevel"
    | "bowArmElbow"
    | "drawArmElbow"
    | "headTilt"
    | "torsoVerticality"
    | "hipLevel";

export type PostureMetricStatus = "ok" | "warning" | "outOfRange";

/**
 * A metric's acceptable ranges, in degrees. `idealRangeDegrees` is a
 * stricter sub-range that should sit inside `warnRangeDegrees` (though
 * this is not enforced — the reference implementation's own defaults
 * below have ranges that touch rather than nest in a couple of cases,
 * and evaluatePostureMetric() checks `ideal` before `warn` regardless
 * of how they overlap).
 */
export interface PostureMetricDefinition {
    id: PostureMetricId;
    name: string;
    idealRangeDegrees: [number, number];
    warnRangeDegrees: [number, number];
}

/**
 * Starting ranges, copied as-is from ghiggo.altervista.org/posture's
 * `DEFAULT_METRICS` (its source is plain, unminified client-side JS —
 * these numbers were read directly from it, not re-derived or
 * guessed). They are a real, working starting point from a tool
 * apparently used successfully in practice, but they were not
 * calibrated against any footage in THIS project, and that reference
 * tool itself treats them as a per-archer starting point, not a fixed
 * truth: its "Cattura" (capture) feature lets a coach overwrite these
 * with a range built from an archer's own good position. Whoever
 * consumes PostureMetricDefinition[] here should offer the same
 * override, not treat DEFAULT_POSTURE_METRICS as validated for
 * Tommaso or any other specific archer.
 */
export const DEFAULT_POSTURE_METRICS: PostureMetricDefinition[] = [
    { id: "shoulderLevel", name: "Allineamento spalle", idealRangeDegrees: [0, 10], warnRangeDegrees: [10, 20] },
    { id: "bowArmElbow", name: "Gomito braccio arco", idealRangeDegrees: [160, 180], warnRangeDegrees: [145, 160] },
    { id: "drawArmElbow", name: "Gomito braccio corda", idealRangeDegrees: [25, 40], warnRangeDegrees: [10, 50] },
    { id: "headTilt", name: "Inclinazione testa", idealRangeDegrees: [0, 15], warnRangeDegrees: [15, 25] },
    { id: "torsoVerticality", name: "Verticalità busto", idealRangeDegrees: [0, 5], warnRangeDegrees: [5, 12] },
    { id: "hipLevel", name: "Livellamento bacino", idealRangeDegrees: [0, 8], warnRangeDegrees: [8, 15] }
];

/**
 * Classifies a measured value against a metric's configured ranges.
 * `ideal` is checked first, so a value inside both ranges (possible
 * when they touch rather than nest, as a couple of
 * DEFAULT_POSTURE_METRICS entries do at their boundary) counts as
 * `ok`, not `warning`.
 */
export function evaluatePostureMetric(
    valueDegrees: number,
    definition: PostureMetricDefinition
): PostureMetricStatus {
    const [idealMinDegrees, idealMaxDegrees] = definition.idealRangeDegrees;
    const [warnMinDegrees, warnMaxDegrees] = definition.warnRangeDegrees;

    if (valueDegrees >= idealMinDegrees && valueDegrees <= idealMaxDegrees) {
        return "ok";
    }
    if (valueDegrees >= warnMinDegrees && valueDegrees <= warnMaxDegrees) {
        return "warning";
    }
    return "outOfRange";
}
