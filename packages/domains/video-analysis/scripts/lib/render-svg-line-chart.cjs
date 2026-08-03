// Shared helper for calibration scripts — NOT part of the automated
// test suite, and not part of @apl/video-analysis's public API.
//
// Renders a simple line chart as a plain SVG string: an axis, tick
// marks, labels and a polyline over (x, y) points. No charting
// library, no new dependency — plain string-building, in the same
// spirit as this project's zero-dependency test runner (node:test)
// and its avoidance of native/platform-specific packages wherever a
// simpler option exists (see the tfjs WASM backend decision in
// CHANGELOG.md). SVG output opens directly in a browser or any image
// viewer, with no build step.
//
// This is intentionally basic: no legend, no multi-series support, no
// styling options beyond what's passed in. It exists to make a single
// signal's value over time visible at a glance for calibration
// purposes, not to be a general-purpose charting engine.

function escapeXmlText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

const DEFAULT_WIDTH_PIXELS = 900;
const DEFAULT_HEIGHT_PIXELS = 400;
const MARGIN_PIXELS = { top: 40, right: 20, bottom: 50, left: 60 };
const TICK_COUNT = 5;

/**
 * Renders `points` (an array of { x, y }, assumed already sorted by
 * x) as an SVG line chart string.
 *
 * Returns null instead of a chart if `points` is empty — there is
 * nothing meaningful to draw, and an empty/degenerate chart would
 * look like a real (if boring) result rather than "no data made it
 * this far", which callers should handle explicitly instead.
 */
function renderSvgLineChart({
    points,
    title,
    xAxisLabel,
    yAxisLabel,
    widthPixels = DEFAULT_WIDTH_PIXELS,
    heightPixels = DEFAULT_HEIGHT_PIXELS
}) {
    if (!points || points.length === 0) {
        return null;
    }

    const plotWidthPixels = widthPixels - MARGIN_PIXELS.left - MARGIN_PIXELS.right;
    const plotHeightPixels = heightPixels - MARGIN_PIXELS.top - MARGIN_PIXELS.bottom;

    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    // Guard against a zero-width range (e.g. a single point, or every
    // value identical) collapsing the scale to a division by zero.
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    const scaleX = (x) => MARGIN_PIXELS.left + ((x - xMin) / xRange) * plotWidthPixels;
    const scaleY = (y) =>
        MARGIN_PIXELS.top + plotHeightPixels - ((y - yMin) / yRange) * plotHeightPixels;

    const polylinePoints = points
        .map((point) => `${scaleX(point.x).toFixed(1)},${scaleY(point.y).toFixed(1)}`)
        .join(" ");

    const tickFraction = (index) => index / TICK_COUNT;
    const xTicks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => xMin + tickFraction(index) * xRange);
    const yTicks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => yMin + tickFraction(index) * yRange);

    const xTickMarkup = xTicks
        .map((tickValue) => {
            const x = scaleX(tickValue);
            const axisY = MARGIN_PIXELS.top + plotHeightPixels;
            return (
                `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 5}" stroke="black" />` +
                `<text x="${x}" y="${axisY + 20}" font-size="11" text-anchor="middle">${tickValue.toFixed(0)}</text>`
            );
        })
        .join("\n  ");

    const yTickMarkup = yTicks
        .map((tickValue) => {
            const y = scaleY(tickValue);
            return (
                `<line x1="${MARGIN_PIXELS.left - 5}" y1="${y}" x2="${MARGIN_PIXELS.left}" y2="${y}" stroke="black" />` +
                `<text x="${MARGIN_PIXELS.left - 10}" y="${y + 4}" font-size="11" text-anchor="end">${tickValue.toFixed(0)}</text>`
            );
        })
        .join("\n  ");

    const axisBottom = MARGIN_PIXELS.top + plotHeightPixels;

    return `<svg width="${widthPixels}" height="${heightPixels}" viewBox="0 0 ${widthPixels} ${heightPixels}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${widthPixels}" height="${heightPixels}" fill="white" />
  <text x="${widthPixels / 2}" y="20" font-size="16" text-anchor="middle" font-family="sans-serif">${escapeXmlText(title)}</text>
  <line x1="${MARGIN_PIXELS.left}" y1="${axisBottom}" x2="${MARGIN_PIXELS.left + plotWidthPixels}" y2="${axisBottom}" stroke="black" />
  <line x1="${MARGIN_PIXELS.left}" y1="${MARGIN_PIXELS.top}" x2="${MARGIN_PIXELS.left}" y2="${axisBottom}" stroke="black" />
  ${xTickMarkup}
  ${yTickMarkup}
  <text x="${widthPixels / 2}" y="${heightPixels - 10}" font-size="12" text-anchor="middle" font-family="sans-serif">${escapeXmlText(xAxisLabel)}</text>
  <text x="${MARGIN_PIXELS.left}" y="16" font-size="12" text-anchor="start" font-family="sans-serif">${escapeXmlText(yAxisLabel)}</text>
  <polyline points="${polylinePoints}" fill="none" stroke="steelblue" stroke-width="2" />
</svg>
`;
}

module.exports = { renderSvgLineChart };
