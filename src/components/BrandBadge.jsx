import { initialsFor } from '../lib/theme.js'

const SIZES = {
  sm: 'w-8 h-8 rounded-md',
  md: 'w-10 h-10 rounded-lg',
  lg: 'w-16 h-16 rounded-xl',
}

const INITIAL_SIZES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
}

/** Shared org/team logo (or initials fallback) at a given size — used small in the header nav,
 * large in the dashboard hero. See src/lib/theme.js for the color/logo cascade rule.
 *
 * Logos come from whatever aspect ratio the source program's own logo file happens to be
 * (square, portrait wordmark, etc. — see docs/PROGRAMS.md for each one's source). A white
 * background + object-contain (no padding) is used instead of a hard object-cover crop so a
 * non-square logo is never sliced off — it fills the box edge to edge if it's already square
 * (the preferred case — see docs/PROGRAMS.md's square-crop convention for full-bleed logos like
 * Iona's) or letterboxes onto the white backdrop if it isn't, same as it would on the program's
 * own site. No deliberate padding margin: it was invisible on white-background logos but showed
 * as an unwanted white frame around a full-bleed colored logo like Iona's. */
export default function BrandBadge({ team, org, size = 'md' }) {
  const logoUrl = team?.logoUrl || org?.logoUrl
  const label = team?.name || org?.name
  const dims = SIZES[size] ?? SIZES.md

  if (logoUrl) {
    return (
      <div className={`${dims} bg-white flex items-center justify-center flex-shrink-0 overflow-hidden`}>
        <img src={logoUrl} alt={`${label} logo`} className="w-full h-full object-contain" />
      </div>
    )
  }
  const initialSize = INITIAL_SIZES[size] ?? INITIAL_SIZES.md
  return (
    <span
      className={`${dims} ${initialSize} flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
    >
      {initialsFor(label)}
    </span>
  )
}
