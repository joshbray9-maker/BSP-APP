/**
 * Per-team/org branding → runtime theme. This is the mechanism behind "add a logo and color
 * palette so the dashboard and exports adjust automatically as we switch organizations."
 *
 * A team's own colorAccent/colorPrimary wins if set; otherwise it falls back to its
 * organization's palette; otherwise it falls back to the app default (see index.css :root).
 * This lets an org set one palette for all its teams, with individual teams able to override.
 *
 * The background surfaces (--bg/--surface/--surface2/--border) are also tinted per org: derived
 * algorithmically from the accent's hue (see BG_SHADES below) rather than hand-picked per
 * program, so every current and future org gets a "this page belongs to this org" background
 * automatically just by having a colorAccent — no per-org special-casing needed.
 */
const DEFAULT_ACCENT = '#14b8a6'

// Fixed saturation/lightness targets for each dark-UI surface, at the org's accent hue. Chosen
// to stay subtle/dark (this is still a dark theme, not a colored one) while remaining visibly
// distinct per hue. Values are close to the original static bg/surface/surface2/border hex the
// app shipped with (#0a0c10 / #111318 / #1a1d26 / #252836), just re-expressed as tinted HSL.
const BG_SHADES = {
  bg: { s: 30, l: 6 },
  surface: { s: 26, l: 9 },
  surface2: { s: 22, l: 13 },
  border: { s: 20, l: 21 },
}

export function resolveBrandColors({ team, org }) {
  const accent = team?.colorAccent || org?.colorAccent || DEFAULT_ACCENT
  const primary = team?.colorPrimary || org?.colorPrimary || accent
  return { accent, primary, accentFg: pickReadableForeground(accent) }
}

/** Applies the resolved palette as CSS custom properties on the document root. */
export function applyBrandTheme({ team, org }) {
  const { accent, primary, accentFg } = resolveBrandColors({ team, org })
  const root = document.documentElement
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-fg', accentFg)
  root.style.setProperty('--accent-soft', `${accent}22`)
  root.style.setProperty('--brand-primary', primary)

  const { h } = rgbToHsl(hexToRgb(accent))
  for (const [name, { s, l }] of Object.entries(BG_SHADES)) {
    root.style.setProperty(`--${name}`, hslToHex(h, s, l))
  }
}

/** Simple relative-luminance check so button text stays legible against any accent color. */
function pickReadableForeground(hex) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#0a0c10' : '#f5f7fb'
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0')
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

/** Hue (0-360) from an {r,g,b} triple — the only HSL channel we borrow from the accent color. */
function rgbToHsl({ r, g, b }) {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === rN) h = ((gN - bN) / delta) % 6
    else if (max === gN) h = (bN - rN) / delta + 2
    else h = (rN - gN) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h }
}

/** Builds a background-surface hex from a hue plus fixed saturation/lightness (see BG_SHADES). */
function hslToHex(h, s, l) {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let rP = 0
  let gP = 0
  let bP = 0
  if (h < 60) [rP, gP, bP] = [c, x, 0]
  else if (h < 120) [rP, gP, bP] = [x, c, 0]
  else if (h < 180) [rP, gP, bP] = [0, c, x]
  else if (h < 240) [rP, gP, bP] = [0, x, c]
  else if (h < 300) [rP, gP, bP] = [x, 0, c]
  else [rP, gP, bP] = [c, 0, x]
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(rP)}${toHex(gP)}${toHex(bP)}`
}

/** Initials to show in the logo badge when no logoUrl is set for the team/org. */
export function initialsFor(name) {
  if (!name) return '?'
  const words = name.trim().split(/\s+/)
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}
