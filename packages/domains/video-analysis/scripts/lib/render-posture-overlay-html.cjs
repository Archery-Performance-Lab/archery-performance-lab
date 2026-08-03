// Shared helper for calibration scripts — NOT part of the automated
// test suite, and not part of @apl/video-analysis's public API. Same
// zero-new-dependency spirit as render-svg-line-chart.cjs and
// render-skeleton-overlay-svg.cjs: plain string-building, opens
// directly in any browser, no image-conversion step needed.
//
// Wraps a single extracted video frame (a real image file sitting
// next to the generated .html — referenced by relative path, not
// embedded as base64, to keep the .html small and the frame
// inspectable on its own) and a skeleton-overlay SVG (from
// render-skeleton-overlay-svg.cjs) into one standalone page: the
// image and the SVG are stacked in a position:relative container,
// each stretched to 100% of that container's CSS size via
// position:absolute — so they stay pixel-aligned at any zoom level or
// window width, without hardcoding a display size that would only be
// correct at 1:1.

const { escapeXmlText } = require("./render-skeleton-overlay-svg.cjs");

const STATUS_LABEL = { ok: "OK", warning: "Attenzione", outOfRange: "Fuori range" };
const STATUS_COLOR = { ok: "#4ade80", warning: "#fb923c", outOfRange: "#f87171" };

function metricRowMarkup(result) {
    const hasValue = result.valueDegrees !== null && result.status !== null;
    const color = hasValue ? STATUS_COLOR[result.status] : "#64748b";
    const valueText = hasValue ? `${result.valueDegrees.toFixed(1)}°` : "n/d";
    const statusText = hasValue ? STATUS_LABEL[result.status] : "keypoint non rilevato";

    return `<tr>
    <td style="padding:4px 12px 4px 0; color:#e2e8f0;">${escapeXmlText(result.name)}</td>
    <td style="padding:4px 12px; color:${color}; font-weight:bold;">${valueText}</td>
    <td style="padding:4px 0; color:${color};">${escapeXmlText(statusText)}</td>
  </tr>`;
}

/**
 * Returns the full HTML document as a string. `frameImageFileName`
 * must be a path relative to where the .html file itself will be
 * written (the caller is responsible for writing both into the same
 * folder) — this function does not read or copy any image, it only
 * references the file name.
 */
function renderPostureOverlayHtml({
    title,
    frameImageFileName,
    widthPixels,
    heightPixels,
    skeletonSvg,
    postureResults,
    drawSide,
    timestampMilliseconds
}) {
    const metricRows = (postureResults || []).map(metricRowMarkup).join("\n  ");

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8" />
<title>${escapeXmlText(title)}</title>
</head>
<body style="margin:0; background:#0f172a; color:#e2e8f0; font-family:system-ui, sans-serif; padding:24px;">
  <h1 style="font-size:18px; font-weight:600; margin:0 0 4px;">${escapeXmlText(title)}</h1>
  <p style="margin:0 0 16px; color:#94a3b8; font-size:13px;">
    t = ${timestampMilliseconds.toFixed(0)}ms — lato di trazione: ${escapeXmlText(drawSide)}
  </p>
  <div style="position:relative; width:100%; max-width:${widthPixels}px; aspect-ratio:${widthPixels}/${heightPixels};">
    <img src="${escapeXmlText(frameImageFileName)}" alt="frame"
         style="position:absolute; top:0; left:0; width:100%; height:100%; display:block;" />
    <div style="position:absolute; top:0; left:0; width:100%; height:100%;">
      ${skeletonSvg}
    </div>
  </div>
  <table style="margin-top:20px; border-collapse:collapse; font-size:14px;">
    <thead>
      <tr>
        <th style="text-align:left; padding:4px 12px 4px 0; color:#94a3b8; font-size:12px;">Metrica</th>
        <th style="text-align:left; padding:4px 12px; color:#94a3b8; font-size:12px;">Valore</th>
        <th style="text-align:left; padding:4px 0; color:#94a3b8; font-size:12px;">Stato</th>
      </tr>
    </thead>
    <tbody>
      ${metricRows}
    </tbody>
  </table>
  <p style="margin-top:16px; color:#64748b; font-size:12px; max-width:${widthPixels}px;">
    Le soglie ideale/warning per ciascuna metrica sono quelle di partenza
    ereditate da un riferimento esterno (ghiggo.altervista.org/posture),
    non ancora calibrate su questo arciere — vedi README.md.
  </p>
</body>
</html>
`;
}

module.exports = { renderPostureOverlayHtml };
