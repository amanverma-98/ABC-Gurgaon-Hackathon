# Mobile Integration Update

- ABHA is the public patient identifier; internal UUIDs remain hidden implementation identifiers.
- ABHA OTP can be sent to the mobile number registered to the ABHA record. Mobile OTP remains available as a secondary path.
- Mobile language selection now loads supported languages from Node/Python instead of limiting the UI to Hindi/English. Bhashini translation fills missing UI strings.
- A DOM translation layer handles remaining legacy literal UI text and placeholders so old screens can be used in all configured languages without duplicating language maps.
- Document capture accepts JPEG/PNG/WebP/PDF; uploads go through Node/S3 and asynchronous Python/Azure processing.
- Previous visits now load full visit details, clinical summary, vitals and linked documents from the backend.
- Patient privacy controls are granular by hospital, visit and document.
- Privacy rules control doctor access; patients retain full access to their own portal records.
