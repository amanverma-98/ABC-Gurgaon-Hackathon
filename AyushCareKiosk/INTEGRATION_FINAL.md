# Final Kiosk Integration
Clinical kiosk session is independent from Mobile. The Kiosk generates a one-time patient-account QR at `/intake/session/:session_id/patient-upload-qr`; the QR expires in 45 seconds. Mobile QR does not attach to a kiosk session. English/Hindi voice uses the same conversation answer loop as text and TTS uses the GET TTS endpoint.
