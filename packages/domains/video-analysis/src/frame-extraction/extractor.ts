import ffmpeg from "fluent-ffmpeg";
import * as tf from "@tensorflow/tfjs";
import type { Tensor3D } from "@tensorflow/tfjs";
import { readVideoMetadata } from "./metadata";

const RGB_CHANNEL_COUNT = 3;

export interface FrameExtractionOptions {
    /**
     * Frames per second to sample from the video. Defaults to the
     * video's own frame rate (i.e. every encoded frame is extracted).
     * Pass a lower value to subsample — e.g. an archer's full shot
     * sequence rarely needs 60 pose samples per second of footage.
     */
    framesPerSecondToExtract?: number;
}

export interface ExtractedFrame {
    frame: Tensor3D;
    timestampMilliseconds: number;
}

/**
 * Decodes a video file into a stream of RGB pixel tensors, one per
 * extracted frame, ready to pass into estimatePoseFrame().
 *
 * Design: ffmpeg is asked to output raw, uncompressed rgb24 pixel data
 * to stdout (outputFormat('rawvideo')) rather than writing individual
 * PNG/JPEG files to disk. This means every frame's bytes can be turned
 * directly into a tf.tensor3d() with no separate image-decoding
 * library — which matters here because this package deliberately does
 * not depend on @tensorflow/tfjs-node (see pose-estimation/detector.ts
 * for why), so tf.node.decodeImage() is not available.
 *
 * ffmpeg-static/ffprobe-static ship a real ffmpeg/ffprobe binary per
 * platform, which is why frame-by-frame extraction was chosen over
 * lighter-weight alternatives (e.g. ffmpeg.wasm): a compiled binary
 * comfortably handles long real-world footage, where a WASM build
 * would be a meaningful bottleneck.
 *
 * This is an async generator, not a function returning an array of
 * frames: a video can run for minutes, and holding every decoded
 * frame as a tensor in memory at once does not scale. Callers consume
 * one frame at a time (e.g. `for await (const { frame } of
 * extractFramesFromVideo(path))`), so only one decoded frame needs to
 * exist in memory (plus whatever ffmpeg buffers internally) at a time.
 *
 * Callers are responsible for calling frame.dispose() once done with
 * each tensor (standard TensorFlow.js memory management — tensors are
 * not garbage collected automatically).
 */
export async function* extractFramesFromVideo(
    videoFilePath: string,
    options: FrameExtractionOptions = {}
): AsyncGenerator<ExtractedFrame> {
    const metadata = await readVideoMetadata(videoFilePath);
    const targetFrameRate =
        options.framesPerSecondToExtract ?? metadata.frameRateFramesPerSecond;
    const millisecondsBetweenExtractedFrames = 1000 / targetFrameRate;
    const frameByteSize = metadata.widthPixels * metadata.heightPixels * RGB_CHANNEL_COUNT;

    const command = ffmpeg(videoFilePath)
        .outputFormat("rawvideo")
        .fps(targetFrameRate)
        .outputOptions(["-pix_fmt", "rgb24"]);

    let commandError: Error | null = null;
    command.on("error", (error: Error) => {
        commandError = error;
    });

    // pipe() both starts the ffmpeg process and returns its stdout as
    // a readable stream (a Node PassThrough) — see fluent-ffmpeg's
    // recipes.js, `pipe = stream = function(...) { ...; this.run();
    // return stream; }`. Node's Readable streams implement
    // Symbol.asyncIterator directly, so `for await` can consume it
    // without any manual 'data'/'end' event wiring.
    const frameByteStream = command.pipe();

    let pendingBytes = Buffer.alloc(0);
    let frameIndex = 0;

    for await (const chunk of frameByteStream as AsyncIterable<Buffer>) {
        pendingBytes = Buffer.concat([pendingBytes, chunk]);

        while (pendingBytes.length >= frameByteSize) {
            const frameBytes = pendingBytes.subarray(0, frameByteSize);
            pendingBytes = pendingBytes.subarray(frameByteSize);

            const frame = tf.tensor3d(
                Uint8Array.from(frameBytes),
                [metadata.heightPixels, metadata.widthPixels, RGB_CHANNEL_COUNT],
                "int32"
            );

            yield {
                frame,
                timestampMilliseconds: frameIndex * millisecondsBetweenExtractedFrames
            };

            frameIndex += 1;
        }
    }

    // The output stream ends (naturally, via normal Node stream
    // piping) whether ffmpeg succeeded or failed — fluent-ffmpeg only
    // emits 'error' on the command object, not on the piped stream
    // itself (confirmed by reading processor.js), so a failed run
    // would otherwise look like a video that simply produced fewer
    // frames than expected instead of surfacing the real error.
    if (commandError) {
        throw commandError;
    }
}
