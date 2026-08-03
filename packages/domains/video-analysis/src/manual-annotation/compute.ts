import {
    angleAtJointDegrees,
    angleFromHorizontalDegrees,
    tiltFromVerticalDegrees,
    angleBetweenLinesDegrees,
    distanceBetweenKeypoints
} from "../biomechanics";
import type { PoseKeypoint } from "../types";
import type { AnnotatedPoint, AnnotatedAngleRequest, AnnotatedAngleResult } from "./types";

function toKeypoint(point: AnnotatedPoint): PoseKeypoint {
    // Reuses the exact same, already-tested geometry primitives
    // BlazePose keypoints go through — a manually-placed point is
    // just a PoseKeypoint with full (1.0) confidence by construction,
    // since a human either placed it or didn't.
    return { name: point.name, xPixels: point.xPixels, yPixels: point.yPixels, confidenceScore: 1 };
}

function findPoint(points: AnnotatedPoint[], name: string): AnnotatedPoint | undefined {
    return points.find((point) => point.name === name);
}

function unitFor(type: AnnotatedAngleRequest["type"]): "degrees" | "pixels" {
    return type === "distance" ? "pixels" : "degrees";
}

function missingPointError(...names: (string | undefined)[]): string {
    return `No point named "${names.filter(Boolean)[0]}" among the supplied points`;
}

/**
 * Computes every requested angle/distance from a set of
 * human-placed points, matched by name. Each request is evaluated
 * independently: a request referencing a point name that is not in
 * `points` produces a result with `error` set instead of throwing,
 * so one mistyped point name (a real risk when names come from free
 * text in an interactive tool) does not discard every other result.
 *
 * This function does no interpretation of what the points/lines
 * *mean* (it does not know or care whether a point is "the grip
 * hand" or "the head") — see types.ts for why that is deliberate.
 */
export function computeAnnotatedAngles(
    points: AnnotatedPoint[],
    requests: AnnotatedAngleRequest[]
): AnnotatedAngleResult[] {
    return requests.map((request) => {
        const unit = unitFor(request.type);

        try {
            switch (request.type) {
                case "angleAtJoint": {
                    const first = findPoint(points, request.firstPointName);
                    const joint = findPoint(points, request.jointPointName);
                    const second = findPoint(points, request.secondPointName);
                    if (!first || !joint || !second) {
                        return errorResult(
                            request,
                            unit,
                            missingPointError(
                                !first ? request.firstPointName : undefined,
                                !joint ? request.jointPointName : undefined,
                                !second ? request.secondPointName : undefined
                            )
                        );
                    }
                    return okResult(
                        request,
                        unit,
                        angleAtJointDegrees(toKeypoint(first), toKeypoint(joint), toKeypoint(second))
                    );
                }

                case "angleFromHorizontal": {
                    const first = findPoint(points, request.firstPointName);
                    const second = findPoint(points, request.secondPointName);
                    if (!first || !second) {
                        return errorResult(
                            request,
                            unit,
                            missingPointError(
                                !first ? request.firstPointName : undefined,
                                !second ? request.secondPointName : undefined
                            )
                        );
                    }
                    return okResult(request, unit, angleFromHorizontalDegrees(toKeypoint(first), toKeypoint(second)));
                }

                case "tiltFromVertical": {
                    const top = findPoint(points, request.topPointName);
                    const bottom = findPoint(points, request.bottomPointName);
                    if (!top || !bottom) {
                        return errorResult(
                            request,
                            unit,
                            missingPointError(
                                !top ? request.topPointName : undefined,
                                !bottom ? request.bottomPointName : undefined
                            )
                        );
                    }
                    return okResult(request, unit, tiltFromVerticalDegrees(toKeypoint(top), toKeypoint(bottom)));
                }

                case "angleBetweenLines": {
                    const firstStart = findPoint(points, request.firstLineStartPointName);
                    const firstEnd = findPoint(points, request.firstLineEndPointName);
                    const secondStart = findPoint(points, request.secondLineStartPointName);
                    const secondEnd = findPoint(points, request.secondLineEndPointName);
                    if (!firstStart || !firstEnd || !secondStart || !secondEnd) {
                        return errorResult(
                            request,
                            unit,
                            missingPointError(
                                !firstStart ? request.firstLineStartPointName : undefined,
                                !firstEnd ? request.firstLineEndPointName : undefined,
                                !secondStart ? request.secondLineStartPointName : undefined,
                                !secondEnd ? request.secondLineEndPointName : undefined
                            )
                        );
                    }
                    return okResult(
                        request,
                        unit,
                        angleBetweenLinesDegrees(
                            toKeypoint(firstStart),
                            toKeypoint(firstEnd),
                            toKeypoint(secondStart),
                            toKeypoint(secondEnd)
                        )
                    );
                }

                case "distance": {
                    const first = findPoint(points, request.firstPointName);
                    const second = findPoint(points, request.secondPointName);
                    if (!first || !second) {
                        return errorResult(
                            request,
                            unit,
                            missingPointError(
                                !first ? request.firstPointName : undefined,
                                !second ? request.secondPointName : undefined
                            )
                        );
                    }
                    return okResult(request, unit, distanceBetweenKeypoints(toKeypoint(first), toKeypoint(second)));
                }
            }
        } catch (error) {
            // The underlying primitives throw when two points that
            // must differ coincide (a real "the coach clicked the
            // same spot twice" possibility in an interactive tool,
            // not just a theoretical edge case).
            return errorResult(request, unit, error instanceof Error ? error.message : String(error));
        }
    });
}

function okResult(request: AnnotatedAngleRequest, unit: "degrees" | "pixels", value: number): AnnotatedAngleResult {
    return { id: request.id, type: request.type, unit, value, error: null };
}

function errorResult(
    request: AnnotatedAngleRequest,
    unit: "degrees" | "pixels",
    error: string
): AnnotatedAngleResult {
    return { id: request.id, type: request.type, unit, value: null, error };
}
