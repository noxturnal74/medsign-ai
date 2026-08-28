# Decisions Log - MedSign AI

## Navigation
* [[README.md|Back to README]] | [[STATUS.md|Active Status]] | [[progress.md|Progress Diary]]

## [2026-08-28]
### 1. MediaPipe Model Complexity Upgrade
* **Decision:** Changed `modelComplexity` from `0` (Lite) to `1` (Full).
* **Rationale:** Clinical translation demands high accuracy for multi-hand and overlapping gestures. Full landmark model is necessary despite slightly higher CPU usage.
* **Revisit:** Evaluate performance on lower-end tablets.
* **Referenced Doc:** Check [Dataset Recording Guide](../README_REKAM_DATASET.md)

### 2. Direct Gemini REST API Integration
* **Decision:** Connect to Google Gemini using direct HTTP requests via `requests` library instead of installing `google-generativeai`.
* **Rationale:** Keeps backend dependencies light and prevents package dependency version conflicts.
* **Revisit:** When switching to newer API versions.

### 3. Unified Supabase Configuration
* **Decision:** Migrate SQLite database to Supabase and query via REST API, keeping SQLite as a fallback.
* **Rationale:** Production deployment requires cloud hosting, and Supabase already supports RLS out-of-the-box.
* **Revisit:** During production launch.
* **Referenced Doc:** Check [Project Brief (Auth & Sessions)](../PROJECT_BRIEF.md)

### 4. Home Scroll Curtain Parallax
* **Decision:** Set Home main container margin-top offset to `-mt-[100vh]`.
* **Rationale:** Ensures the Scrollytelling Hero stays fully pinned in the background while the white page content slides up like a curtain, covering it completely.
* **Revisit:** If homepage layout changes.

## [2026-06-11]
### 1. Single Source of Truth for Labels
* **Decision:** Keep `labels.json` as the single source of truth for all clinical and general word labels.
* **Rationale:** Prevents mismatches between backend class indexes and frontend vocabulary rendering.
