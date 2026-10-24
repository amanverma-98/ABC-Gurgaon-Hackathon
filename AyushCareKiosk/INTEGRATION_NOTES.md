# AyushCare Kiosk integration notes (updated)
- Uses `VITE_API_BASE_URL` for all backend requests; no direct AI calls from the browser.
- Uses `/api/v1/intake` for patient/session/AI/summary/consent APIs and `/api/v1/mobile` only for the kiosk-mobile document bridge.
- Patient flow: Welcome -> New/Existing -> patient details/lookup -> department+doctor+consent -> AI interview -> vitals -> QR -> review -> token.
- The touch keyboard opens only from its keyboard icon; it can be resized and dragged using the four-direction Move handle.
- AI interview is capped at 8 questions and multi-select is enabled only when the AI marks the question as multi-select.
- QR bridge is closed after 45 seconds to prevent kiosk blocking.
- Language changes are synchronized to the backend once a consultation exists.
