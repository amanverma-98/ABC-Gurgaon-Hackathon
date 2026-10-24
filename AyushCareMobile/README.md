# P2Care Mobile

Patient mobile companion for P2Care — QR-connected document uploads, visit history, records, and privacy controls.

## Features

- OTP-based patient authentication
- Active consultation status and queue context
- Visit history and appointment tracking
- Medical records and document vault
- QR kiosk pairing for document upload
- Privacy settings and consent management
- Health summary and vitals view

## Run

```bash
npm install
npm run dev       # Vite dev server, default port 5174
```

## Build

```bash
npm run build
npm run preview
```

## Configuration

Connects to the P2Care Backend API. Default: `http://localhost:8001`.

## Tech Stack

- React + Vite
- React Router
- React Hook Form + Zod
- Zustand (state management)
- Axios (HTTP client)