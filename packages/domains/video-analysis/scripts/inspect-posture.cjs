// Calibration helper — NOT part of the automated test suite.
//
// Single-video, single-frame posture overlay: extracts one frame as a
// real JPG, runs pose estimation on the same video up to that
// timestamp, computes the six posture metrics (analyzePosture(), see
// src/posture-analysis/) and renders a standalone .html file showing
// the frame with a skeleton overlay (points, connecting lines, the
// two elbow-angle readouts, shoulder/hip alignment boxes) plus a
// metrics table underneath — open the .html directly in any browser,
// no build step, no image-conversion dependency added to this
// package.
//
// Follows the same single-video pattern already used for other
// first-pass, not-yet-validated capabilities in this package
// (inspect-slowmo-release.cjs, inspect-hand-tension.cjs): prove the
// approach on one real frame before deciding whether/how to batch it
// across the whole calibration folder.
//
// Usage (compile the test build first, same as the other manual
// scripts — see README.md):
//   npx tsc -p tsconfig.test.json
//   node scripts/inspect-posture.cjs [videoFilePath] [right|left] [timestampMilliseconds]
//
// Defaults to the slow-motion Kim Woojin Release video (same default
// as inspect-hand-tension.cjs) and, if no timestamp is given, to the
// midpoint of the video's duration — there is no smarter default yet
// (e.g. "the Anchor midpoint from phase-detection") because that
// would only work for videos phase-detection already handles well,
// which is not true of every calibration video (see README.md's
// warmup-exclusion and slow-motion-video notes).

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-backend-wasm");

const ffmpegPath = require("ffmpeg-static");
const {
    createPoseDetector,
    analyzeShotVideo,
    readVideoMetadata,
    analyzePosture
} = require("../dist-test/src");
const { renderSkeletonOverlaySvg } = require("./lib/render-skeleton-overlay-svg.cjs");
const { renderPostureOverlayHtml } = require("./lib/render-posture-overlay-html.cjs");

const CALIBRATION_FOLDER =
    process.env.APL_CALIBRATION_FOLDER || "/Users/luigifranchini/Development/apl-video-calibration";
const RAW_VIDEOS_FOLDER = path.join(CALIBRATION_FOLDER, "raw-videos");
const POSTURE_FOLDER = path.join(CALIBRATION_FOLDER, "posture");

const DEFAULT_VIDEO_FILE_NAME =
    "Kim Woo Jin (KOR) Release - Slow Motion Archery Technique (Berlin World Cup 2018)_720p.mp4";

async function findClosestPoseFrame(videoFilePath, detector, targetTimestampMilliseconds) {
    let closestFrame = null;
    let closestDifferenceMilliseconds = Infinity;

    for await (const poseFrame of analyzeShotVideo(videoFilePath, detector)) {
        const differenceMilliseconds = Math.abs(
            poseFrame.timestampMilliseconds - targetTimestampMilliseconds
        );
        if (differenceMilliseconds < closestDifferenceMilliseconds) {
            closestFrame = poseFrame;
            closestDifferenceMilliseconds = differenceMilliseconds;
        }
        // Frames arrive in increasing timestamp order, so once we
        // start moving away from the target we have already seen the
        // closest one and can stop decoding the rest of the video.
        if (poseFrame.timestampMilliseconds > targetTimestampMilliseconds && closestFrame) {
            break;
        }
    }

    return closestFrame;
}

function extractFrameJpeg(videoFilePath, timestampMilliseconds, outputJpegPath) {
    if (!ffmpegPath) {
        throw new Error("ffmpeg-static returned no binary path for this platform/architecture.");
    }

    const timestampSeconds = (timestampMilliseconds / 1000).toFixed(3);

    // Accurate (post-input) -ss rather than fast (pre-input) -ss:
    // slower — ffmpeg decodes from the start of the file instead of
    // jumping to the nearest keyframe — but frame-accurate, which
    // matters here since this JPG needs to visually match the exact
    // PoseFrame timestamp used for the skeleton overlaid on top of
    // it. For these short, single-shot calibration clips the extra
    // decode time is not a real cost.
    execFileSync(ffmpegPath, [
        "-y",
        "-i", videoFilePath,
        "-ss", timestampSeconds,
        "-frames:v", "1",
        "-q:v", "2",
        outputJpegPath
    ]);
}

