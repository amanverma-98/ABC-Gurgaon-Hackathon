# AyushCare Backend — Verification

## Fixed
- Reconciled `kiosk.routes.js` named imports with `kiosk.controller.js` exports.
- `createPatientUploadQr` now belongs to the Kiosk controller; QR hashing/JWT signing are shared through `src/services/patientQrService.js`.
- Preserved Mobile `exchangePatientUploadQr` without creating a Mobile/Kiosk-session dependency in the patient portal QR flow.
- Added/retained patient QR token schema and privacy-sharing schema.
- Added compatibility upgrades for existing consent, consultation and document schemas.
- Preserved existing kiosk/mobile endpoints for backward compatibility.

## Static verification performed
- `node --check` on every JS file under `src/`: PASSED.
- Local ESM named-import/export audit: PASSED; 0 missing named exports.
- ZIP integrity check: PASSED.
- Runtime route import could not be executed in the packaging environment because `node_modules` is intentionally not shipped and `express` is therefore unavailable there.
- `npm test` was not run because package.json has no test script and dependencies are not installed in the packaging environment.

## Required local validation
Run in the extracted backend:

```powershell
npm install
npm run dev
```

Then verify:
- `GET /health`
- Kiosk routes register without ESM import errors.
- Neon connection succeeds.
- AI base URL points to the AI service, not the backend port.

## Environment
Copy your existing local `.env` or create one from `.env.example`. Never commit real credentials.
