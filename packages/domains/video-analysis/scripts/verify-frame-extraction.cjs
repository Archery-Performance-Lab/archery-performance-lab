// Manual verification script — NOT part of the automated test suite.
//
// Why not a real automated test: it needs to actually spawn the real
// ffmpeg/ffprobe binaries and decode real video bytes, which is slow
// and platform-dependent (the ffmpeg-static/ffprobe-static binaries
// are architecture-specific — see the comment in
// src/pose-estimation/detector.ts for the same reasoning applied to
// the pose detector). The pure logic (parseFrameRate) already has
// real automated tests in test/frame-extraction.test.ts.
//
// This script is self-contained: it first asks ffmpeg to generate a
// tiny synthetic test video (a few seconds of a generated test
// pattern, via ffmpeg's built-in 'lavfi testsrc' source), so no
// separate video file is needed to run it.
//
// Run from packages/domains/video-analysis (compile the test build
// first — dist/ from a plain `pnpm build` uses "Bundler" module
// resolution, meant for a future bundler, and isn't directly runnable
// by plain Node; dist-test/ uses NodeNext/CommonJS, which is):
//   npx tsc -p tsconfig.test.json
//   node scripts/verify-frame-extraction.cjs

const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const ffmpegPath = require("ffmpeg-static");
const { readVideoMetadata, extractFramesFromVideo } = require("../dist-test/src/frame-extraction");

const TEST_VIDEO_DURATION_SECONDS = 2;
const TEST_VIDEO_SOURCE_FRAME_RATE = 10;
const TEST_VIDEO_WIDTH_PIXELS = 64;
const TEST_VIDEO_HEIGHT_PIXELS = 64;
const EXTRACTION_FRAME_RATE = 5;

async function main() {
    if (!ffmpegPath) {
        throw new Error(
            "ffmpeg-static returned no binary path for this platform/architecture."
        );
    }

    const testVideoPath = path.join(os.tmpdir(), `apl-verify-frame-extraction-${Date.now()}.mp4`);

    console.log(`Generating a synthetic test video at ${testVideoPath}...`);
    execFileSync(ffmpegPath, [
        "-f", "lavfi",
        "-i", `testsrc=duration=${TEST_VIDEO_DURATION_SECONDS}:size=${TEST_VIDEO_WIDTH_PIXELS}x${TEST_VIDEO_HEIGHT_PIXELS}:rate=${TEST_VIDEO_SOURCE_FRAME_RATE}`,
        "-y",
        testVideoPath
    ]);
    console.log("Test video generated.");

    try {
        console.log("Reading video metadata via ffprobe...");
        const metadata = await readVideoMetadata(testVideoPath);
        console.log("Metadata:", metadata);

        if (metadata.widthPixels !== TEST_VIDEO_WIDTH_PIXELS || metadata.heightPixels !== TEST_VIDEO_HEIGHT_PIXELS) {
            throw new Error(
                `Expected ${TEST_VIDEO_WIDTH_PIXELS}x${TEST_VIDEO_HEIGHT_PIXELS}, got ${metadata.widthPixels}x${metadata.heightPixels}`
            );
        }

        console.log(`Extracting frames at ${EXTRACTION_FRAME_RATE} fps...`);
        let frameCount = 0;
        for await (const { frame, timestampMilliseconds } of extractFramesFromVideo(testVideoPath, {
            framesPerSecondToExtract: EXTRACTION_FRAME_RATE
        })) {
            if (frameCount === 0) {
                console.log("First frame tensor shape:", frame.shape);
                console.log("First frame timestamp (ms):", timestampMilliseconds);
            }
            frame.dispose();
            frameCount += 1;
        }

        console.log(`Extracted ${frameCount} frame(s).`);

        const expectedFrameCountApprox = TEST_VIDEO_DURATION_SECONDS * EXTRACTION_FRAME_RATE;
        if (Math.abs(frameCount - expectedFrameCountApprox) > 2) {
            throw new Error(
                `Expected roughly ${expectedFrameCountApprox} frames, got ${frameCount}`
            );
        }

        console.log("OK: frame extraction pipeline runs end-to-end.");
    } finally {
        fs.unlinkSync(testVideoPath);
    }
}

main().catch((error) => {
    console.error("Verification failed:", error);
    process.exitCode = 1;
});
