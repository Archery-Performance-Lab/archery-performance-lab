/**
 * Shooting Phase
 *
 * Reviewed and corrected against real coaching methodology: first
 * with Tommaso Franchini (FITARCO first-level coach, tessera 151218),
 * then cross-checked against a written manual by Filippo Clini
 * (Italian national team coach, "Livello Avanzato per l'istruttore di
 * tiro con l'arco"). "Stance" was kept but widened in scope, and
 * "Aiming" / "Expansion" were added as their own phases rather than
 * folded into "Drawing" / "Release".
 *
 * "Nocking" went through a real back-and-forth worth recording: it
 * was dropped first ("non influenza il gesto dell'arciere" — it never
 * affects the archer's technique), then Clini's manual turned out to
 * treat it as a real checkpoint after all — not for a single "correct"
 * technique (there isn't one; every archer nocks differently), but for
 * *consistency*: an archer who nocks the arrow resting the bow on
 * their foot in training but changes that habit under competition
 * stress wastes energy and risks disturbing the rest of the shot.
 * Re-added on that basis. Practically, this means Nocking's quality
 * check is not "does it match a fixed form" the way Anchor's alignment
 * checks are, but "does it match *this archer's own* usual pattern" —
 * a comparison against their history, not a universal standard.
 *
 * "SetUp" was added directly from Clini's manual: a distinct moment
 * between Nocking and PreDraw, establishing the string hand's finger
 * position (first joint, all three fingers) and the bow hand's
 * position on the grip, before the arms are raised at all.
 *
 * Per phase:
 *
 * - Stance: full-body posture before the shot starts, from feet to
 *   head — foot and pelvis position, and head stability. The head
 *   must stay still throughout the whole shot: the string comes to
 *   meet the face at anchor, the archer does not move the head to
 *   meet the string.
 * - Nocking: placing the arrow on the string. No single correct form
 *   — evaluate consistency against the archer's own usual pattern,
 *   not against a fixed technique.
 * - SetUp: positioning the string-hand fingers (first joint, all
 *   three) and the bow hand on the grip, before raising the bow.
 * - PreDraw: the moment that anticipates the actual draw — raising
 *   the bow — before any real string movement.
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
 *
 *   That fallback is, in practice, all `phase-detection/` currently
 *   implements, and a real calibration video (an extreme close-up,
 *   slow-motion clip of Kim Woojin's Release) showed exactly why that
 *   is not enough on its own: with the draw-side hand close to the
 *   face for most of the clip, BlazePose's keypoint tracking got
 *   intermittently confused throughout, not just at the start,
 *   producing velocity noise with no clean ramp to detect — see
 *   README.md's calibration section. Audio-based detection is not
 *   implemented yet, but calibration videos going forward should
 *   specifically capture the clicker sound clearly, so that becomes
 *   possible.
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
    | "Nocking"
    | "SetUp"
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