async function main() {
    // Same argument-parsing convention as inspect-slowmo-release.cjs
    // and inspect-hand-tension.cjs: videoFilePath is optional, and a
    // caller who wants to skip it (to just pass drawSide, the common
    // case — see README.md) should not have to pass an empty-string
    // placeholder. If argv[2] is "left"/"right" it is treated as
    // drawSide, not a (nonsensical) file path named "right".
    const explicitPath = process.argv[2] && !["left", "right"].includes(process.argv[2]) ? process.argv[2] : null;
    const drawSideArgument = explicitPath ? process.argv[3] : process.argv[2];
    const timestampArgument = explicitPath ? process.argv[4] : process.argv[3];

    const videoFilePath = explicitPath
        ? path.resolve(explicitPath)
        : path.join(RAW_VIDEOS_FOLDER, DEFAULT_VIDEO_FILE_NAME);
    const drawSide = drawSideArgument === "left" ? "left" : "right";
    const explicitTimestampMilliseconds = timestampArgument ? Number(timestampArgument) : null;

    if (!fs.existsSync(videoFilePath)) {
        console.error(`Video not found: ${videoFilePath}`);
        process.exitCode = 1;
        return;
    }

    fs.mkdirSync(POSTURE_FOLDER, { recursive: true });

    console.log(`Reading metadata for ${path.basename(videoFilePath)}...`);
    const metadata = await readVideoMetadata(videoFilePath);
    console.log(
        `  ${metadata.widthPixels}x${metadata.heightPixels}, ${metadata.durationSeconds.toFixed(1)}s, ` +
            `${metadata.frameRateFramesPerSecond.toFixed(1)}fps`
    );

    const targetTimestampMilliseconds =
        explicitTimestampMilliseconds ?? (metadata.durationSeconds * 1000) / 2;

    console.log("Setting up WASM backend and BlazePose detector...");
    await tf.setBackend("wasm");
    await tf.ready();
    const detector = await createPoseDetector();
    console.log("Detector ready.\n");

    console.log(`Finding the pose frame closest to t=${targetTimestampMilliseconds.toFixed(0)}ms...`);
    const poseFrame = await findClosestPoseFrame(videoFilePath, detector, targetTimestampMilliseconds);

    if (!poseFrame) {
        console.error("No pose frames were detected in this video at all.");
        process.exitCode = 1;
        return;
    }
    console.log(`  Using frame at t=${poseFrame.timestampMilliseconds.toFixed(0)}ms.`);

    const videoBaseName = path.parse(videoFilePath).name;
    const frameLabel = `t${poseFrame.timestampMilliseconds.toFixed(0)}ms`;
    const frameFileName = `${videoBaseName}_${frameLabel}.jpg`;
    const framePath = path.join(POSTURE_FOLDER, frameFileName);

    console.log(`Extracting frame image to ${framePath}...`);
    extractFrameJpeg(videoFilePath, poseFrame.timestampMilliseconds, framePath);

    console.log(`Computing posture metrics (drawSide=${drawSide})...`);
    const postureResults = analyzePosture(poseFrame, drawSide);
    postureResults.forEach((result) => {
        const valueText = result.valueDegrees === null ? "n/d" : `${result.valueDegrees.toFixed(1)}°`;
        console.log(`  ${result.name}: ${valueText} (${result.status ?? "keypoint non rilevato"})`);
    });

    const skeletonSvg = renderSkeletonOverlaySvg({
        keypoints: poseFrame.keypoints,
        postureResults,
        drawSide,
        widthPixels: metadata.widthPixels,
        heightPixels: metadata.heightPixels
    });

    const html = renderPostureOverlayHtml({
        title: `${path.basename(videoFilePath)} — posture overlay (${frameLabel})`,
        frameImageFileName: frameFileName,
        widthPixels: metadata.widthPixels,
        heightPixels: metadata.heightPixels,
        skeletonSvg,
        postureResults,
        drawSide,
        timestampMilliseconds: poseFrame.timestampMilliseconds
    });

    const htmlPath = path.join(POSTURE_FOLDER, `${videoBaseName}_${frameLabel}.html`);
    fs.writeFileSync(htmlPath, html);

    console.log(`\nDone. Open this file in a browser:\n  ${htmlPath}`);
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});
