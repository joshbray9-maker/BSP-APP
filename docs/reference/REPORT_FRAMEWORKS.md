# Report Frameworks — Anonymized Reference

Source: 4 files Josh sent on 2026-08-17 showing dashboards/exports he has used with real teams
in the past (`Pineapple Hockey Academy - Team Dashboard.pptx`, `Mach__Isaac_Dezan.pdf`,
`Ostridge.pdf`, `Universel U18_Prem-Team report - Dashboard.pdf`). These are **not** Performance
Hub output — they're prior work (one coach-built PowerPoint dashboard, plus what look like
outputs from another testing/reporting tool) that Josh is sharing as **examples of the data he
collects and how he's displayed it before**, to use as a framework for this build's dashboard
views and exports.

**All real athlete names and one date of birth have been replaced with anonymized codes below.**
The original source files are not stored in this repo — only this anonymized extraction. See
`CLAUDE.md`'s data/privacy rules: this doc follows the same synthetic-athlete-data convention
already used for `src/data/mockData.js`.

Josh's own framing (from his 8/17 notes, see `../../Josh Bray Client Notes 8-17-2026.md`):
> Above are 4 dashboards (2 team + 2 individual) I've been using. Don't mind either, just a
> sh!t ton of backend work. The third is another Indi profile I used claude for in the summer.

That maps directly onto these 4 files — **2 team-level formats** and **2 individual-level
formats**:

| # | File | Level | Format |
|---|------|-------|--------|
| A | `Universel U18_Prem-Team report - Dashboard.pdf` | Team | Single-page roster×metric grid |
| B | `Pineapple Hockey Academy - Team Dashboard.pptx` | Team | Multi-group slide deck |
| C | `Ostridge.pdf` | Individual | KPI trend dashboard (career-to-date) |
| D | `Mach__Isaac_Dezan.pdf` | Individual | Before/after testing-block summary |

---

## A. Team roster×metric grid (Universel-style)

