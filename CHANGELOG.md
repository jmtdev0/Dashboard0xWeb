# CHANGELOG

### 17/03/2026
* Added `GET /api/todos/export` endpoint — returns the full TODO list as JSON, authorized via `Authorization: Bearer <password>` (bcrypt-verified against `PRIVATE_PASSWORD_HASH`)

### 01/03/2026
* Added Calendar section accessible from the bifurcation screen (events with title, date, description; month grid view and upcoming events view)
* Completed TODOs now separated into their own tab and no longer count toward the 200 active limit
* Category name is now displayed inline on each TODO item as a badge (with breadcrumb for subcategories)
* Filtering by a parent category now includes TODOs from all its subcategories
* Replaced status filter dropdown with tab buttons showing counts (Active / Completed / All)
* Added events API, storage layer, and database schema
* Fixed "Volver" to "Back" for English consistency
