# Programs

Tracks each real organization/team Josh has provided, and exactly where its branding came
from — so colors/logos can be verified or re-sourced later without re-doing the research.
Athlete rosters under every program below are **synthetic placeholders** (see CLAUDE.md); only
the organization/team names, logos, and colors are real.

## 1. Bishop's College School (BCS)

- **Identified from:** logo image Josh provided (purple bear head + "BCS" wordmark).
- **Confirmed as:** Bishop's College School, an independent boarding/day school in Sherbrooke,
  Quebec, Canada — athletics site at bishopscollegeschool.com uses "BCS Bears" and has a
  dedicated "U18/Varsity Hockey" page matching the team names Josh gave.
- **Logo file:** `public/logos/bcs-bears.jpeg` (downloaded from the link Josh sent, stored
  locally rather than hotlinked).
- **Colors:** `#631d76` (purple). Sourced from bishopscollegeschool.com's own site CSS, not
  eyeballed from the logo — the `.bcs-ath-btn` athletics button and the page's base background
  both explicitly use this exact hex value, with white (`#ffffff`) button text as the natural
  contrast color. Only one strong brand color was found on the live site; if BCS has a separate
  brand guideline document with additional official secondary colors, that would supersede this.
- **Teams added** (all under org id `org-bcs`, all inheriting the org's color — see
  `src/data/mockData.js`):
  - BCS Bears Varsity (U18 Hockey) — `team-bcs-hockey-varsity`
  - BCS Bears Prep (U16 Hockey) — `team-bcs-hockey-prep`
  - BCS Basketball Varsity — `team-bcs-basketball-varsity`
  - BCS Basketball Prep — `team-bcs-basketball-prep`

## 2. Académie Universel

- **Identified from:** logo image Josh provided (green ring monogram + "ACADÉMIE UNIVERSEL
  ACADEMY" wordmark). Team names Josh gave ("NCDC Vermont," "NCDC Quebec," "USPHL," "Varsity")
  confirmed the match via web search — Académie Universel is a Quebec-based hockey academy
  fielding an NCDC team playing home games in Vermont (at Jay Peak Resort) and a second NCDC
  team in Quebec City, plus USPHL and NAPHL/Varsity programs.
- **Confirmed as:** Académie Universel, official site universelacademie.com.
- **Logo file:** `public/logos/universel-academie.jpg` (downloaded from the link Josh sent,
  stored locally rather than hotlinked).
- **Colors:** `#249346` (green). Sourced from universelacademie.com's own site CSS — the
  "S'informer" call-to-action button uses this exact background value, and it matches the green
  ring in the academy's own logo. The academy's Instagram posts also consistently sign off with
  a green-and-black heart pair (💚🖤), independently confirming green + black as the two brand
  colors; green was used here since it's also the one active CTA/button color found on the live
  site (this app's model is single primary/accent per org, same pattern as BCS).
- **Teams added** (all under org id `org-universel`, all inheriting the org's color — see
  `src/data/mockData.js`):
  - Universel NCDC Vermont — `team-universel-ncdc-vermont`
  - Universel NCDC Quebec — `team-universel-ncdc-quebec`
  - Universel USPHL — `team-universel-usphl`
  - Universel Varsity — `team-universel-varsity`

## 3. Bishop's University (BU)

- **Identified from:** logo image Josh provided ("BU" monogram in purple/silver, "RUGBY"
  wordmark) plus the team name "BU Men's Rugby." Purple/silver + "BU" + Rugby matched Bishop's
  University's Gaiters athletics program, not Boston University (whose official colors are
  scarlet/white, not purple) — confirmed by web search that Bishop's Gaiters' colors are
  purple and silver and that Bishop's fields a men's rugby team.
- **Confirmed as:** Bishop's University, Lennoxville/Sherbrooke, Quebec — athletics site
  gaiters.ca. Note this is a **different institution** from "Bishop's College School" (org-bcs,
  entry 1 above) even though both are Sherbrooke-area schools that happen to brand in purple —
  don't merge them.
- **Logo file:** `public/logos/bishops-university-rugby.jpg` (downloaded from the link Josh
  sent, stored locally rather than hotlinked).
- **Colors:** `#753bb0` (purple). Sourced from gaiters.ca's own site CSS — this exact value was
  the dominant non-neutral background color on the athletics homepage (28 occurrences, used for
  buttons/links), matching the purple in the logo Josh provided. A third-party brand-color
  reference site listed a different, darker purple (`#582c83`) for "Bishop's Gaiters" — that
  value was **not** used since it wasn't independently verifiable on the live site itself; per
  the sourcing rule (live site CSS over third-party pickers/references), `#753bb0` was used.
- **Teams added:**
  - BU Men's Rugby — `team-bu-mens-rugby` (org id `org-bishops-university`)
- **Follow-up fix, 2026-08-19**: with `BrandBadge.jsx`'s padding removed (see the Iona entry
  above), the "B"/"U" letters in the source file extended almost to its own edges, so at badge
  size the mark read as nearly cut off by the container's rounded-corner clipping. Fixed at the
  file level, consistent with the Iona fix: redrew the logo onto a new canvas at 80% scale,
  centered on a white background, adding real margin on all sides that the original file didn't
  have. No component code changed.

