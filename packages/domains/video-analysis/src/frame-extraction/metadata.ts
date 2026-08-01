import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import type { VideoMetadata } from "../types";

/**
 * Both ffmpeg-static and ffprobe-static bundle a real ffmpeg/ffprobe
 * binary as an npm dependency (no separate system install required),
 * and fluent-ffmpeg needs to be told where to find them explicitly —
 * otherwise it falls back to searching the system PATH, which may not
 * have them at all.
 *
 * ffmpeg-static's exported path can be null on an unsupported
 * platform/architecture (see its own index.js) — in that case we
 * deliberately leave fluent-ffmpeg's default PATH lookup in place
 * rather than pointing it at a null path.
 */
if (ffmpegPath !== null) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Reads a video file's dimensions, frame rate and duration via
 * ffprobe. This is raw, measured data about the file itself (ADR-003),
 * not something this package calculates.
 */
export async function readVideoMetadata(videoFilePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoFilePath, (error, data) => {
            if (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
                return;
            }

            const videoStream = data.streams.find(
                (stream) => stream.codec_type === "video"
            );

            if (!videoStream || videoStream.width == null || videoStream.height == null) {
                reject(
                    new Error(
                        `No video stream with known dimensions found in '${videoFilePath}'`
                    )
                );
                return;
            }

            let frameRateFramesPerSecond: number;
            try {
                frameRateFramesPerSecond = parseFrameRate(
                    videoStream.avg_frame_rate ?? videoStream.r_frame_rate
                );
            } catch (parseError) {
                reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
                return;
            }

            resolve({
                widthPixels: videoStream.width,
                heightPixels: videoStream.height,
                frameRateFramesPerSecond,
                durationSeconds: Number(data.format.duration ?? 0)
            });
        });
    });
}

/**
 * ffprobe reports frame rate as a rational string (e.g. "30000/1001"
 * for 29.97 fps NTSC, or "25/1" for a plain 25 fps), not a decimal
 * number, since video frame rates are frequently non-integer ratios.
 */
export function parseFrameRate(rateString: string | undefined): number {
    if (!rateString) {
        throw new Error("ffprobe did not report a frame rate for this video stream");
    }

    const parts = rateString.split("/");
    const numerator = Number(parts[0]);
    const denominator = parts.length > 1 ? Number(parts[1]) : 1;

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        throw new Error(`Could not parse frame rate string '${rateString}'`);
    }

    return numerator / denominator;
}
