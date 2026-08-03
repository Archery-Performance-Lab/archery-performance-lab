// Shared helper for calibration scripts — NOT part of the automated
// test suite, and not part of @apl/video-analysis's public API (same
// status as render-svg-line-chart.cjs, which this file is modeled
// on: plain SVG string-building, no new dependency).
//
// Renders a skeleton overlay (connecting lines + keypoint dots +
// colored angle readouts + alignment "zone" boxes) from a single
// video frame's PoseKeypoint array and its posture-analysis results
// (from @apl/video-analysis's analyzePosture()). Ported deliberately
// closely from a real, working reference implementation — the
// client-side source of "Archery Posture Tracker"
// (ghiggo.altervista.org/posture), read directly, not guessed at from
// its screen recording — see the doc comments in
// src/biomechanics/geometry.ts and src/posture-analysis/ for the same
// reference applied to the underlying calculations. This file
// reproduces its drawSkeleton()/drawZones()/drawAngles() drawing
// logic, adapted from mutable <canvas> drawing calls to a pure string
// builder (consistent with this project's already-established SVG
// approach for the elbow-angle chart), and from MediaPipe's numeric
// landmark indices to this project's named PoseKeypoint.name strings.
//
// Deliberately confidence-aware, not all-or-nothing: a connection is
// only drawn when BOTH its keypoints meet CONFIDENCE_THRESHOLD, and a
// keypoint dot only when that keypoint itself does — matching the
// reference implementation's per-landmark `visibility < 0.5` skip.
// This means a partial/lateral view naturally draws a partial
// skeleton (only whichever joints the pose detector actually trusts
// in that frame) rather than needing separate "full body" vs.
// "reduced" rendering code paths.

function escapeXmlText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

// Same skeleton edges as the reference implementation's CONN array,
// translated from its numeric MediaPipe indices (11/12 shoulders,
// 13/14 elbows, 15/16 wrists, 23/24 hips, 25/26 knees, 27/28 ankles,
// 0/7/8 nose/ears) to this project's named keypoints.
const SKELETON_CONNECTIONS = [
    ["left_shoulder", "right_shoulder"],
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
    ["left_hip", "right_hip"],
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
    ["nose", "left_ear"],
    ["nose", "right_ear"],
    ["left_ear", "left_shoulder"],
    ["right_ear", "right_shoulder"]
];

function statusColor(status) {
    if (status === "ok") return "#4ade80";
    if (status === "warning") return "#fb923c";
    if (status === "outOfRange") return "#f87171";
    return "#94a3b8";
}

function findMetric(postureResults, id) {
    return (postureResults || []).find((result) => result.id === id) || null;
}

function angleLabelMarkup(elbowKeypoint, metricResult, label) {
    const color = statusColor(metricResult.status);
    const x = elbowKeypoint.xPixels + 10;
    const y = elbowKeypoint.yPixels;
    return (
        `<text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="18" font-weight="bold" ` +
        `fill="${color}" font-family="system-ui, sans-serif">${metricResult.valueDegrees.toFixed(1)}°</text>\n  ` +
        `<text x="${x.toFixed(1)}" y="${(y + 12).toFixed(1)}" font-size="13" fill="rgba(255,255,255,0.9)" ` +
        `font-family="system-ui, sans-serif">${escapeXmlText(label)}</text>`
    );
}

function zoneBoxMarkup(firstKeypoint, secondKeypoint, label, status) {
    const centerX = (firstKeypoint.xPixels + secondKeypoint.xPixels) / 2;
    const centerY = (firstKeypoint.yPixels + secondKeypoint.yPixels) / 2;
    const boxWidth = Math.abs(secondKeypoint.xPixels - firstKeypoint.xPixels) + 40;
    const boxHeight = 28;
    const color = statusColor(status);

    return (
        `<rect x="${(centerX - boxWidth / 2).toFixed(1)}" y="${(centerY - boxHeight / 2).toFixed(1)}" ` +
        `width="${boxWidth.toFixed(1)}" height="${boxHeight.toFixed(1)}" fill="none" stroke="${color}" ` +
        `stroke-width="1.5" stroke-dasharray="4,3" />\n  ` +
        `<text x="${(centerX - boxWidth / 2 + 4).toFixed(1)}" y="${(centerY - boxHeight / 2 - 5).toFixed(1)}" ` +
        `font-size="14" font-weight="bold" fill="${color}" font-family="system-ui, sans-serif">${escapeXmlText(label)}</text>`
    );
}

