// Calibration helper — NOT part of the automated test suite.
//
// Runs pose estimation and analyzePosture() across an ENTIRE video —
// not one hand-picked frame — and writes every frame's keypoints and
// posture metrics to a single JSON file. Exists because picking one
// representative frame turned out to be the wrong approach entirely
// for reviewing an archer's technique on video: a real coach watches
// the whole action continuously, not one still image (this was
// pointed out directly after `inspect-posture.cjs`'s "pick a good
// timestamp" workflow proved impractical — see its README.md section).
// This script is the data-gathering half of that continuous-tracking
// approach; `tools/posture-video-player.html` is the other half, a
// standalone page that plays the original video back with a live
// skeleton/angle overlay built from this file's output — the same
// kind of experience as ghiggo.altervista.org/posture, but computed
// once up front by this project's own tested TypeScript pipeline
// rather than live in-browser.
//
// Deliberately does NOT apply the usual 300ms warmup-exclusion filter
// (see detect-phases.cjs/inspect-elbow-angle.cjs for that pattern):
// the point of a continuous viewer is to let a human see exactly
// where and how detection gets unstable, not to hide it behind a
// filter tuned for a different use case (automated phase detection).
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/build-posture-timeline.cjs [videoFilePath] [right|left] [framesPerSecondToExtract]
//
// Defaults to the slow-motion Kim Woojin video (the one this was
// built to review) at its own native frame rate (no subsampling) if
// framesPerSecondToExtract is omitted. A full-rate pass over a ~56s
// clip is several hundred to ~1,700 frames of real BlazePose
// inference — expect this to take a while (minutes, not seconds) and
// to produce a JSON file in the low single-digit megabytes; pass a
// lower framesPerSecondToExtract to trade detail for speed/size if
// that matters for a given video.

const fs = require("node:fs");
const path = require("node:path");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const { createPoseDetector, analyzeShotVideo, readVideoMetadata, analyzePosture } = require("../dist-test/src");

const CALIBRATION_FOLDER =
    process.env.APL_CALIBRATION_FOLDER || "/Users/luigifranchini/Development/apl-video-calibration";
const RAW_VIDEOS_FOLDER = path.join(CALIBRATION_FOLDER, "raw-videos");
const TIMELINE_FOLDER = path.join(CALIBRATION_FOLDER, "posture-timeline");

const DEFAULT_VIDEO_FILE_NAME =
    "Kim Woo Jin (KOR) Release - Slow Motion Archery Technique (Berlin World Cup 2018)_720p.mp4";

async function main() {
    // Same argument-parsing convention as inspect-posture.cjs (fixed
    // there after a real run failed on the real Mac — see CHANGELOG.md):
    // argv[2] is only a video path if it isn't "left"/"right".
    const explicitPath = process.argv[2] && !["left", "right"].includes(process.argv[2]) ? process.argv[2] : null;
    const drawSideArgument = explicitPath ? process.argv[3] : process.argv[2];
    const fpsArgument = explicitPath ? process.argv[4] : process.argv[3];

    const videoFilePath = explicitPath
        ? path.resolve(explicitPath)
        : path.join(RAW_VIDEOS_FOLDER, DEFAULT_VIDEO_FILE_NAME);
    const drawSide = drawSideArgument === "left" ? "left" : "right";
    const framesPerSecondToExtract = fpsArgument ? Number(fpsArgument) : undefined;

    if (!fs.existsSync(videoFilePath)) {
        console.error(`Video not found: ${videoFilePath}`);
        process.exitCode = 1;
        return;
    }

    fs.mkdirSync(TIMELINE_FOLDER, { recursive: true });

    console.log(`Reading metadata for ${path.basename(videoFilePath)}...`);
    const metadata = await readVideoMetadata(videoFilePath);
    console.log(
        `  ${metadata.widthPixels}x${metadata.heightPixels}, ${metadata.durationSeconds.toFixed(1)}s, ` +
            `${metadata.frameRateFramesPerSecond.toFixed(1)}fps (native)`
    );

    const effectiveFps = framesPerSecondToExtract ?? metadata.frameRateFramesPerSecond;
    const approximateFrameCount = Math.round(metadata.durationSeconds * effectiveFps);
    console.log(
        `Extracting at ${effectiveFps.toFixed(1)}fps — approximately ${approximateFrameCount} frames to process.`
    );

    console.log("Setting up WASM backend and BlazePose detector...");
    await tf.setBackend("wasm");
    await tf.ready();
    const detector = await createPoseDetector();
    console.log("Detector ready.\n");

    const frames = [];
    let processedCount = 0;
    const progressEveryFrames = 100;

    for await (const poseFrame of analyzeShotVideo(
        videoFilePath,
        detector,
        framesPerSecondToExtract ? { framesPerSecondToExtract } : {}
    )) {
        const postureResults = analyzePosture(poseFrame, drawSide);
        frames.push({
            timestampMilliseconds: poseFrame.timestampMilliseconds,
            keypoints: poseFrame.keypoints,
            postureResults
        });

        processedCount += 1;
        if (processedCount % progressEveryFrames === 0) {
            console.log(`  ...${processedCount} frames processed (t=${poseFrame.timestampMilliseconds.toFixed(0)}ms)`);
        }
    }

    console.log(`\nProcessed ${frames.length} frame(s) total.`);

    const timeline = {
        videoFileName: path.basename(videoFilePath),
        widthPixels: metadata.widthPixels,
        heightPixels: metadata.heightPixels,
        durationSeconds: metadata.durationSeconds,
        drawSide,
        frames
    };

    const videoBaseName = path.parse(videoFilePath).name;
    const outputPath = path.join(TIMELINE_FOLDER, `${videoBaseName}_timeline.json`);
    fs.writeFileSync(outputPath, JSON.stringify(timeline));

    const fileSizeMegabytes = fs.statSync(outputPath).size / (1024 * 1024);
    console.log(`Wrote ${outputPath} (${fileSizeMegabytes.toFixed(1)} MB).`);
    console.log(
        `\nOpen tools/posture-video-player.html in a browser, then select this JSON file ` +
            `together with the original video (${path.basename(videoFilePath)}) to view the ` +
            `continuous skeleton/angle overlay.`
    );
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
