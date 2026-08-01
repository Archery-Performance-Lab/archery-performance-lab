import type { ShootingPhase, ShootingPhaseSegment } from "../../types";

/**
 * Total time spent in a given Shooting Phase across a shot sequence.
 */
export interface PhaseDuration {
    phase: ShootingPhase;
    durationMilliseconds: number;
}

/**
 * Timing Analysis
 *
 * Sums the duration of every detected segment for each phase. If a
 * phase appears in more than one non-contiguous segment (e.g. the
 * archer briefly lets down and re-draws), its durations are summed
 * rather than only the last segment being kept.
 *
 * This is pure post-processing over already-detected phase segments —
 * it does not itself detect phases from video, which requires the
 * pose-estimation integration noted in README.md.
 */
export function calculatePhaseDurations(
    segments: ShootingPhaseSegment[]
): PhaseDuration[] {

    const totalsByPhase = new Map<ShootingPhase, number>();

    for (const segment of segments) {
        const durationMilliseconds =
            segment.endTimeMilliseconds - segment.startTimeMilliseconds;

        totalsByPhase.set(
            segment.phase,
            (totalsByPhase.get(segment.phase) ?? 0) + durationMilliseconds
        );
    }

    return Array.from(totalsByPhase.entries()).map(
        ([phase, durationMilliseconds]) => ({ phase, durationMilliseconds })
    );
}