/**
 * Builds the SVG overlay string. Returns null if `keypoints` is empty
 * (nothing to draw — mirrors render-svg-line-chart.cjs's same
 * "nothing meaningful" convention for an empty input).
 *
 * `widthPixels`/`heightPixels` should match the underlying video
 * frame's actual pixel dimensions exactly: this SVG is meant to be
 * layered directly on top of that frame (e.g. via
 * render-posture-overlay-html.cjs), and PoseKeypoint coordinates are
 * already in that same frame's pixel space (see
 * src/types/pose.ts) — no separate scaling step is needed here, only
 * in the caller if it displays the frame at a different size.
 */
function renderSkeletonOverlaySvg({
    keypoints,
    postureResults,
    drawSide,
    widthPixels,
    heightPixels,
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD
}) {
    if (!keypoints || keypoints.length === 0) {
        return null;
    }

    const keypointsByName = new Map(keypoints.map((keypoint) => [keypoint.name, keypoint]));
    const isConfident = (name) => {
        const keypoint = keypointsByName.get(name);
        return Boolean(keypoint) && keypoint.confidenceScore >= confidenceThreshold;
    };

    const lineMarkup = SKELETON_CONNECTIONS.filter(([a, b]) => isConfident(a) && isConfident(b))
        .map(([a, b]) => {
            const pointA = keypointsByName.get(a);
            const pointB = keypointsByName.get(b);
            return (
                `<line x1="${pointA.xPixels.toFixed(1)}" y1="${pointA.yPixels.toFixed(1)}" ` +
                `x2="${pointB.xPixels.toFixed(1)}" y2="${pointB.yPixels.toFixed(1)}" ` +
                `stroke="rgba(148,163,184,0.85)" stroke-width="2" />`
            );
        })
        .join("\n  ");

    const dotMarkup = keypoints
        .filter((keypoint) => keypoint.confidenceScore >= confidenceThreshold)
        .map(
            (keypoint) =>
                `<circle cx="${keypoint.xPixels.toFixed(1)}" cy="${keypoint.yPixels.toFixed(1)}" r="5" ` +
                `fill="#3b82f6" stroke="white" stroke-width="1.5" />`
        )
        .join("\n  ");

    const zoneMarkupParts = [];
    const shoulderResult = findMetric(postureResults, "shoulderLevel");
    if (shoulderResult && shoulderResult.status && isConfident("left_shoulder") && isConfident("right_shoulder")) {
        zoneMarkupParts.push(
            zoneBoxMarkup(
                keypointsByName.get("left_shoulder"),
                keypointsByName.get("right_shoulder"),
                "Spalle",
                shoulderResult.status
            )
        );
    }
    const hipResult = findMetric(postureResults, "hipLevel");
    if (hipResult && hipResult.status && isConfident("left_hip") && isConfident("right_hip")) {
        zoneMarkupParts.push(
            zoneBoxMarkup(keypointsByName.get("left_hip"), keypointsByName.get("right_hip"), "Bacino", hipResult.status)
        );
    }

    const angleMarkupParts = [];
    const bowSide = drawSide === "right" ? "left" : "right";
    const bowResult = findMetric(postureResults, "bowArmElbow");
    if (bowResult && bowResult.valueDegrees !== null && isConfident(`${bowSide}_elbow`)) {
        angleMarkupParts.push(
            angleLabelMarkup(keypointsByName.get(`${bowSide}_elbow`), bowResult, "Braccio arco")
        );
    }
    const drawResult = findMetric(postureResults, "drawArmElbow");
    if (drawResult && drawResult.valueDegrees !== null && isConfident(`${drawSide}_elbow`)) {
        angleMarkupParts.push(
            angleLabelMarkup(keypointsByName.get(`${drawSide}_elbow`), drawResult, "Braccio corda")
        );
    }

    return `<svg width="${widthPixels}" height="${heightPixels}" viewBox="0 0 ${widthPixels} ${heightPixels}" xmlns="http://www.w3.org/2000/svg">
  ${lineMarkup}
  ${dotMarkup}
  ${zoneMarkupParts.join("\n  ")}
  ${angleMarkupParts.join("\n  ")}
</svg>
`;
}

module.exports = { renderSkeletonOverlaySvg, SKELETON_CONNECTIONS, escapeXmlText };
