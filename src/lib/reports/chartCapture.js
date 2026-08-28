/**
 * Renders one athlete's chart section off-screen and rasterizes it into a PNG data URL, for
 * embedding into the player-profile PDF/PPTX exports so they visually match the live page
 * instead of a text/number summary. Plain JS (not .jsx) per this project's convention for
 * src/lib/* — uses React.createElement directly, same pattern as src/lib/store.js.
 *
 * Deterministic in the sense CLAUDE.md means it (no AI, same data in → same image out every
 * time) even though the *mechanism* — mount, paint, screenshot — is new for this project.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import AthleteChartsSnapshot from '../../components/athletes/AthleteChartsSnapshot.jsx'

/** Polls until Recharts has actually measured and painted every expected chart's SVG (a fixed
 * delay is unreliable — ResponsiveContainer needs a real ResizeObserver tick, which varies by
 * device speed), rather than guessing a wait time. */
async function waitForCharts(container, expectedSvgCount, maxWaitMs = 4000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const svgs = container.querySelectorAll('svg')
    if (svgs.length >= expectedSvgCount && [...svgs].every((s) => s.getBoundingClientRect().width > 0)) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

/**
 * @returns {Promise<{dataUrl: string, aspectRatio: number}>} aspectRatio = image height / width,
 *   so callers can size the embed to whatever width they place it at without distorting it.
 */
export async function captureAthleteCharts({ athlete, team, org, store, metricKeys, theme = 'dark', widthPx = 900, layout = 'stacked' }) {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '-10000px'
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  const root = createRoot(container)
  try {
    root.render(
      React.createElement(AthleteChartsSnapshot, { athlete, team, org, store, metricKeys, theme, widthPx, layout }),
    )

    // Radar chart (always rendered, even in its "not enough data" text-only state it has no
    // svg — so only count it once we know whether it has data) + one trend chart per metric.
    const hasRadarData = metricKeys.length > 0
    const expectedSvgCount = (hasRadarData ? 1 : 0) + metricKeys.length
    await waitForCharts(container, expectedSvgCount)

    const canvas = await html2canvas(container, {
      backgroundColor: theme === 'light' ? '#ffffff' : '#0a0c10',
      scale: 1.5,
      useCORS: true,
    })

    // JPEG rather than PNG — these are flat-color chart images (no transparency needed either
    // way), and PNG's lossless encoding of a full chart grid at 1.5x scale ran ~15MB per athlete
    // in testing, unusable for an emailed report. JPEG at high quality is visually
    // indistinguishable for this content and comes in at a fraction of the size.
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.92),
      aspectRatio: canvas.height / canvas.width,
    }
  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
