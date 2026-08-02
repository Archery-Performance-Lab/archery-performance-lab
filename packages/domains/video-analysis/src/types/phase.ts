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
 *   the clicker falling.
 *
 *   Detection went through a real correction worth recording. The
 *   first idea was to key off the clicker itself — its sound on the
 *   audio track as the primary signal, a wrist-velocity spike as a
 *   fallback — and, from that, a requirement that future calibration
 *   videos capture audible clicker sound. Coach input corrected this:
 *   a real technical analysis is filmed from the side opposite the
 *   clicker (to see the archer's whole action — stance through
 *   follow-through), which means an instructor judging a Release in
 *   practice is not listening for the clicker or watching it fall at
 *   all. They watch the string-hand fingers. And what they're judging
 *   there is not merely timing but correctness: the finger movement
 *   must be involuntary — the string pushing the fingers open as
 *   scapula rotation continues past the clicker (see Expansion above)
 *   — not the archer voluntarily opening them, which is a real
 *   technical fault (plucking/gripping the release), not a clean one.
 *   So the clicker requirement is withdrawn; the real signal is visual
 *   observation of the string fingers, not audio.
 *
 *   What "watching the string fingers" actually means, in detail: the
 *   back of the hand relaxed, no tension; the string drawn between the
 *   first and second phalanx of the fingers used; at Release, the
 *   fingers must not open outward — they stay relaxed and slightly
 *   curved toward the neck, continuing to graze it through
 *   FollowThrough (see below). Two real draw techniques exist and
 *   should not be conflated: a three-finger draw (index, middle, ring)
 *   where the ring finger sometimes only rests on the string without
 *   actively pulling, and a genuine two-finger draw (index and middle
 *   only, ring not used at all) as a distinct technique some archers
 *   use. Neither is "the" correct one — which fingers an archer draws
 *   with is technique, not something to standardize on.
 *
 *   This clarified, not removed, the limitation noted above: BlazePose
 *   has a wrist landmark but no individual finger joints, so the
 *   finger-curl/direction part of this criterion is still not
 *   observable from the current pose model. But tension in the back of
 *   the hand turns out to *not* require finger-level tracking, or even
 *   contact, to observe — a tensed hand visibly shows its tendons
 *   standing out under the skin; a relaxed one doesn't. That is a
 *   visual, video-observable signal, just not a keypoint-position one:
 *   detecting it would mean image/texture analysis on the hand region
 *   (does this patch of skin show raised tendons), a genuinely
 *   different computer-vision technique from pose estimation, not an
 *   extension of it. Whether any of this — finger-specific pose
 *   tracking, tendon-visibility detection, or staying a
 *   human-judgment-only criterion for now — gets built is an open
 *   question, not decided here. Detection is a concern for whatever
 *   consumes this type, not something the type itself encodes.
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
