# P2Care Kiosk

Patient-facing kiosk application for P2Care — multilingual intake, AI clinical interview, emergency SOS, and clinical handoff.

## Features

- Multilingual welcome and language selection
- ABHA identity verification and patient registration
- Department and pathway routing (Allopathy / Ayurveda)
- AI-guided clinical interview (text + voice)
- Vitals capture and red-flag screening
- QR handoff for mobile document upload
- Clinical summary generation and review
- Consent management and privacy controls
- Token generation and queue assignment
- **Emergency/SOS intake** — identified SOS with OTP and unidentified emergency intake with category selection

## Run

```bash
npm install
npm run dev       # Vite dev server, default port 5173
```

## Build

```bash
npm run build
npm run preview   # Preview production build
```

## Configuration

The kiosk connects to the P2Care Backend API. Configure the API base URL in the environment or service configuration. Default: `http://localhost:8001`.

## Tech Stack

- React + Vite
- Zustand (state management)
- Axios (HTTP client)
- Lucide React (icons)
