# Stage A — Audit of the existing WordPress conversion (read-only)

Source commit: `abc23ef6ddbd4a74111f6c0347504a35eb746002` (`arena/dfee8ce0-raouf`).
No source file, theme file, archive or documentation was modified in this stage.

## Existing conversion
`wordpress-conversion/` — 126 files, untracked: 104 theme files (28 PHP, 67 images, 3 fonts), 2 tools, 11 QA scripts/results, 4 docs, 4 dist deliverables. Dist: theme ZIP 5,379,812 B (103 entries), source-code.zip 5,407,583 B (111 entries), 2 PDFs.

## What was independently re-verified
- PHP lint 28/28 clean (PHP 8.5.12 WASM).
- 71/71 assets byte-identical to `public/assets`; theme ZIP parity 103/103 (one intentional dev-file exclusion).
- Fresh Chromium screenshots: home + gallery at 1366x768 and 390x844 → 4/4 pairs `AE=0`, identical dimensions and file sizes.
- Head metadata comparison on all 11 routes (not covered by earlier body-only DOM audit) → **duplicate canonical and duplicate robots meta on 10 pages**.
- Live `post_content` inspection → **69 hardcoded installation URLs**, no tokens left (domain change breaks assets/links).
- `source-code.zip` is stale (no docs, missing 3 QA scripts).

## Defects
| ID | Sev | Issue |
| --- | --- | --- |
| D01 | high | `post_content` bakes absolute site URLs at import time (setup.php expands tokens before insert) |
| D02 | high | duplicate `<link rel="canonical">` (core `rel_canonical` + theme) |
| D03 | med | duplicate robots meta (core `wp_robots`) |
| D04 | med | `source-code.zip` stale / missing docs and QA scripts |
| D05 | med | admin submissions list omits the actual message body and email; CPT `show_ui=false` |
| D06 | low | `inc/icons.php` missing `defined( 'ABSPATH' ) || exit` |
| D07 | low | CJK typos in `qa/make-pdfs.mjs`, `docs/conversion-report.md` and the generated PDF |
| D08 | low | Persian typos in `readme.txt` |
| D09 | low | POT has 28 msgids vs 33 translation calls |
| D10 | low | stale comments (`inc/media.php` reference, converter docblock artifact) |
| D11 | info | only 6/67 images replaceable via Media Library (document as limitation) |
| D12 | info | internal hrefs absolute via `home_url()` — intentional, visually identical |
| D13 | info | 3 `@font-face` URLs absolute → relative — necessary, no visual change |

## Items NOT re-tested in Stage A
Full 60-pair visual comparison, all 6 viewports, form endpoints, admin upload/activation, PHP runtime log, browser interactions — reserved for Stage F. Prior artifacts exist but were not blindly accepted.

## Conclusion
The previous theme is substantially correct (lint, assets, pixel fidelity samples all pass), but is **not** production-ready: D01–D05 must be fixed before packaging. Stage B will prepare the corrected architecture without altering the original source.
