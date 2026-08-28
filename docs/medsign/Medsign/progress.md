# Progress Diary - MedSign AI

## Navigation
* [[README.md|Back to README]] | [[STATUS.md|Active Status]] | [[decisions.md|Decisions Log]]

## [2026-08-28] - Database Migration & NLG/UI Polish
* **Database:** Migrated database layer from SQLite (`medsign.db`) to Supabase PostgreSQL. Created 24 database tables and transferred all rows.
* **NLG / AI Notetaker:** Added direct Google Gemini REST integration to generate medical SOAP notes. Resolved FastAPI coroutine/unpacking crash by rewriting `summarize_session` as `async def` returning a typed dictionary.
* **TTS Polish:** Added regex filter `/[_-]/g` inside `speak()` in `AppContext.jsx` to replace dashes and underscores with spaces so SpeechSynthesis reads words naturally.
* **Hand Tracking:** Increased MediaPipe `modelComplexity` from `0` (Lite) to `1` (Full) inside `useMediaPipe.js` to ensure robust dual hand detection.
* **Homepage Manager:**
  * Added **Tentang Kami (Team Gallery)** CRUD module linked to backend.
  * Added photo previews in the Instagram Feed table list.
  * Fixed `ImageUpload` token authentication error by parsing `medsign_user` JSON string in `localStorage`.
* **UI/UX Refinements:**
  * Added horizontal layout padding in Doctor View.
  * Corrected button contrast for "Mulai Sesi Konsultasi".
  * Simplified Super Admin view by removing legacy duplicate tabs.
  * Adjusted desktop navbar responsive layout breakpoint to `1024px`.
  * Updated Home scroll overlay offset to `-mt-[100vh]` for curtain parallax effect.
* **Security:** Configured 2-hour inactivity session expiry and auto-logout.
* **Auditing:** For security logs, refer to [Implementation Audit & Change Log](../implementation-audit.md) and [Audit Change Log](../audit-change-log.md).

## [2026-07-19] - Performance & ML Optimization
* **Performance:** Fixed input camera lag by rendering direct `<video>` element, boosting FPS to 30+ FPS. Added WebSocket dependency in requirements.
* **Duplicate Guard:** Added `lastAppendedWordRef` to prevent spamming duplicate spoken words on hold-gestures.
* **Bulk Delete:** Added bulk delete checkbox and button in Check Dataset modal.
* **Localization:** Implemented dynamic ID/EN translation for Vite app and Next.js page.
* **3D Visuals:** Integrated 3D joint sphere reflection and 3D card hover effects.
* **Motion Visualizer:** Added Jejak Neon (neon trails) and 5 options for exporting HAKI tutorials (10s, 30s, 45s, 1m, 2m).
