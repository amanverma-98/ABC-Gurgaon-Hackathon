# AyushCare Patient QR Portal Flow

The hospital kiosk and mobile app have separate session concepts.

## Kiosk
The kiosk owns the clinical consultation and AI session. It generates a short-lived patient-upload QR using:

`POST /api/v1/intake/session/:session_id/patient-upload-qr`

The QR is valid for 45 seconds and contains a one-time token.

## Mobile QR
The mobile app receives `?qr_token=...` and exchanges it at:

`POST /api/v1/mobile/portal/qr/exchange`

The backend validates the token, identifies the patient + consultation, marks the token used, and returns the same JWT-style patient access token used by the normal portal login.

The mobile app then routes directly to document upload (`M2`) instead of showing kiosk-session connection screens.

## Documents
1. Mobile requests a presigned URL from `/mobile/portal/documents/upload-url`.
2. Mobile uploads the image directly to S3.
3. Mobile registers it at `/mobile/portal/documents/register`.
4. Backend retrieves the S3 object and sends it to the AI OCR/document-intelligence endpoint.
5. Extracted data, abnormal values and processing status are stored in `uploaded_documents` against the patient's consultation.
6. Mobile polls `/mobile/portal/documents/:document_id` and displays the extracted information/insights.

Only JPEG/PNG/WebP images are accepted by the AI path.
