# Impact Counter Repair QA

**Date:** 2026-08-14

## Verified values

| Time frame | Metric | Verified display |
|---|---|---:|
| Historical track record | Events delivered | `4+` |
| Historical track record | Women participants reached | `~600` |
| Historical track record | Paid participants | `422` |
| Historical track record | Free participants | `178` |
| Next 12 months | Planned events | `9` |
| Next 12 months | Planned cities | `4` |

## Root-cause repair

The previous implementation hydrated the correct source values but then ran `runCounter()`, a count-up routine that rewrote every metric from `0` through intermediate values. It relied solely on an `IntersectionObserver` with a `0.6` threshold. Direct `/#impact` navigation, page restores, and navigation timing could therefore leave visitors seeing a zero or an unfinished value.

The revised implementation keeps `assets/site-data.js` as the source of truth and hydrates the final value before any motion occurs. It no longer numerically counts from zero. A short `metricValueIn` presentation animation provides continuity with the site’s visual language without ever changing the verified number. The new observer uses a low threshold and a viewport check, while `pageshow` rehydrates and reveals metrics when a page is restored from cache. HTML fallback values remain correct if the data asset is unavailable, and a load-time retry is retained for late data.

## Semantic separation

The Impact section now presents two explicit groups. **Historical track record** covers the first four gatherings. **Next 12 months** covers the planned programme and is visibly labelled “Planned programme — not achieved impact.” The group also states the planning context: approximately 1,125 planned participant places at the 125-per-event planning midpoint.

## Verification performed

| Test path | Result |
|---|---|
| Desktop direct URL `/#impact` | All six final values were sourced and nonzero. |
| Page reload | All six final values persisted. |
| Homepage navigation to Impact | All six final values appeared after the existing reveal effect. |
| Phone viewport (390 px) | Mobile media rule matched; both metric grids became one column; all values remained correct. |
| Animation behavior | Presentation-only entrance completed without setting any metric to zero. |
| Contribution-reference audit | No obsolete five-dollar contribution reference remains in the repository; public contribution wording is `$10`. |
| Zero-value audit | No literal zero-value metric markup or `data-count="0"` occurrence was found. |

The final cache-bypassed desktop assertion and the isolated phone-browser assertion both returned the exact sequence `4+`, `~600`, `422`, `178`, `9`, and `4`, with zero zero-valued metrics.