One page, one team. Athletes run down the rows; each tracked metric gets its own column group of
**Before value / After value / % change**, with the two test dates shown under each pair. This is
almost exactly what Josh described wanting in his notes ("20 athletes vertically orientated with
tests horizontally across top. Each row + column aligning with each player's outcomes.") — this
looks like the direct precedent for that ask.

Columns seen: **IMTP**, **Relative Strength (N/kg)**, **RSI mod**, **Jump Height**. A footer
glossary defines each metric in one line, e.g. "IMTP = Maximum force they can produce," and notes
when a metric wasn't retested ("10mfly = max acceleration...never re-tested due to weather") —
worth keeping that "why this metric is blank" affordance.

Anonymized data (19 athletes, `Athlete UN01`–`UN19`, testing window 2025-08-26 → 2025-11-20 or
2026-03-10 depending on athlete):

| # | Athlete | IMTP Before | IMTP After | IMTP %Δ | Rel. Str. Before | Rel. Str. After | Rel. Str. %Δ | RSI mod Before | RSI mod After | RSI mod %Δ | Jump Ht Before | Jump Ht After | Jump Ht %Δ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | UN01 | 1458 | 1752 | 20.2% | 18.77 | 22.96 | 22.3% | 0.41 | 0.48 | 17.1% | 36.4 | 38 | 4.4% |
| 2 | UN02 | DNC | DNC | 0.0% | 73.7 | DNC | — | 0.72 | DNC | 0.0% | 50 | DNC | -5.8% |
| 3 | UN03 | 2908 | 3141 | 13.0% | 41.94 | 53.9 | 28.5% | 0.36 | 0.58 | 19.4% | 34.9 | 41.9 | 8.5% |
| 4 | UN04 | 2334 | 3058 | 22.4% | 34.46 | 44.09 | 27.9% | 0.44 | 0.5 | 0.0% | 36.5 | 37.3 | 4.2% |
| 5 | UN05 | 2477 | 2477 | — | 39.83 | 39.83 | 0.0% | 0.49 | 0.49 | 8.0% | 39.4 | 37.1 | -0.7% |
| 6 | UN06 | 2429 | DNC | — | 38.3 | DNC | — | 0.61 | 0.64 | — | 40.7 | 42 | — |
| 7 | UN07 | 2499 | 2738 | — | 35.17 | 51.6 | 46.7% | 0.51 | 0.62 | — | 34.3 | 40 | — |
| 8 | UN08 | 2215 | 2334 | — | 33.65 | 57.2 | 70.0% | 0.44 | 0.53 | — | 36.9 | 42.2 | — |
| 9 | UN09 | 2595 | 2933 | — | 40.45 | 48.4 | 19.7% | 0.36 | 0.43 | — | 34.2 | 37.1 | — |
| 10 | UN10 | 2703 | 3598 | — | 31.77 | 50.8 | 59.9% | 0.38 | 0.41 | — | 32.6 | 34.6 | — |
| 11 | UN11 | 2286 | 2618 | — | 31.24 | 46.4 | 48.5% | 0.52 | 0.53 | — | 33.6 | 40 | — |
| 12 | UN12 | 2110 | 2110 | — | 30.38 | 30.38 | 0.0% | 0.3 | 0.3 | — | 29.4 | 29.4 | — |
| 13 | UN13 | 2565 | 3139 | — | 32.98 | 39.72 | 20.4% | 0.43 | 0.43 | — | 38.5 | 40.1 | — |
| 14 | UN14 | 2367 | 2815 | — | 33.14 | 43.7 | 31.9% | 0.36 | 0.5 | — | 30.5 | 37 | — |
| 15 | UN15 | 2599 | 2972 | — | 35.23 | 39.92 | 13.3% | 0.51 | 0.5 | — | 36.6 | 41.8 | — |
| 16 | UN16 | 2324 | 3119 | — | 30.53 | 49.6 | 62.5% | 0.39 | 0.48 | — | 32.2 | 36.6 | — |
| 17 | UN17 | 2627 | DNC | — | 36.36 | DNC | — | 0.5 | 0.54 | — | 43.2 | 42.9 | — |
| 18 | UN18 | 2757 | 3558 | — | 33.89 | 44.1 | 30.1% | 0.36 | 0.43 | — | 30.1 | 32.7 | — |
| 19 | UN19 | 3100 | 3505 | — | 37.6 | 40.55 | 7.8% | 0.61 | 0.7 | — | 36.2 | 42.3 | — |

`DNC` = did not complete / no retest on file — kept as-is rather than blank, worth adopting as a
distinct status from "no data at all."

---

## B. Multi-group slide deck (Pineapple-style)

A PowerPoint with one **team overview** slide, then per-training-group sections (this org runs 6
separate training groups, not "teams" in the org/roster sense — closer to what this app calls
squads within a team). Each group gets:

1. A **group summary slide**: 4 small trend charts (Jump Height, RSImod, Deadhang, 5-10-5 —
   each as a "group average over time" line/bar), plus a roster-status box: Roster Size / Tested
   Before+After / Single Test Only / No Data on File / **Avg % Change** (mean %Δ across all 6
   metrics, for athletes who have both a before and after test — explicitly direction-adjusted
   so a faster 5-10-5 time counts as positive).
2. Three **detail table slides**, one per metric family, each row = one athlete, columns =
   Before / After / %Δ for each metric in that family:
   - *Jump Testing*: Abalakov height, Squat Jump height
   - *RSImod (ForceDecks)*: CMJ RSImod, ABCMJ RSImod
   - *Agility & Deadhang*: 5-10-5, Deadhang

This slide-per-metric-family split (rather than one giant table) is worth carrying into the PPTX
exporter — it keeps each slide legible instead of cramming every metric into one wide table.

Group summary slide (no athlete-level data, safe to reproduce as-is):

| Group | Roster | Tested Before+After | Single Test Only | No Data | Avg % Change |
|---|---|---|---|---|---|
| Jet Speed | 18 | 5 | 11 | 2 | +9.5% |
| Rekker | 7 | 0 | 7 | 0 | N/A |
| Mach | 8 | 5 | 3 | 0 | +7.4% |
| Fem 1 | 6 | 3 | 3 | 0 | +7.5% |
| Fem 2 | 5 | 5 | 0 | 0 | +12.6% |
| Alpha 1+2 | 11 | 10 | 0 | 1 | +2.6% |

Anonymized detail tables — full **Mach** group shown (includes `Athlete MA04`, the same person
as report D below, cross-referenced deliberately); the other 5 groups follow the identical column
shape and are omitted here for length, not because they differ structurally.

**Mach — Jump Testing** (Abalakov cm / Squat Jump cm):

| Athlete | Abalakov Before | Abalakov After | %Δ | Squat Jump Before | Squat Jump After | %Δ |
|---|---|---|---|---|---|---|
| MA01 | 30.60 | 32.30 | +5.6% | 28.30 | 29.00 | +2.5% |
| MA02 | 34.00 | 38.00 | +11.8% | 27.00 | 31.00 | +14.8% |
| MA03 | 30.20 | N/A | N/A | 26.80 | N/A | N/A |
| MA04 | 37.00 | 43.80 | +18.4% | 34.50 | 37.80 | +9.6% |
| MA05 | 52.40 | 54.80 | +4.6% | 43.60 | 47.70 | +9.4% |
| MA06 | 39.10 | N/A | N/A | 36.70 | N/A | N/A |
| MA07 | 43.30 | 45.70 | +5.5% | 37.30 | 40.10 | +7.5% |
| MA08 | 40.40 | N/A | N/A | 37.40 | N/A | N/A |

**Mach — RSImod (ForceDecks)** (CMJ m/s / ABCMJ m/s):

| Athlete | CMJ RSImod Before | CMJ RSImod After | %Δ | ABCMJ RSImod Before | ABCMJ RSImod After | %Δ |
|---|---|---|---|---|---|---|
| MA01 | 0.36 | 0.37 | +2.8% | 0.35 | 0.36 | +2.9% |
| MA02 | 0.32 | 0.33 | +3.1% | N/A | N/A | N/A |
| MA03 | 0.40 | N/A | N/A | 0.36 | N/A | N/A |
| MA04 | 0.49 | 0.43 | -12.2% | 0.49 | 0.55 | +12.2% |
| MA05 | 0.55 | 0.67 | +21.8% | 0.59 | 0.74 | +25.4% |
| MA06 | N/A | N/A | N/A | N/A | N/A | N/A |
| MA07 | 0.62 | 0.56 | -9.7% | 0.52 | 0.49 | -5.8% |
| MA08 | 0.47 | N/A | N/A | 0.77 | N/A | N/A |

**Mach — Agility & Deadhang** (5-10-5 s / Deadhang s):

| Athlete | 5-10-5 Before | 5-10-5 After | %Δ | Deadhang Before | Deadhang After | %Δ |
|---|---|---|---|---|---|---|
| MA01 | 5.49 | 5.41 | +1.5% | 120.00 | 121.00 | +0.8% |
| MA02 | 5.88 | 5.60 | +4.8% | 96.00 | 100.00 | +4.2% |
| MA03 | 5.40 | N/A | N/A | 124.00 | N/A | N/A |
| MA04 | 5.25 | 4.96 | +5.5% | 48.00 | 60.00 | +25.0% |
| MA05 | 5.28 | 4.82 | +8.7% | 120.00 | 124.00 | +3.3% |
| MA06 | 5.34 | N/A | N/A | 115.00 | N/A | N/A |
| MA07 | 5.21 | 5.09 | +2.3% | 90.00 | 115.00 | +27.8% |
| MA08 | 5.45 | N/A | N/A | 135.00 | N/A | N/A |

Roster sizes for the other 5 groups (for seeding purposes later, if useful): Jet Speed 18,
Rekker 7, Fem 1 6, Fem 2 5, Alpha 1+2 11 — same 3-table-per-group shape, anonymized codes would
follow the same `{GROUP}{NN}` pattern (e.g. `JS01`–`JS18`).

---

## C. Individual KPI trend dashboard (Ostridge-style)

One athlete, career-to-date. Header block: name, team, position, ~~DOB~~ *(redacted — real DOB
is PII, not carried into this reference)*, headshot *(not reproduced)*.

Body:
- A **trend table**: one row per metric (Bodyweight, CMJ, RSI Mod, SJ, N/kg, 10m Sprint, IMTP),
  columns = first score / most recent score / % change / a tiny inline sparkline of every test in
  between (not just first→last).
- A **radar chart**: athlete's own most-recent standardized scores vs. team average, one axis per
  metric (Bodyweight, CMJ, IMTP, Chin-up, Cooper laps, SJ, 10m Sprint).
- Several **time-series charts**, each metric plotted as bars/line across every test date with a
  **team-average reference line** overlaid (not just the athlete's own trend in isolation).
- A one-line **glossary** per metric at the bottom, phrased for a coach/parent/athlete audience,
  not a sports-science audience — e.g. "RSI Mod — Reactive strength - Speed of change of
  direction and lower body power."

Anonymized sample (`Athlete OS01`, Varsity, Defence), testing window 2025-09-08 → 2026-03-04:

| Metric | First Score | Latest Score | %Δ |
|---|---|---|---|
| Bodyweight | 187 | 188 | +0.53% |
| CMJ | 44.4 | 47.5 | +6.53% |
| RSI Mod | 0.57 | 0.58 | no further test on file |
| SJ | 42.7 | 49.4 | +13.56% |
| N/kg | 31.04 | 35.79 | no further test on file |
| 10m Sprint | 1.21 | 1.14 | +6.14% |
| IMTP | 2630 | 3039 | +13.46% |

CMJ full time series shown in the source (8 tests): 44.4, 46.2, 45.3, 42.6, 42.3, 43.6, 46.7,
46.3, 47.5 — team average held flat around 34 across the same window, giving a visual sense of
"this athlete is well above team average and still climbing," which the radar chart reinforces.

---

## D. Individual before/after testing-block summary (Isaac Dezan / Pineapple-style)

One athlete, one discrete testing block (not career-to-date — a defined before/after window,
here Jun 23 → Aug 6, 2026). This is the report type most focused on **communicating a story**
rather than just displaying numbers — worth treating as a distinct export target from report C,
not a variant of it.

Layout:
- Org header (logo + name), athlete name, group, before/after dates.
- Two callout boxes: **Strongest Gain** and **Focus Area** — auto-picked as the best and worst
  %Δ across the tested battery, each with a plain-language framing, not just the raw number.
- A **radar/web chart**: each axis = one test, point position = that test's result as % of the
  athlete's own training-group average (not a fixed scale), point *color* = the athlete's own
  before→after %Δ bucketed into improvement (green, >5%) / stable (amber, ±5%) / decline (red,
  >5%) / N/A. Direction-adjusted per metric (a faster 5-10-5 time plots further out).
- A **card grid**, one card per metric: %Δ badge, before → after raw values, and a one-line
  contextual sentence relative to the group ("42% below the post-test group average" /
  "Right at the post-test group average").
- A **narrative paragraph**, auto-composed from the same data: names the strongest gain, lists
  every metric that improved, calls out the one that declined with a plausible non-alarming
  explanation ("often points to a longer loading phase or accumulated fatigue rather than a
  strength loss"), and closes with a specific training recommendation.
- A second **glossary page**, bilingual (English/French — this program serves a Quebec
  audience), one paragraph per metric explaining both what it measures and what it means on-ice
  specifically (not generic sports-science text) — same each-metric-tied-to-the-sport framing as
  report C's footer glossary, just longer-form.

Anonymized data (`Athlete MA04` — same person as `MA04` in report B's Mach tables):

| Metric | Before | After | %Δ | Context |
|---|---|---|---|---|
| Abalakov Jump Height | 37.0cm | 43.8cm | +18.4% | Right at the post-test group average |
| Squat Jump Height | 34.5cm | 37.8cm | +9.6% | Right at the post-test group average |
| Deadhang | 48.0s | 60.0s | +25.0% | 42% below the post-test group average |
| ABCMJ RSImod | 0.5 m/s | 0.6 m/s | +12.2% | Right at the post-test group average |
| CMJ RSImod | 0.5 m/s | 0.4 m/s | -12.2% | 9% below the post-test group average |
| 5-10-5 Agility | 5.2s | 5.0s | +5.5% | 4% above the post-test group average |

Strongest gain: Deadhang (+25.0%). Focus area: CMJ RSImod (-12.2%). Average across all 6
metrics: +9.8%.

---

## Cross-cutting notes for the build plan

- **Metric vocabulary used across all 4 sources**: IMTP, Relative Strength (N/kg), RSI mod / CMJ
  RSImod / ABCMJ RSImod, Jump Height, CMJ, SJ, Abalakov, Bodyweight, 10m Sprint / 10m Fly,
  5-10-5 Pro-Agility, Deadhang, Chin-up, Cooper (laps). This is a subset of the fuller test list
  in Josh's 8/17 notes — confirms those notes are the authoritative target list, these 4 files
  are precedent for *how to display* whatever subset is actually tested for a given group.
- ~~**"DNC" / "N/A" / blank-with-reason are three different states**~~ **Built 2026-08-18** — a
  did-not-complete result can now be entered explicitly (bulk entry grid, quick correction form,
  or a `DNC` cell in an uploaded CSV/XLSX) and is carried through as its own status rather than a
  blank. Progress Grid, Season Deck, and Weekly Insight now render three distinct non-numeric
  states per cell: `DNC` (attempted, not completed), `Not retested` (real history exists, just
  nothing new at this checkpoint), and a plain `—` (never tested at all). See
  `src/lib/selectors.js`'s `resolveCheckpoint()` and `docs/DATA_MODEL.md`. Report A's
  metric-level "why" footnote (e.g. "never re-tested due to weather") is still not modeled — that
  would be a free-text note per DNC entry, not built, since no request for it has come in yet.
- **Every report computes against a reference population** (team/group average) rather than
  showing raw numbers in isolation — this shows up in all 4 formats, just at different levels
  (career trend vs. group average line; radar vs. team average; % of group average; etc.).
- **Light/white report backgrounds**, even though these are exports rather than the live app —
  consistent with Josh's 8/17 note preferring white backgrounds and simple values over busy/dark
  displays for anything meant to be read by coaches or players, not just him.
