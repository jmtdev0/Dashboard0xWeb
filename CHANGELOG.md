# CHANGELOG

### 17/03/2026
* Added `GET /api/todos/export` endpoint — returns pending TODOs as JSON, authorized via `Authorization: Bearer <password>`
* Fixed public dashboard: replaced all Puppeteer-based scrapers with `fetch` + `cheerio` (no headless browser needed)
  - YouTube: extracts channel ID from HTML, fetches RSS feed for latest video date
  - Twitter: uses syndication API with graceful degradation for 403/429 blocks
  - Instagram: parses `og:description` meta tag
  - Extensions: checks Chrome Web Store availability via HTML title
  - Removed `puppeteer`, `puppeteer-core`, `@sparticuz/chromium` (84 packages, ~64MB saved)
* All 6 dashboard services now return `success: true` on Netlify serverless
* Added BeTheCandle indicator — fetches total USDC distributed from `bethecandle.live/api/community-pot/history`

### 01/03/2026
* Added Calendar section accessible from the bifurcation screen (events with title, date, description; month grid view and upcoming events view)
* Completed TODOs now separated into their own tab and no longer count toward the 200 active limit
* Category name is now displayed inline on each TODO item as a badge (with breadcrumb for subcategories)
* Filtering by a parent category now includes TODOs from all its subcategories
* Replaced status filter dropdown with tab buttons showing counts (Active / Completed / All)
* Added events API, storage layer, and database schema
* Fixed "Volver" to "Back" for English consistency