## 4. Iona University

- **Identified from:** logo image Josh provided (maroon shield, "IONA GAELS" wordmark, Celtic
  cross) plus the team name "Iona Men's Rugby."
- **Confirmed as:** Iona University, New Rochelle, NY — athletics site ionagaels.com.
- **Logo file:** `public/logos/iona-gaels.jpg` (downloaded from the link Josh sent, stored
  locally rather than hotlinked). **Cropped 2026-08-18**: the original download was a
  1200×1800 portrait image — a full-bleed maroon rectangle with the crest centered, not a
  square graphic. `BrandBadge.jsx`'s white-backed `object-contain` box (added when fixing the
  Bishop's University logo crop — see that entry above) let the crest show fully, but the
  mismatched aspect ratio left visible white pillarbox bars on either side, which looked wrong
  against a maroon crest. Fixed by cropping the source file itself to a centered 500×500 square
  (via an in-browser canvas crop, not a new dependency) — since the image is full-bleed maroon,
  a square crop fills the badge box edge-to-edge with no white showing at all. Worth doing the
  same square-crop treatment proactively for any future non-square logo rather than waiting for
  it to look wrong first.

  **Second fix, same day**: even after the square crop, a thin white frame was still visible —
  `BrandBadge.jsx` had a deliberate `p-1`/`p-2` padding margin inside every badge, invisible on
  the other three logos (white-on-white, since their own source files already have a white
  background baked in) but showing clearly as an unwanted border around Iona's full-bleed maroon
  crest. Removed that padding globally in `BrandBadge.jsx` (image now fills the badge box edge
  to edge via `w-full h-full object-contain` + `overflow-hidden` on the container) — confirmed
  no regression on BCS, Universel, or Bishop's University's logos, which all still render
  correctly with more of the badge now used for the logo itself.
- **Colors:** `#661e2b` (maroon). Sourced from ionagaels.com's own site CSS — this exact value
  appeared as a prominent background color on the athletics homepage and matches the shield
  background in the crest. The site's other dominant brand color is gold (`#ffcc00`, used more
  as the CTA/link color); maroon was used as the single primary/accent here since it's the
  dominant identity color in the crest itself, consistent with this app's one-color-per-org
  model.
- **Teams added:**
  - Iona Men's Rugby — `team-iona-mens-rugby` (org id `org-iona`)

## Adding the next program

1. Identify the program from the logo (or ask Josh if it's ambiguous — don't guess).
2. Source official colors from the program's own athletics site CSS (inspect computed styles
   on real branded elements — buttons, headers — not a color-picker on the logo image, which
   only gives you what that specific graphic happened to render, not the confirmed brand hex).
3. Download the logo into `public/logos/` (don't hotlink external URLs).
4. Add an entry to `PROGRAM_ORGANIZATIONS` / `PROGRAM_TEAMS` / `PROGRAM_ROSTER` in
   `src/data/mockData.js`, following the BCS entries as a template — synthetic athletes only.
5. Add a section here documenting what was found and where it came from.
