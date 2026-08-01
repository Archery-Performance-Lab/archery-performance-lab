/**
 * Shooting Phase
 *
 * Reviewed and corrected against real coaching methodology (Tommaso
 * Franchini, FITARCO first-level coach, tessera 151218) — this is no
 * longer a guessed taxonomy. Compared to the original six-phase
 * placeholder, "Nocking" was dropped ("non influenza il gesto
 * dell'arciere" — it never affects the archer's technique and is
 * never evaluated), "Stance" was kept but widened in scope, and
 * "Aiming" / "Expansion" were added as their own phases rather than
 * folded into "Drawing" / "Release".
 *
 * Per phase:
 *
 * - Stance: full-body posture before the shot starts, from feet to
 *   head — foot and pelvis position, and head stability. The head
 *   must stay still throughout the whole shot: the string comes to
 *   meet the face at anchor, the archer does not move the head to
 *   meet the string.
 * - PreDraw: the moment that anticipates the actual draw, before any
 *   real string movement.
 * - Drawing: from the start of the pull to anchor. Evaluated on
 *   execution speed and movement fluidity.
 * - Anchor: the moment of contact under the chin — evaluated both for
 *   how well-executed vs. merely hinted the contact itself is, and
 *   for static alignment once reached: bow-arm shoulder height and
 *   scapula engagement, and a straight line from the grip hand
 *   through both shoulders to the string-arm elbow.
 * - Aiming: the time spent holding at anchor while bringing the sight
 *   aperture onto the gold — a real, separate phase at long distances
 *   (e.g. 70m), not instantaneous.
 * - Expansion: continued motion past anchor/aiming that draws the
 *   arrow tip through the clicker. Driven by string-arm scapula
 *   rotation, not by pulling the arm back further. Fingers on the
 *   string are meant to go inert (not actively open) once the clicker
 *   falls, letting the string push them open rather than releasing
 *   it — the bow arm keeps its position/push throughout.
 * - Release: the instant the string leaves the fingers, triggered by
 *   the clicker falling. Not directly observable from body pose alone
 *   — BlazePose tracks body landmarks, not the arrow tip or clicker.
 *   The primary detection signal is the clicker's sound on the
 *   video's audio track; when audio is unusable, this should fall
 *   back to inferring the moment from a sudden velocity increase in
 *   the string arm. Both are detection concerns for whatever consumes
 *   this type, not something the type itself encodes.
 * - FollowThrough: continued expansion after release, the string-hand
 *   sliding back along the neck, while the bow arm keeps its forward
 *   push so the bow kicks forward horizontally.
 *
 * Static alignment checks mentioned above (shoulder height, scapula
 * engagement, head stillness, grip-to-elbow alignment) are technique
 * quality metrics evaluated *within* a phase, not phase boundaries —
 * deliberately kept out of this type; they belong in whatever
 * technique-scoring model consumes phase segments later.
 */
export type ShootingPhase =
    | "Stance"
    | "PreDraw"
    | "Drawing"
    | "Anchor"
    | "Aiming"
    | "Expansion"
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
