import type { PoseFrame } from "./pose";
import type { ShootingPhaseSegment } from "./phase";

/**
 * The full analysis of one recorded shot: the pose data tracked
 * across its video, and the shooting phases detected within it.
 */
export interface ShotSequenceAnalysis {

    videoIdentifier: string;

    frameRateFramesPerSecond: number;

    poseFrames: PoseFrame[];

    phaseSegments: ShootingPhaseSegment[];

}
