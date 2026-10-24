# AyushCare Kiosk

Patient-facing kiosk frontend connected to the AyushCare backend and MediKiosk AI gateway. Doctor/admin screens are outside this app scope.

## Flow
1. Welcome + 22-language switch
2. Patient identification + pathway selection (Ayurveda/Allopathy)
3. Backend department/doctor routing
4. Adaptive MediKiosk AI interview
5. Vitals
6. Mobile QR document upload + backend sync
7. AI summary + consent
8. OPD token + completion

## Environment
Copy `.env.example` to `.env`:

```env
VITE_API_BASE_URL=http://localhost:8001/api/v1
VITE_KIOSK_ID=KIOSK-MAIN-01
VITE_MOBILE_PAIR_URL=http://localhost:5174
```

`VITE_MOBILE_PAIR_URL` must match the route used by the final AyushCare Mobile app to receive a `pairing_token`.

## Architecture
React calls only the AyushCare backend. AI and Bhashini credentials stay server-side. Dynamic questions, red flags, summaries and speech are supplied by backend/AI; static kiosk controls use local language dictionaries for the 22 supported Indian languages.

## Note on QR rendering
The screen includes a QR image generated from the short-lived pairing payload and always shows the pairing code as a fallback. For a fully offline kiosk deployment, replace the remote QR renderer with a bundled QR generator without changing the pairing API contract.
