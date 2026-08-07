/**
 * Which postural check a metric measures. The first six were ported
 * from a real, working reference implementation — a third-party
 * browser tool ("Archery Posture Tracker", ghiggo.altervista.org/posture)
 * whose client-side source was read directly, not guessed at from
 * watching a screen recording. `footStanceAngle` is a later, real
 * extension beyond that port (see its own doc comment on
 * DEFAULT_POSTURE_METRICS below for where its default range comes
 * from). See analyze.ts for exactly which keypoints and geometry
 * primitives compute each one.
 */
export type PostureMetricId =
    | "shoulderLevel"
    | "bowArmElbow"
    | "drawArmElbow"
    | "headTilt"
    | "torsoVerticality"
    | "hipLevel"
    | "footStanceAngle";

export type PostureMetricStatus = "ok" | "warning" | "outOfRange";

/**
 * A metric's acceptable ranges, in degrees. `idealRangeDegrees` is a
 * stricter sub-range that should sit inside `warnRangeDegrees` (though
 * this is not enforced — the reference implementation's own defaults
 * below have ranges that touch rather than nest in a couple of cases,
 * and evaluatePostureMetric() checks `ideal` before `warn` regardless
 * of how they overlap).
 *
 * Either range is `null` when no default exists yet for a metric —
 * not currently the case for any entry in DEFAULT_POSTURE_METRICS
 * below (every metric, including `footStanceAngle`, now ships with
 * both ranges set), but still a real, live state: a coach can clear a
 * range in posture-video-player.html's "Soglie" panel, and any custom
 * metric added later without a source to copy a default from should
 * use it too, rather than inventing numbers (see CLAUDE.md).
 * `evaluatePostureMetric()` returns `null` for a metric whose
 * definition has a `null` range — the raw angle is still computed and
 * shown, it is just not classified until a coach captures a real
 * range from a position they trust (the "Cattura come ideale"
 * mechanism, see posture-video-player.html).
 */
export interface PostureMetricDefinition {
    id: PostureMetricId;
    name: string;
    idealRangeDegrees: [number, number] | null;
    warnRangeDegrees: [number, number] | null;
}

/**
 * Starting ranges, originally copied as-is from
 * ghiggo.altervista.org/posture's `DEFAULT_METRICS` (its source is
 * plain, unminified client-side JS — these numbers were read directly
 * from it, not re-derived or guessed). They are a real, working
 * starting point from a tool apparently used successfully in practice,
 * but they were not calibrated against any footage in THIS project,
 * and that reference tool itself treats them as a per-archer starting
 * point, not a fixed truth: its "Cattura" (capture) feature lets a
 * coach overwrite these with a range built from an archer's own good
 * position. Whoever consumes PostureMetricDefinition[] here should
 * offer the same override, not treat DEFAULT_POSTURE_METRICS as
 * validated for Tommaso or any other specific archer. `drawArmElbow`
 * no longer matches ghiggo's original values — its own doc comment
 * below explains the direct-request override.
 */
export const DEFAULT_POSTURE_METRICS: PostureMetricDefinition[] = [
    { id: "shoulderLevel", name: "Allineamento spalle", idealRangeDegrees: [0, 10], warnRangeDegrees: [10, 20] },
    { id: "bowArmElbow", name: "Gomito braccio arco", idealRangeDegrees: [160, 180], warnRangeDegrees: [145, 160] },
    /**
     * idealRangeDegrees overridden from ghiggo's original [25, 40] to
     * [1, 15] on direct request — no longer the ported reference
     * value. warnRangeDegrees was not separately specified, so (same
     * convention as footStanceAngle above) it defaults to ±12° around
     * the new ideal range's own center (8°, giving [-4, 20]) rather
     * than keeping the old warn range, which was built around the
     * previous ideal and would no longer make sense next to this one
     * (e.g. a value like 0.5°, just below the new ideal, would jump
     * straight to outOfRange with no warning cushion below it).
     */
    { id: "drawArmElbow", name: "Gomito braccio corda", idealRangeDegrees: [1, 15], warnRangeDegrees: [-4, 20] },
    { id: "headTilt", name: "Inclinazione testa", idealRangeDegrees: [0, 15], warnRangeDegrees: [15, 25] },
    { id: "torsoVerticality", name: "Verticalità busto", idealRangeDegrees: [0, 5], warnRangeDegrees: [5, 12] },
    { id: "hipLevel", name: "Livellamento bacino", idealRangeDegrees: [0, 8], warnRangeDegrees: [8, 15] },
    /**
     * Angle between the feet line (left_heel↔right_heel) and the hip
     * line (left_hip↔right_hip) — see analyze.ts. Not part of the
     * ghiggo port: added directly on request to measure stance
     * "opening" relative to the pelvis. Unlike the six ranges above
     * (copied from ghiggo's tool), `idealRangeDegrees` here is a
     * direct request ([-2.5, 4.0]), not ported from any reference
     * implementation. `warnRangeDegrees` was not separately specified
     * — set to ±12° around the ideal range's own center (0.75°, so
     * [-11.25, 12.75]), the same tolerance
     * posture-video-player.html's "Cattura come ideale" already uses
     * when building a warn range around a captured value, applied here
     * to a given range's midpoint rather than a single captured point.
     * Still just a starting point, not validated for any specific
     * archer — a coach can recalibrate via "Cattura come ideale" the
     * same as any other metric.
     */
    {
        id: "footStanceAngle",
        name: "Apertura piedi rispetto al bacino",
        idealRangeDegrees: [-2.5, 4.0],
        warnRangeDegrees: [-11.25, 12.75]
    }
];

