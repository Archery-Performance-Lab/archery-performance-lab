/**
 * Metadata read from a video file's own container/stream headers via
 * ffprobe — not something this package measures or infers itself.
 *
 * frameRateFramesPerSecond comes from ffprobe's avg_frame_rate (falling
 * back to r_frame_rate), which is reported as a rational string like
 * "30000/1001" (NTSC) or "25/1", not a plain number — see
 * frame-extraction/metadata.ts for the parsing.
 */
export interface VideoMetadata {
    widthPixels: number;
    heightPixels: number;
    frameRateFramesPerSecond: number;
    durationSeconds: number;
}
