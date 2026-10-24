# P2Care Hospital & Doctor Panel (HNDPANEL)

Next.js admin and doctor panel for P2Care — clinical workspace, emergency/SOS dashboard, and hospital operations.

## Features

### Doctor Console
- Patient queue and consultation management
- AI-generated clinical summary with accept/reject/edit workflow
- Patient vitals, uploaded documents, and report review
- Consultation notes and sign-off

### Hospital Admin
- **Emergency / SOS Dashboard** — real-time case list, acknowledge, assign, escalate, resolve, notes, and action timeline
- **Unidentified Emergency Cases** — separate workflow for patients who cannot be identified
- Department and pathway management (Allopathy / Ayurveda)
- Doctor roster, room assignment, and schedule management
- OPD token and queue operations

### Access Management
- Time-limited patient data access grants (≤36 hours, server-enforced)
- Scoped data categories with mandatory audit logging
- Access expiry and revocation support

## Run

```bash
npm install
npm run dev       # Next.js dev server, default port 3000
```

## Build

```bash
npm run build
npm start         # Production server
```

## Demo Credentials

The login page includes one-click auto-fill buttons for testing:

| Role | Email | Password |
| --- | --- | --- |
| Hospital Admin | `admin@ayushcare.com` | `Admin@123` |
| Doctor (General Medicine) | `dr.rajesh.sharma@ayushcare.com` | `Doctor@123` |
| Doctor (Cardiology) | `dr.ananya.sen@ayushcare.com` | `Doctor@123` |

## Configuration

Connects to the P2Care Backend API. Configure `NEXT_PUBLIC_API_URL` in environment. Default: `http://localhost:8001`.

## Tech Stack

- Next.js 16 (App Router)
- React + TypeScript
- Tailwind CSS
- Zustand (auth state management)
- Axios (HTTP client)
- Lucide React (icons)