/**
 * Classifies a measured value against a metric's configured ranges.
 * `ideal` is checked first, so a value inside both ranges (possible
 * when they touch rather than nest, as a couple of
 * DEFAULT_POSTURE_METRICS entries do at their boundary) counts as
 * `ok`, not `warning`.
 *
 * Returns `null` — "not yet classifiable", not "out of range" — when
 * the definition has no `idealRangeDegrees`/`warnRangeDegrees` set
 * (see footStanceAngle in DEFAULT_POSTURE_METRICS above).
 */
export function evaluatePostureMetric(
    valueDegrees: number,
    definition: PostureMetricDefinition
): PostureMetricStatus | null {
    if (!definition.idealRangeDegrees || !definition.warnRangeDegrees) {
        return null;
    }

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

/**
 * A single metric's "how correct is this" score, 0-100, continuous
 * rather than the three-bucket ok/warning/outOfRange of
 * evaluatePostureMetric() — this is what the overall score gauge
 * (posture-video-player.html) averages across metrics. Caller must
 * already know `definition` has real ranges (both non-null); pass a
 * definition without them to evaluatePostureMetric()/this function's
 * caller-side null check, not here — this function is a pure numeric
 * helper, no null-forwarding.
 *
 * 100 inside idealRangeDegrees. Outside it, falls off linearly on
 * whichever side the value landed: 100 at the ideal edge down to 50 at
 * the warn edge on that same side, then continues that same slope for
 * one more warn-band-width past the warn edge, floored at 0 — so a
 * value already classified "outOfRange" by evaluatePostureMetric()
 * still visibly separates "just outside" from "way outside" instead
 * of an abrupt cliff to 0 right at the warn boundary. The falloff
 * scale is the warn band's own width on that side
 * (idealEdge-to-warnEdge distance) — reusing a range this project
 * already ported/calibrated per metric, not a separately invented
 * constant.
 *
 * This scoring curve itself (linear, 100→50→0 over two warn-band-
 * widths) is a UI presentation choice for the score gauge, not a
 * coaching threshold — unlike DEFAULT_POSTURE_METRICS' ranges, there
 * is no reference implementation to port a "correct" curve shape
 * from, so treat the gauge as a rough at-a-glance indicator, not a
 * validated score.
 */
export function computeMetricScorePercent(
    valueDegrees: number,
    definition: PostureMetricDefinition
): number {
    if (!definition.idealRangeDegrees || !definition.warnRangeDegrees) {
        throw new Error(
            `computeMetricScorePercent requires configured ranges — "${definition.id}" has none (check for null before calling)`
        );
    }

    const [idealMinDegrees, idealMaxDegrees] = definition.idealRangeDegrees;
    const [warnMinDegrees, warnMaxDegrees] = definition.warnRangeDegrees;

    if (valueDegrees >= idealMinDegrees && valueDegrees <= idealMaxDegrees) {
        return 100;
    }

    const isBelowIdeal = valueDegrees < idealMinDegrees;
    const idealEdgeDegrees = isBelowIdeal ? idealMinDegrees : idealMaxDegrees;
    const warnBandWidthDegrees = isBelowIdeal
        ? idealMinDegrees - warnMinDegrees
        : warnMaxDegrees - idealMaxDegrees;

    // No warn zone on this side (e.g. bowArmElbow's warn range only
    // covers "too bent", not "too straight" — 180° is already the
    // physical maximum) — no partial-credit band to interpolate
    // through, so this side just floors at 0 once outside ideal.
    if (warnBandWidthDegrees <= 0) {
        return 0;
    }

    const distancePastIdealDegrees = Math.abs(valueDegrees - idealEdgeDegrees);
    if (distancePastIdealDegrees <= warnBandWidthDegrees) {
        return 100 - 50 * (distancePastIdealDegrees / warnBandWidthDegrees);
    }

    const excessDegrees = distancePastIdealDegrees - warnBandWidthDegrees;
    return Math.max(0, 50 - 50 * (excessDegrees / warnBandWidthDegrees));
}

/**
 * Overall "how correct is this position" score, 0-100, for the score
 * gauge in posture-video-player.html: the plain average of
 * computeMetricScorePercent() across every metric that is actually
 * scorable in this frame.
 *
 * A metric is excluded from the average, not scored as 0, when either
 * its value is null (a required keypoint was missing/low-confidence —
 * e.g. legs out of frame in a close-up clip) or its definition has no
 * configured ranges yet (footStanceAngle before a coach captures one,
 * see DEFAULT_POSTURE_METRICS). Counting a genuinely unmeasurable
 * metric as "wrong" would make the gauge punish missing camera
 * coverage the same as an actual bad position — two very different
 * situations. Returns `null`, not 0, when nothing is scorable at all
 * (e.g. no keypoints detected this frame) — a real "cannot tell", the
 * same convention PostureMetricResult already uses.
 *
 * `results` and `definitions` must correspond to the same
 * analyzePosture() call — matched here by metric `id`, not position,
 * since evaluatePostureMetric()'s classification and this function's
 * score need to agree on which ranges produced them.
 */
export function computePostureScorePercent(
    results: { id: PostureMetricId; valueDegrees: number | null }[],
    definitions: PostureMetricDefinition[]
): number | null {
    const scores: number[] = [];

    for (const result of results) {
        if (result.valueDegrees === null) {
            continue;
        }
        const definition = definitions.find((candidate) => candidate.id === result.id);
        if (!definition || !definition.idealRangeDegrees || !definition.warnRangeDegrees) {
            continue;
        }
        scores.push(computeMetricScorePercent(result.valueDegrees, definition));
    }

    if (scores.length === 0) {
        return null;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
