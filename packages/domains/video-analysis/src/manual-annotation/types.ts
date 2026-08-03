/**
 * A single point placed by a human on a still image — not detected by
 * BlazePose. No `confidenceScore`: a manually-placed point is either
 * there or it isn't; there is no partial-confidence concept for a
 * human click.
 *
 * Exists for cases pose estimation cannot (yet, or ever) cover
 * reliably — the motivating one being a real coaching check from
 * Filippo Clini's "Livello Avanzato per l'istruttore" manual that
 * needs a camera positioned directly above the archer, an angle
 * BlazePose's real-world accuracy has not been checked against (see
 * README.md). Rather than guess whether pose estimation would work
 * from that angle, this module lets a coach place the points
 * themselves — exactly how the manual's own reference photos were
 * annotated by hand — and only computes the geometry from there.
 */
export interface AnnotatedPoint {
    name: string;
    xPixels: number;
    yPixels: number;
}

/**
 * What to compute from a set of AnnotatedPoints, referenced by name
 * rather than by position in an array — so a caller (e.g. the
 * interactive annotation tool) can let a human name points however
 * makes sense for their photo ("mano_arco", "gomito_corda", "testa",
 * ...) instead of this module dictating fixed roles. Each request
 * carries its own `id` so results can be matched back to whatever
 * requested them (e.g. a specific line drawn in a UI).
 *
 * Deliberately generic — NOT hardcoded to the manual's specific
 * three-point triangle or its forearm/arrow line. The manual's check
 * is one specific combination of these primitives (an `angleAtJoint`
 * at the draw elbow, plus an `angleBetweenLines` for the forearm vs.
 * arrow alignment), not a reason to bake that one shape into the
 * type itself — a coach may want different points/checks depending
 * on what a given photo actually shows.
 */
export type AnnotatedAngleRequest =
    | {
          id: string;
          type: "angleAtJoint";
          firstPointName: string;
          jointPointName: string;
          secondPointName: string;
      }
    | {
          id: string;
          type: "angleFromHorizontal";
          firstPointName: string;
          secondPointName: string;
      }
    | {
          id: string;
          type: "tiltFromVertical";
          topPointName: string;
          bottomPointName: string;
      }
    | {
          id: string;
          type: "angleBetweenLines";
          firstLineStartPointName: string;
          firstLineEndPointName: string;
          secondLineStartPointName: string;
          secondLineEndPointName: string;
      }
    | {
          id: string;
          type: "distance";
          firstPointName: string;
          secondPointName: string;
      };

export interface AnnotatedAngleResult {
    id: string;
    type: AnnotatedAngleRequest["type"];

    /** Degrees for every type except "distance", which is pixels. */
    unit: "degrees" | "pixels";

    /**
     * null when `error` is set — a named point the request referenced
     * was not found among the supplied AnnotatedPoints, or two points
     * that must differ coincide. A malformed single request should
     * not prevent the rest of a batch from computing.
     */
    value: number | null;

    error: string | null;
}
