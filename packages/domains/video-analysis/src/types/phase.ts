/**
 * Shooting Phase
 *
 * A first-pass, six-phase breakdown of the recurve shot cycle, chosen
 * because it is common ground across most coaching methodologies.
 * Some frameworks split this further (e.g. separating "set-up" /
 * "loading" / "transfer" within Draw-to-Anchor, or "expansion" within
 * Release) — this taxonomy is a starting point, not a settled
 * decision, and should be reviewed against your own coaching
 * methodology before it drives any real phase-detection logic. See
 * the correction on Dynamic Spine earlier in this project's history
 * for why domain accuracy here matters more than my getting something
 * shipped quickly.
 */
export type ShootingPhase =
    | "Stance"
    | "Nocking"
    | "Drawing"
    | "Anchor"
    | "Release"
    | "FollowThrough";

/**
 * One detected occurrence of a Shooting Phase within a video,
 * expressed as a time range rather than a single instant.
 */
export interface ShootingPhaseSegment {

    phase: ShootingPhase;

    startTimeMilliseconds: number;

    endTimeMilliseconds: number;

}
