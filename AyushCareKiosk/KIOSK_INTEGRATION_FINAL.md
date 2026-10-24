# Kiosk Integration Update

- Dynamic interview language comes from Node -> Python language registry.
- Missing UI localization strings are translated through the Node -> Python -> Bhashini translation endpoint.
- Static localization remains available as a fast first render/fallback.
- ABHA replaces the old public Patient ID in the Kiosk UI/session state.
- Department doctors are filtered by the selected hospital/department/pathway through the backend.
- Question responses can carry pre-synthesized Bhashini TTS audio; the Kiosk plays it after a 500ms delay without a second network TTS request.
- Top speaker toggle is a global mute/enable control and stops active audio immediately when muted.
- Audio buttons have loading/playing/stop states and old audio is stopped when a question unmounts.
- Microphone is a tap-to-start/tap-to-stop control using the shared SpeechRecorder service.
- Page narration starts after 500ms on non-interview screens while audio is enabled.
- QR document processing is polled; when new documents finish, the Kiosk requests a live document-aware summary.
- Static UI captions/subtitles under the main heading were removed from the affected screens.
