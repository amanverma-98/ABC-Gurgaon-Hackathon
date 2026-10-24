# AyushCare Mobile — Backend Connected

This version connects the patient mobile companion to the current AyushCare backend for the live kiosk-pairing/document flow.

## Local setup

1. Start AyushCare backend on port 8000.
2. Create `.env` from `.env.example`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the mobile app at `http://localhost:5174/`.

For physical-phone QR testing, run the app on a LAN-accessible address and set the kiosk's `VITE_MOBILE_PAIR_URL` to that address.

## Live integrations

- Mobile portal OTP: `/api/v1/mobile/portal/auth/send-otp` and `/verify-otp`
- Kiosk pairing: `/api/v1/mobile/kiosk-session/pair/{pairing_token}`
- S3 upload URL: `/api/v1/mobile/kiosk-session/{session_id}/upload-url`
- Document registration: `/api/v1/mobile/kiosk-session/{session_id}/register-document`
- Kiosk document status: `/api/v1/mobile/kiosk-session/{session_id}/documents`
- Kiosk sync: `/api/v1/mobile/kiosk-session/{session_id}/sync`

The mobile app no longer uses the previous mock kiosk session or mock OCR service for this flow.

## Important current backend limitation

The current backend does not expose appointment/visit APIs, so those mobile screens return empty live results instead of showing fabricated demo records.

The backend's asynchronous OCR worker must have its consultation lookup fixed before live document analysis can complete.
