import { ApiResponse } from '../utilities/ApiResponse.js';
import { asyncHandler } from '../utilities/asyncHandler.js';
import { ApiError } from '../utilities/ApiError.js';
import pool from '../database/dbConnection.js';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { sendSMS } from '../utilities/smsHelper.js';
import { saveOTP, verifyOTP } from '../utilities/otpStore.js';

import AiServiceGateway from '../services/aiService.js';
import { assertSupportedLanguage } from '../services/languageService.js';
import { hashQrToken, signPatientToken } from '../services/patientQrService.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
};


const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};


const executeOcrStreamingPipeline = async (consultationId, documentId, fileKey, docType) => {
    try {
        const consultation = await pool.query(
            "SELECT ai_session_id FROM consultations WHERE id = $1",
            [consultationId]
        );
        let aiSessionId = consultation.rows[0]?.ai_session_id;
        if (!aiSessionId) {
            aiSessionId = `doc-session-${consultationId}`;
            await pool.query(
                "UPDATE consultations SET ai_session_id = $1, updated_at = NOW() WHERE id = $2",
                [aiSessionId, consultationId]
            );
        }

        await pool.query("UPDATE uploaded_documents SET status = 'processing', processing_error=NULL, updated_at=NOW() WHERE id = $1", [documentId]);

        const command = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: fileKey });
        const s3Object = await s3Client.send(command);
        if (!s3Object.Body) throw new Error(`S3 object has no body for key ${fileKey}`);

        const buffer = await streamToBuffer(s3Object.Body);
        if (!buffer.length) throw new Error(`Uploaded image is empty for key ${fileKey}`);

        const extension = String(fileKey.split('.').pop() || '').toLowerCase();
        const extensionMime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
        const mimeType = extensionMime[extension] || s3Object.ContentType || 'application/octet-stream';
        const supported = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']);
        if (!supported.has(mimeType)) throw new Error(`Unsupported stored image type: ${mimeType}`);

        const fileName = fileKey.split('/').pop() || `document-${documentId}.jpg`;
        console.log(`[OCR Integration] Sending ${buffer.length} bytes (${mimeType}) to AI for document ${documentId}`);

        let extractedData;
        let lastError;
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                extractedData = await AiServiceGateway.uploadDocument(
                    aiSessionId,
                    buffer,
                    mimeType,
                    fileName,
                    docType || 'medical_document'
                );
                break;
            } catch (error) {
                lastError = error;
                console.error(`[OCR Integration] AI upload attempt ${attempt} failed for ${documentId}:`, error?.message || error);
                if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        if (!extractedData) throw lastError || new Error('AI document upload returned no result');
        const aiStatus = String(extractedData?.processing_status || extractedData?.status || '').toLowerCase();
        const aiFailed = ['failed', 'ocr_failed', 'no_text_detected', 'error'].includes(aiStatus) || Boolean(extractedData?.error);
        const finalStatus = aiFailed ? 'failed' : 'completed';
        const processingError = aiFailed ? (extractedData?.error || `AI document processing returned status: ${aiStatus}`) : null;

        const aiEntities = Array.isArray(extractedData?.entities) ? extractedData.entities : [];
        const structuredData = {
            ...extractedData,
            medicines: extractedData.medicines || aiEntities.filter(e => e.kind === 'medicine').map(e => ({
                name: e.label,
                dosage: e.dosage,
                frequency: e.frequency,
                route: e.route
            })),
            diagnoses: extractedData.diagnoses || aiEntities.filter(e => e.kind === 'condition').map(e => ({
                name: e.label,
                diagnosis: e.label,
                icd_code: e.icd_code
            })),
            investigations: extractedData.investigations || aiEntities.filter(e => ['lab-result', 'procedure', 'vital-sign'].includes(e.kind)).map(e => ({
                name: e.label,
                value: e.value,
                unit: e.unit,
                reference_range: e.reference_range
            })),
            symptoms: extractedData.symptoms || aiEntities.filter(e => ['symptom', 'complaint'].includes(e.kind)).map(e => ({
                name: e.label,
                symptom: e.label
            })),
            allergies: extractedData.allergies || aiEntities.filter(e => e.kind === 'allergy').map(e => ({
                name: e.label,
                allergy: e.label
            })),
            parsed_date: extractedData.parsed_date || aiEntities.find(e => e.kind === 'document-date')?.value || null,
            raw_text: extractedData.raw_text || extractedData.ocr_text_preview || ''
        };

        await pool.query(
            "UPDATE uploaded_documents SET extracted_data = $1, status = $2, processing_error=$3, source_mime_type=$5, updated_at=NOW() WHERE id = $4",
            [JSON.stringify(structuredData), finalStatus, processingError, documentId, mimeType]
        );
        if (aiFailed) throw new Error(processingError);

        console.log(`[OCR Integration] Successfully processed document ID: ${documentId}`);
    } catch (error) {
        console.error(`[OCR Integration Error] Processing failed for document ID: ${documentId}`, error);
        try {
            await pool.query(
                "UPDATE uploaded_documents SET status = 'failed', extracted_data=$1, processing_error=$2, updated_at=NOW() WHERE id = $3",
                [JSON.stringify({ error: error?.message || 'Document processing failed' }), error?.message || 'Document processing failed', documentId]
            );
        } catch (dbError) {
            console.error(`[OCR Integration Error] Could not persist failure for ${documentId}:`, dbError);
        }
    }
};


const normalizeMobileForLookup = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return '';
};

const resolvePatientConsultation = async (patientId, requestedConsultationId = null) => {
    if (requestedConsultationId) {
        const result = await pool.query(
            `SELECT c.*, p.abha_number, p.full_name
             FROM consultations c JOIN patients p ON p.id=c.patient_id
             WHERE c.id=$1 AND c.patient_id=$2 LIMIT 1`,
            [requestedConsultationId, patientId]
        );
        if (result.rowCount) {
            const row = result.rows[0];
            if (!row.ai_session_id) {
                const aiSessionId = `patient-session-${row.id}`;
                await pool.query('UPDATE consultations SET ai_session_id=$1, updated_at=NOW() WHERE id=$2', [aiSessionId, row.id]);
                row.ai_session_id = aiSessionId;
            }
            return row;
        }

        console.warn(`[Consultation Resolution] Requested consultation ${requestedConsultationId} does not match patient ${patientId}. Falling back to patient active consultation.`);
    }

    const result = await pool.query(
        `SELECT c.*, p.abha_number, p.full_name
         FROM consultations c JOIN patients p ON p.id=c.patient_id
         WHERE c.patient_id=$1
         ORDER BY c.created_at DESC LIMIT 1`,
        [patientId]
    );
    if (result.rowCount) {
        const row = result.rows[0];
        if (!row.ai_session_id) {
            const aiSessionId = `patient-session-${row.id}`;
            await pool.query('UPDATE consultations SET ai_session_id=$1, updated_at=NOW() WHERE id=$2', [aiSessionId, row.id]);
            row.ai_session_id = aiSessionId;
        }
        return row;
    }

    const hospitalId = process.env.DEFAULT_HOSPITAL_ID;
    if (!hospitalId) throw new ApiError(503, 'No hospital is configured for document uploads');
    const inserted = await pool.query(
        `INSERT INTO consultations (hospital_id,patient_id,status,intake_pathway,language)
         VALUES ($1,$2,'waiting_triage','general','en') RETURNING *`,
        [hospitalId, patientId]
    );
    const consultation = inserted.rows[0];
    const aiSessionId = `patient-session-${consultation.id}`;
    const updated = await pool.query('UPDATE consultations SET ai_session_id=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [aiSessionId, consultation.id]);
    return updated.rows[0];
};

// ==========================================
// --- FLOW A: Zero-Login QR Upload ---
// ==========================================

export const pairKioskSession = asyncHandler(async (req, res) => {
    const session = await pool.query(
        `SELECT ks.*, c.patient_id, c.department_id, c.language,
                d.name AS department_name,
                p.abha_number, p.full_name, p.gender, p.date_of_birth,
                p.mobile_number, p.address
         FROM kiosk_sessions ks
         JOIN consultations c ON c.id=ks.consultation_id
         LEFT JOIN departments d ON d.id=c.department_id
         LEFT JOIN patients p ON p.id=c.patient_id
         WHERE ks.pairing_token=$1 AND ks.is_active=TRUE AND ks.expires_at>NOW()
         LIMIT 1`,
        [req.params.pairing_token]
    );
    if (session.rowCount === 0) throw new ApiError(410, "Pairing token expired or invalid");
    return res.status(200).json(new ApiResponse(200, session.rows[0], "Mobile successfully paired to Kiosk"));
});


export const getUploadUrl = asyncHandler(async (req, res) => {
    const { file_name, content_type, consultation_id, document_processing_consent } = req.body || {};
    if (!file_name || !content_type) throw new ApiError(400, 'file_name and content_type are required fields');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(String(content_type).toLowerCase())) {
        throw new ApiError(415, 'Unsupported document type. Use PDF, JPEG, JPG, PNG, or WebP.');
    }

    let folder;
    if (req.user) {
        const consultation = await resolvePatientConsultation(req.user.id, consultation_id || null);
        let consent = await pool.query(
            `SELECT 1 FROM consent_records
             WHERE consultation_id=$1 AND scope_id='document_processing'
               AND status='granted' AND withdrawn_at IS NULL LIMIT 1`,
            [consultation.id]
        );
        if (!consent.rowCount) {
            await pool.query(
                `INSERT INTO consent_records(consultation_id,scope_id,title,purpose,required,status)
                 VALUES($1,'document_processing','Document Processing','Patient-authorized medical document analysis',FALSE,'granted')`,
                [consultation.id]
            );
        }
        folder = `vault/${req.user.id}`;
    } else {
        const kiosk = await pool.query(
            `SELECT id,consultation_id FROM kiosk_sessions
             WHERE id=$1 AND is_active=TRUE AND expires_at>NOW()`,
            [req.params.session_id]
        );
        if (!kiosk.rowCount) throw new ApiError(410, 'Kiosk pairing session expired or invalid');
        folder = `kiosk/${req.params.session_id}`;
    }

    const safeName = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `${folder}/${Date.now()}-${randomBytes(4).toString('hex')}-${safeName}`;
    try {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            ContentType: content_type,
        });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        return res.status(200).json(new ApiResponse(200, { upload_url: presignedUrl, file_key: fileKey }, 'Presigned upload URL generated successfully'));
    } catch (error) {
        throw new ApiError(500, 'Failed to generate upload URL', [error.message]);
    }
});

export const registerDocument = asyncHandler(async (req, res) => {
    const { file_key, document_type } = req.body;
    const { session_id } = req.params;

    if (!file_key || !document_type) {
        throw new ApiError(400, "file_key and document_type are required fields");
    }

    const sessionQuery = await pool.query(
        "SELECT consultation_id FROM kiosk_sessions WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()",
        [session_id]
    );
    if (!sessionQuery.rowCount || !sessionQuery.rows[0].consultation_id) throw new ApiError(410, 'Kiosk pairing session expired or invalid');
    const consultationId = sessionQuery.rows[0].consultation_id;
    const consent = await pool.query(
        `SELECT 1 FROM consent_records
         WHERE consultation_id=$1 AND scope_id='document_processing'
           AND status='granted' AND withdrawn_at IS NULL
         LIMIT 1`,
        [consultationId]
    );
    if (!consent.rowCount) throw new ApiError(403, 'Document processing consent is not granted for this kiosk session');
    const expectedPrefix = `kiosk/${session_id}/`;
    if (!String(file_key).startsWith(expectedPrefix)) {
        throw new ApiError(400, 'file_key does not belong to this kiosk session');
    }
    if (!/\.(jpe?g|png|webp|pdf)$/i.test(String(file_key))) {
        throw new ApiError(415, 'Only PDF, JPEG, PNG, and WebP files can be analyzed');
    }
    const consultation = await pool.query('SELECT ai_session_id FROM consultations WHERE id=$1', [consultationId]);
    if (!consultation.rowCount) throw new ApiError(404, 'Consultation not found');

    const sourceMimeType = /\.pdf$/i.test(file_key)
        ? 'application/pdf'
        : /\.webp$/i.test(file_key)
            ? 'image/webp'
            : /\.png$/i.test(file_key)
                ? 'image/png'
                : 'image/jpeg';
    const document = await pool.query(
        "INSERT INTO uploaded_documents (consultation_id, file_path_hash, document_type, source_mime_type, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id, file_path_hash, document_type, source_mime_type, status",
        [consultationId, file_key, document_type, sourceMimeType]
    );

    const registeredDoc = document.rows[0];

    executeOcrStreamingPipeline(consultationId, registeredDoc.id, file_key, document_type)
        .catch(err => console.error("[OCR Background Process Crash] ", err));

    return res.status(202).json(
        new ApiResponse(
            202,
            registeredDoc,
            "Document registered. Processing asynchronously through FastAPI AI backend."
        )
    );
});

const signedDocument = async (row) => {
    if (!row) return row;
    const directUrl = row.document_url || (row.file_path_hash && (row.file_path_hash.startsWith('http://') || row.file_path_hash.startsWith('https://')) ? row.file_path_hash : null);
    if (directUrl) {
        return { ...row, download_url: directUrl, url: directUrl, document_url: directUrl };
    }
    if (!row?.file_path_hash || !process.env.AWS_BUCKET_NAME) return row;
    try {
        const url = await getSignedUrl(
            s3Client,
            new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: row.file_path_hash }),
            { expiresIn: 300 }
        );
        return { ...row, download_url: url, url: url, retrieval_expires_in: 300 };
    } catch (error) {
        console.error('[Document Retrieval] Failed to sign document', row.id, error?.message || error);
        return row;
    }
};

export const deleteDocument = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `DELETE FROM uploaded_documents d
         USING kiosk_sessions k
         WHERE d.id=$1 AND k.id=$2 AND d.consultation_id=k.consultation_id
         RETURNING d.id,d.file_path_hash`,
        [req.params.document_id, req.params.session_id]
    );
    if (!result.rowCount) throw new ApiError(404, 'Document not found for this kiosk session');

    if (result.rows[0].file_path_hash && process.env.AWS_BUCKET_NAME) {
        try {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: result.rows[0].file_path_hash
            }));
        } catch (error) {
            console.warn('[Document Delete] S3 cleanup failed:', error?.message || error);
        }
    }
    return res.status(200).json(new ApiResponse(200, {document_id:req.params.document_id}, 'File preview deleted'));
});

export const getKioskDocuments = asyncHandler(async (req,res)=>{
    const session=await pool.query('SELECT consultation_id FROM kiosk_sessions WHERE id=$1 AND is_active=TRUE AND expires_at>NOW()',[req.params.session_id]);
    if(!session.rowCount) throw new ApiError(410,'Kiosk pairing session expired or invalid');
    const docs=await pool.query('SELECT * FROM uploaded_documents WHERE consultation_id=$1 ORDER BY created_at DESC',[session.rows[0].consultation_id]);
    const hydrated = await Promise.all(docs.rows.map(signedDocument));
    return res.json(new ApiResponse(200,hydrated,'Kiosk documents loaded'));
});

export const updateKioskSessionLanguage = asyncHandler(async (req, res) => {
    const { language } = req.body || {};
    const selectedLanguage = await assertSupportedLanguage(language);
    const session = await pool.query(
        `SELECT ks.id, ks.consultation_id, c.ai_session_id
         FROM kiosk_sessions ks
         JOIN consultations c ON c.id=ks.consultation_id
         WHERE ks.id=$1 AND ks.is_active=TRUE AND ks.expires_at>NOW()
         LIMIT 1`,
        [req.params.session_id]
    );
    if (!session.rowCount) throw new ApiError(410, 'Kiosk pairing session expired or invalid');
    const row = session.rows[0];
    const ai = row.ai_session_id
        ? await AiServiceGateway.updateLanguage(row.ai_session_id, selectedLanguage.code)
        : null;
    const updated = await pool.query(
        'UPDATE consultations SET language=$1,updated_at=NOW() WHERE id=$2 RETURNING id,language',
        [selectedLanguage.code, row.consultation_id]
    );
    return res.json(new ApiResponse(200, { consultation: updated.rows[0], ai, language: selectedLanguage }, 'Kiosk language synchronized'));
});

export const syncKioskUpload = asyncHandler(async (req, res) => {
    await pool.query('UPDATE kiosk_sessions SET is_active = FALSE WHERE id = $1', [req.params.session_id]);
    return res.status(200).json(new ApiResponse(200, {}, "Mobile sync completed. Connection purged."));
});


export const exchangePatientUploadQr = asyncHandler(async (req, res) => {
    const rawToken = String(req.body?.token || '').trim();
    if (!rawToken) throw new ApiError(400, 'QR token is required');
    const result = await pool.query(
        `SELECT q.id, q.patient_id, q.consultation_id, q.expires_at,
                p.id AS pid, p.abha_number, p.abha_address, p.full_name, p.gender, p.date_of_birth, p.mobile_number, p.address, p.aadhaar_number,
                EXISTS(SELECT 1 FROM consent_records cr WHERE cr.consultation_id=q.consultation_id AND cr.scope_id='document_processing' AND cr.status='granted' AND cr.withdrawn_at IS NULL) AS document_processing_consent
         FROM patient_qr_tokens q JOIN patients p ON p.id=q.patient_id
         WHERE q.token_hash=$1 AND q.expires_at>NOW()
         LIMIT 1`,
        [hashQrToken(rawToken)]
    );
    if (!result.rowCount) throw new ApiError(410, 'This patient QR has expired. Please generate a new QR from the kiosk.');
    const row = result.rows[0];
    await pool.query('UPDATE patient_qr_tokens SET used_at=COALESCE(used_at,NOW()) WHERE id=$1', [row.id]);
    const patient = {
        id: row.pid,
        patientId: row.abha_number || row.pid,
        abha_number: row.abha_number,
        abhaNumber: row.abha_number,
        abha_address: row.abha_address,
        abhaAddress: row.abha_address,
        full_name: row.full_name,
        name: row.full_name,
        gender: row.gender,
        date_of_birth: row.date_of_birth,
        dateOfBirth: row.date_of_birth,
        dob: row.date_of_birth,
        mobile_number: row.mobile_number,
        mobile: row.mobile_number,
        phone: row.mobile_number,
        address: row.address,
        aadhaar_number: row.aadhaar_number,
        aadhaarNumber: row.aadhaar_number,
    };
    const accessToken = signPatientToken(patient);

    const existingConsent = await pool.query(
        `SELECT 1 FROM consent_records WHERE consultation_id=$1 AND scope_id='document_processing' AND status='granted' AND withdrawn_at IS NULL LIMIT 1`,
        [row.consultation_id]
    );
    if (!existingConsent.rowCount) {
        await pool.query(
            `INSERT INTO consent_records(consultation_id,scope_id,title,purpose,required,status)
             VALUES($1,'document_processing','Document Processing','Patient-authorized medical document analysis',FALSE,'granted')`,
            [row.consultation_id]
        );
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .json(new ApiResponse(200, {
            accessToken,
            patient,
            consultation_id: row.consultation_id,
            auth_mode: 'qr_patient_portal',
            document_processing_consent: true,
        }, 'Patient QR login successful'));
});

export const registerPortalDocument = asyncHandler(async (req, res) => {
    const { file_key, document_type, consultation_id } = req.body || {};
    if (!file_key || !document_type) throw new ApiError(400, 'file_key and document_type are required');
    if (!/\.(jpe?g|png|webp|pdf)$/i.test(String(file_key))) throw new ApiError(415, 'Only PDF, JPEG, PNG and WebP files can be analyzed');
    if (!String(file_key).startsWith(`vault/${req.user.id}/`)) throw new ApiError(403, 'Document storage key does not belong to this patient');

    const consultation = await resolvePatientConsultation(req.user.id, consultation_id || null);
    let consent = await pool.query(
        `SELECT 1 FROM consent_records WHERE consultation_id=$1 AND scope_id='document_processing' AND status='granted' AND withdrawn_at IS NULL LIMIT 1`,
        [consultation.id]
    );
    if (!consent.rowCount) {
        await pool.query(
            `INSERT INTO consent_records(consultation_id,scope_id,title,purpose,required,status)
             VALUES($1,'document_processing','Document Processing','Patient-authorized medical document analysis',FALSE,'granted')`,
            [consultation.id]
        );
    }

    const sourceMimeType = /\.pdf$/i.test(file_key) ? 'application/pdf' : /\.webp$/i.test(file_key) ? 'image/webp' : /\.png$/i.test(file_key) ? 'image/png' : 'image/jpeg';
    const document = await pool.query(
        `INSERT INTO uploaded_documents (consultation_id,file_path_hash,document_type,source_mime_type,status)
         VALUES($1,$2,$3,$4,'pending') RETURNING *`,
        [consultation.id, file_key, document_type, sourceMimeType]
    );
    const row = document.rows[0];
    executeOcrStreamingPipeline(consultation.id, row.id, file_key, document_type).catch((error) => console.error('[Portal OCR] background failure', error));
    return res.status(202).json(new ApiResponse(202, row, 'Document registered for OCR and medical extraction'));
});

export const uploadPortalDocument = asyncHandler(async (req, res) => {
    const file = req.file || req.files?.file?.[0] || req.files?.document?.[0];
    if (!file) {
        throw new ApiError(400, "Document file (image or PDF) is required");
    }
    req.file = file;

    const { document_type, consultation_id } = req.body || {};
    const localFilePath = file.path;
    const originalName = file.originalname || `document-${Date.now()}`;
    const mimeType = file.mimetype;

    try {
        const consultation = await resolvePatientConsultation(req.user.id, consultation_id || null);

        // Deduplication guard: Check if identical document was uploaded for this consultation in the last 6 seconds
        const recentDuplicate = await pool.query(
            `SELECT * FROM uploaded_documents 
             WHERE consultation_id = $1 
               AND source_mime_type = $2 
               AND created_at > NOW() - INTERVAL '6 seconds'
             ORDER BY created_at DESC LIMIT 1`,
            [consultation.id, mimeType]
        );
        if (recentDuplicate.rowCount > 0 && fs.existsSync(localFilePath)) {
            try { fs.unlinkSync(localFilePath); } catch (e) {}
            console.log(`[Document AI] Deduplicated parallel upload for ${originalName} (consultation ${consultation.id})`);
            const row = recentDuplicate.rows[0];
            return res.status(200).json(
                new ApiResponse(200, {
                    ...row,
                    download_url: row.document_url || row.file_path_hash,
                    url: row.document_url || row.file_path_hash,
                    document_url: row.document_url || row.file_path_hash
                }, 'Document already uploaded (deduplicated)')
            );
        }

        // Ensure consent record exists
        let consent = await pool.query(
            `SELECT 1 FROM consent_records WHERE consultation_id=$1 AND scope_id='document_processing' AND status='granted' AND withdrawn_at IS NULL LIMIT 1`,
            [consultation.id]
        );
        if (!consent.rowCount) {
            await pool.query(
                `INSERT INTO consent_records(consultation_id,scope_id,title,purpose,required,status)
                 VALUES($1,'document_processing','Document Processing','Patient-authorized medical document analysis',FALSE,'granted')`,
                [consultation.id]
            );
        }

        // Ensure consultation has AI session ID
        let aiSessionId = consultation.ai_session_id;
        if (!aiSessionId) {
            aiSessionId = `doc-session-${consultation.id}`;
            await pool.query(
                "UPDATE consultations SET ai_session_id = $1, updated_at = NOW() WHERE id = $2",
                [aiSessionId, consultation.id]
            );
        }

        // 1. Read local file buffer for AI verification / OCR processing
        const fileBuffer = await fs.promises.readFile(localFilePath);

        let extractedData = {};
        let aiFailed = false;
        let processingError = null;

        try {
            console.log(`[Document AI] Running AI OCR on ${originalName} (${mimeType})`);
            const ocrResult = await AiServiceGateway.uploadDocument(
                aiSessionId,
                fileBuffer,
                mimeType,
                originalName,
                document_type || 'medical_document'
            );

            const aiEntities = Array.isArray(ocrResult?.entities) ? ocrResult.entities : [];
            extractedData = {
                ...ocrResult,
                summary: ocrResult?.summary || ocrResult?.ai_summary || '',
                health_info: ocrResult?.health_info || '',
                ai_summary: ocrResult?.summary || ocrResult?.ai_summary || '',
                medicines: ocrResult?.medicines || aiEntities.filter(e => e.kind === 'medicine').map(e => ({
                    name: e.label,
                    dosage: e.dosage,
                    frequency: e.frequency,
                    route: e.route
                })),
                diagnoses: ocrResult?.diagnoses || aiEntities.filter(e => e.kind === 'condition').map(e => ({
                    name: e.label,
                    diagnosis: e.label,
                    icd_code: e.icd_code
                })),
                investigations: ocrResult?.investigations || aiEntities.filter(e => ['lab-result', 'procedure', 'vital-sign'].includes(e.kind)).map(e => ({
                    name: e.label,
                    value: e.value,
                    unit: e.unit,
                    reference_range: e.reference_range
                })),
                symptoms: ocrResult?.symptoms || aiEntities.filter(e => ['symptom', 'complaint'].includes(e.kind)).map(e => ({
                    name: e.label,
                    symptom: e.label
                })),
                allergies: ocrResult?.allergies || aiEntities.filter(e => e.kind === 'allergy').map(e => ({
                    name: e.label,
                    allergy: e.label
                })),
                parsed_date: ocrResult?.parsed_date || ocrResult?.document_date || aiEntities.find(e => e.kind === 'document-date')?.value || null,
                raw_text: ocrResult?.raw_text || ocrResult?.ocr_text_preview || ''
            };

            const aiStatus = String(ocrResult?.processing_status || ocrResult?.status || '').toLowerCase();
            if (['failed', 'ocr_failed', 'error'].includes(aiStatus) || Boolean(ocrResult?.error)) {
                aiFailed = true;
                processingError = ocrResult?.error || `AI processing returned status: ${aiStatus}`;
            }
        } catch (aiErr) {
            console.warn('[AI Processing Warning]', aiErr?.message || aiErr);
            processingError = aiErr?.message || 'AI document processing encountered an issue';
        }

        // 2. Upload to Cloudinary (clears local temp file automatically)
        console.log(`[Cloudinary] Uploading ${originalName} to Cloudinary...`);
        const cloudinaryResult = await uploadOnCloudinary(localFilePath, 'ayushcare/documents');
        const documentUrl = cloudinaryResult?.secure_url || cloudinaryResult?.url;

        if (!documentUrl) {
            throw new ApiError(500, 'Cloudinary upload failed: No secure URL received');
        }

        console.log(`[Cloudinary] Upload success! URL: ${documentUrl}`);

        // 3. Save document URL and AI extraction in DB
        const finalStatus = aiFailed ? 'failed' : 'completed';
        const docType = document_type || 'other';

        const insertResult = await pool.query(
            `INSERT INTO uploaded_documents (
                consultation_id,
                file_path_hash,
                document_url,
                document_type,
                source_mime_type,
                extracted_data,
                status,
                processing_error
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                consultation.id,
                documentUrl,
                documentUrl,
                docType,
                mimeType,
                JSON.stringify(extractedData),
                finalStatus,
                processingError
            ]
        );

        const responseDoc = {
            ...insertResult.rows[0],
            download_url: documentUrl,
            url: documentUrl,
            document_url: documentUrl
        };

        // Sync clinical summary so patient dashboard/profile shows AI review immediately
        if (extractedData.summary || extractedData.health_info) {
            try {
                await pool.query(
                    `INSERT INTO clinical_summaries (consultation_id, chief_complaint, history_of_present_illness, medications, generated_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())
                     ON CONFLICT (consultation_id) DO UPDATE SET
                        chief_complaint = COALESCE(EXCLUDED.chief_complaint, clinical_summaries.chief_complaint),
                        history_of_present_illness = COALESCE(EXCLUDED.history_of_present_illness, clinical_summaries.history_of_present_illness),
                        medications = COALESCE(EXCLUDED.medications, clinical_summaries.medications),
                        updated_at = NOW()`,
                    [
                        consultation.id,
                        extractedData.summary || 'Medical document analysis completed',
                        extractedData.health_info || extractedData.summary || '',
                        JSON.stringify(extractedData.medicines || [])
                    ]
                );
            } catch (summaryErr) {
                console.warn('[Clinical Summary Sync Warning]', summaryErr?.message || summaryErr);
            }
        }

        return res.status(201).json(
            new ApiResponse(201, responseDoc, 'Document verified with AI and uploaded to Cloudinary successfully')
        );
    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            try { fs.unlinkSync(localFilePath); } catch (e) {}
        }
        throw error;
    }
});

export const uploadKioskDocument = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Document file is required");
    }

    const { session_id } = req.params;
    const { document_type } = req.body || {};
    const localFilePath = req.file.path;
    const originalName = req.file.originalname || `kiosk-doc-${Date.now()}`;
    const mimeType = req.file.mimetype;

    try {
        const sessionQuery = await pool.query(
            "SELECT consultation_id FROM kiosk_sessions WHERE id = $1 AND is_active = TRUE AND expires_at > NOW()",
            [session_id]
        );
        if (!sessionQuery.rowCount || !sessionQuery.rows[0].consultation_id) {
            throw new ApiError(410, 'Kiosk pairing session expired or invalid');
        }
        const consultationId = sessionQuery.rows[0].consultation_id;

        const consultation = await pool.query('SELECT ai_session_id FROM consultations WHERE id=$1', [consultationId]);
        if (!consultation.rowCount) throw new ApiError(404, 'Consultation not found');

        let aiSessionId = consultation.rows[0]?.ai_session_id;
        if (!aiSessionId) {
            aiSessionId = `doc-session-${consultationId}`;
            await pool.query(
                "UPDATE consultations SET ai_session_id = $1, updated_at = NOW() WHERE id = $2",
                [aiSessionId, consultationId]
            );
        }

        // 1. AI processing
        const fileBuffer = await fs.promises.readFile(localFilePath);
        let extractedData = {};
        let aiFailed = false;
        let processingError = null;

        try {
            const ocrResult = await AiServiceGateway.uploadDocument(
                aiSessionId,
                fileBuffer,
                mimeType,
                originalName,
                document_type || 'medical_document'
            );

            const aiEntities = Array.isArray(ocrResult?.entities) ? ocrResult.entities : [];
            extractedData = {
                ...ocrResult,
                summary: ocrResult?.summary || ocrResult?.ai_summary || '',
                health_info: ocrResult?.health_info || '',
                ai_summary: ocrResult?.summary || ocrResult?.ai_summary || '',
                medicines: ocrResult?.medicines || aiEntities.filter(e => e.kind === 'medicine').map(e => ({
                    name: e.label,
                    dosage: e.dosage,
                    frequency: e.frequency,
                    route: e.route
                })),
                diagnoses: ocrResult?.diagnoses || aiEntities.filter(e => e.kind === 'condition').map(e => ({
                    name: e.label,
                    diagnosis: e.label,
                    icd_code: e.icd_code
                })),
                investigations: ocrResult?.investigations || aiEntities.filter(e => ['lab-result', 'procedure', 'vital-sign'].includes(e.kind)).map(e => ({
                    name: e.label,
                    value: e.value,
                    unit: e.unit,
                    reference_range: e.reference_range
                })),
                symptoms: ocrResult?.symptoms || aiEntities.filter(e => ['symptom', 'complaint'].includes(e.kind)).map(e => ({
                    name: e.label,
                    symptom: e.label
                })),
                allergies: ocrResult?.allergies || aiEntities.filter(e => e.kind === 'allergy').map(e => ({
                    name: e.label,
                    allergy: e.label
                })),
                parsed_date: ocrResult?.parsed_date || ocrResult?.document_date || aiEntities.find(e => e.kind === 'document-date')?.value || null,
                raw_text: ocrResult?.raw_text || ocrResult?.ocr_text_preview || ''
            };

            const aiStatus = String(ocrResult?.processing_status || ocrResult?.status || '').toLowerCase();
            if (['failed', 'ocr_failed', 'error'].includes(aiStatus) || Boolean(ocrResult?.error)) {
                aiFailed = true;
                processingError = ocrResult?.error || `AI processing returned status: ${aiStatus}`;
            }
        } catch (aiErr) {
            console.warn('[Kiosk AI Processing Warning]', aiErr?.message || aiErr);
            processingError = aiErr?.message || 'AI document processing encountered an issue';
        }

        // 2. Cloudinary Upload
        const cloudinaryResult = await uploadOnCloudinary(localFilePath, 'ayushcare/documents');
        const documentUrl = cloudinaryResult?.secure_url || cloudinaryResult?.url;

        if (!documentUrl) {
            throw new ApiError(500, 'Cloudinary upload failed: No secure URL received');
        }

        // 3. Save to DB
        const finalStatus = aiFailed ? 'failed' : 'completed';
        const docType = document_type || 'other';

        const insertResult = await pool.query(
            `INSERT INTO uploaded_documents (
                consultation_id,
                file_path_hash,
                document_url,
                document_type,
                source_mime_type,
                extracted_data,
                status,
                processing_error
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                consultationId,
                documentUrl,
                documentUrl,
                docType,
                mimeType,
                JSON.stringify(extractedData),
                finalStatus,
                processingError
            ]
        );

        const responseDoc = {
            ...insertResult.rows[0],
            download_url: documentUrl,
            url: documentUrl,
            document_url: documentUrl
        };

        // Sync clinical summary for kiosk session consultation
        if (extractedData.summary || extractedData.health_info) {
            try {
                await pool.query(
                    `INSERT INTO clinical_summaries (consultation_id, chief_complaint, history_of_present_illness, medications, generated_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())
                     ON CONFLICT (consultation_id) DO UPDATE SET
                        chief_complaint = COALESCE(EXCLUDED.chief_complaint, clinical_summaries.chief_complaint),
                        history_of_present_illness = COALESCE(EXCLUDED.history_of_present_illness, clinical_summaries.history_of_present_illness),
                        medications = COALESCE(EXCLUDED.medications, clinical_summaries.medications),
                        updated_at = NOW()`,
                    [
                        consultationId,
                        extractedData.summary || 'Medical document analysis completed',
                        extractedData.health_info || extractedData.summary || '',
                        JSON.stringify(extractedData.medicines || [])
                    ]
                );
            } catch (summaryErr) {
                console.warn('[Kiosk Clinical Summary Sync Warning]', summaryErr?.message || summaryErr);
            }
        }

        return res.status(201).json(
            new ApiResponse(201, responseDoc, 'Kiosk document verified and uploaded to Cloudinary successfully')
        );
    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            try { fs.unlinkSync(localFilePath); } catch (e) {}
        }
        throw error;
    }
});

export const getPortalDocument = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT d.* FROM uploaded_documents d
         JOIN consultations c ON c.id=d.consultation_id
         WHERE d.id=$1 AND c.patient_id=$2 LIMIT 1`,
        [req.params.document_id, req.user.id]
    );
    if (!result.rowCount) throw new ApiError(404, 'Document not found');
    return res.json(new ApiResponse(200, await signedDocument(result.rows[0]), 'Document loaded'));
});

// ==========================================
// --- FLOW B: SMS Portal & Authentication ---
// ==========================================

export const sendPortalOtp = asyncHandler(async (req, res) => {
    const { mobileNumber, abhaNumber } = req.body || {};
    let formattedNumber = '';
    if (abhaNumber) {
        const cleanAbha = String(abhaNumber).replace(/\D/g, '');
        if (cleanAbha.length !== 14) throw new ApiError(400, 'ABHA number must contain exactly 14 digits');
        const formattedAbha = `${cleanAbha.slice(0, 2)}-${cleanAbha.slice(2, 6)}-${cleanAbha.slice(6, 10)}-${cleanAbha.slice(10, 14)}`;
        const patient = await pool.query(
            `SELECT mobile_number FROM patients 
             WHERE abha_number = $1 OR abha_number = $2 OR REPLACE(REPLACE(abha_number, '-', ''), ' ', '') = $1 
             LIMIT 1`,
            [cleanAbha, formattedAbha]
        );
        if (!patient.rowCount || !patient.rows[0].mobile_number) throw new ApiError(404, 'No registered mobile number is linked to this ABHA number');
        const local = normalizeMobileForLookup(patient.rows[0].mobile_number);
        formattedNumber = `+91${local}`;
    } else if (mobileNumber) {
        const raw = String(mobileNumber).trim();
        formattedNumber = raw.startsWith('+') ? raw : `+91${raw}`;
    } else {
        throw new ApiError(400, 'ABHA number or mobile number is required');
    }
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    saveOTP(formattedNumber, generatedOtp, 300);
    const message = `Your AyushCare Patient Portal verification OTP is: ${generatedOtp}. Valid for 5 minutes.`;
    
    console.log('\n======================================================');
    console.log(`🔐 [AYUSHCARE MOBILE PORTAL OTP]`);
    console.log(`📱 Recipient: ${formattedNumber}`);
    console.log(`🔑 OTP CODE:  ${generatedOtp}`);
    console.log(`⏳ Valid for: 5 minutes`);
    console.log('======================================================\n');

    await sendSMS(formattedNumber, message);
    return res.status(200).json(new ApiResponse(200, {
        mobile: formattedNumber,
        delivery: 'registered-mobile',
        otp: generatedOtp
    }, `Verification OTP sent successfully. (Dev OTP: ${generatedOtp})`));
});

function calculatePatientAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const diff = Date.now() - birthDate.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function formatPatientForClient(row) {
    const age = calculatePatientAge(row.date_of_birth);
    return {
        id: row.id,
        patientId: row.abha_number || '',
        abhaNumber: row.abha_number || '',
        name: row.full_name,
        full_name: row.full_name,
        gender: row.gender,
        age: age ?? (row.gender?.toLowerCase() === 'female' ? 26 : 30),
        date_of_birth: row.date_of_birth,
        mobile_number: row.mobile_number,
        abha_number: row.abha_number,
        last_visit: row.last_visit_date
            ? new Date(row.last_visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'No visits yet',
        last_visit_date: row.last_visit_date || null,
        department: row.department_name || 'General OPD',
        doctor: row.doctor_name ? (row.doctor_name.startsWith('Dr.') ? row.doctor_name : `Dr. ${row.doctor_name}`) : 'Duty Medical Officer',
        hospital: row.hospital_name || 'AyushCare Health Center'
    };
}

export const verifyPortalOtp = asyncHandler(async (req, res) => {
    const { mobileNumber, otp, abhaNumber } = req.body;
    if (!otp || (!mobileNumber && !abhaNumber)) throw new ApiError(400, 'ABHA number or mobile number and OTP are required');
    let rawNumber = String(mobileNumber || '').trim();
    let cleanAbha = null;
    let formattedAbha = null;
    if (abhaNumber) {
        cleanAbha = String(abhaNumber).replace(/\D/g, '');
        if (cleanAbha.length === 14) {
            formattedAbha = `${cleanAbha.slice(0, 2)}-${cleanAbha.slice(2, 6)}-${cleanAbha.slice(6, 10)}-${cleanAbha.slice(10, 14)}`;
        }
    }
    if (abhaNumber && !rawNumber) {
        const linked = await pool.query(
            `SELECT mobile_number FROM patients 
             WHERE abha_number = $1 OR abha_number = $2 OR REPLACE(REPLACE(abha_number, '-', ''), ' ', '') = $1 
             LIMIT 1`,
            [cleanAbha, formattedAbha || cleanAbha]
        );
        if (!linked.rowCount) throw new ApiError(404, 'ABHA number is not registered');
        rawNumber = String(linked.rows[0].mobile_number || '').trim();
    }

    const formattedNumber = rawNumber.startsWith('+')
        ? rawNumber
        : `+91${rawNumber}`;

    const isValid = verifyOTP(formattedNumber, otp);

    if (!isValid) {
        throw new ApiError(401, "Invalid or expired verification OTP");
    }

    const localNumber = normalizeMobileForLookup(rawNumber || formattedNumber);

    const patientQuery = await pool.query(
        `SELECT 
            p.id,
            p.full_name,
            p.gender,
            p.date_of_birth,
            p.mobile_number,
            p.abha_number,
            p.created_at,
            c.id as last_consultation_id,
            c.created_at as last_visit_date,
            d.name as department_name,
            u.name as doctor_name,
            h.name as hospital_name
         FROM patients p
         LEFT JOIN LATERAL (
             SELECT c1.id, c1.department_id, c1.assigned_doctor_id, c1.hospital_id, c1.created_at
             FROM consultations c1
             WHERE c1.patient_id = p.id
             ORDER BY c1.created_at DESC
             LIMIT 1
         ) c ON true
         LEFT JOIN departments d ON d.id = c.department_id
         LEFT JOIN users u ON u.id = c.assigned_doctor_id
         LEFT JOIN hospitals h ON h.id = c.hospital_id
         WHERE (p.mobile_number = $1 OR p.mobile_number = $2)
           AND ($3::text IS NULL OR p.abha_number = $3 OR p.abha_number = $4 OR REPLACE(REPLACE(p.abha_number, '-', ''), ' ', '') = $3)
         ORDER BY p.created_at DESC`,
        [localNumber, formattedNumber, cleanAbha, formattedAbha]
    );

    if (patientQuery.rowCount === 0) {
        throw new ApiError(
            404,
            'No registered patient found for this mobile number'
        );
    }

    const patients = patientQuery.rows.map(formatPatientForClient);

    const activePatient = abhaNumber
        ? patients.find(p => p.abha_number === abhaNumber || p.abhaNumber === abhaNumber || p.patientId === abhaNumber) || patients[0]
        : patients[0];

    const token = jwt.sign(
        {
            id: activePatient.id,
            abha_number: activePatient.abha_number,
            email: activePatient.mobile_number,
            role: "patient"
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: '8h'
        }
    );

    return res
        .status(200)
        .cookie("accessToken", token, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    patient: activePatient,
                    patients,
                    accessToken: token,
                    multiplePatients: patients.length > 1
                },
                "Home Portal access granted"
            )
        );
});

export const selectPortalPatient = asyncHandler(async (req, res) => {
    const { abhaNumber, patientId } = req.body;
    const canonicalAbha = abhaNumber || patientId;
    if (!canonicalAbha) {
        throw new ApiError(400, "ABHA number is required");
    }

    const patientQuery = await pool.query(
        `SELECT 
            p.id,
            p.full_name,
            p.gender,
            p.date_of_birth,
            p.mobile_number,
            p.abha_number,
            p.created_at,
            c.id as last_consultation_id,
            c.created_at as last_visit_date,
            d.name as department_name,
            u.name as doctor_name,
            h.name as hospital_name
         FROM patients p
         LEFT JOIN LATERAL (
             SELECT c1.id, c1.department_id, c1.assigned_doctor_id, c1.hospital_id, c1.created_at
             FROM consultations c1
             WHERE c1.patient_id = p.id
             ORDER BY c1.created_at DESC
             LIMIT 1
         ) c ON true
         LEFT JOIN departments d ON d.id = c.department_id
         LEFT JOIN users u ON u.id = c.assigned_doctor_id
         LEFT JOIN hospitals h ON h.id = c.hospital_id
         WHERE p.abha_number = $1`,
        [canonicalAbha]
    );

    const row = patientQuery.rows[0];
    if (!row) {
        throw new ApiError(404, "Patient record not found");
    }

    const patient = formatPatientForClient(row);

    const token = jwt.sign(
        {
            id: patient.id,
            abha_number: patient.abha_number,
            email: patient.mobile_number,
            role: "patient"
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: '8h'
        }
    );

    return res
        .status(200)
        .cookie("accessToken", token, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    patient,
                    accessToken: token
                },
                "Patient profile selected successfully"
            )
        );
});

export const getPortalDashboard = asyncHandler(async (req, res) => {
    const patientId = req.user.id;

    const appointmentQuery = await pool.query(
        `SELECT c.token_number, c.status, h.name as hospital_name 
         FROM consultations c
         JOIN hospitals h ON c.hospital_id = h.id
         WHERE c.patient_id = $1 AND c.status != 'complete'
         ORDER BY c.created_at DESC LIMIT 1`,
        [patientId]
    );

    const appointment = appointmentQuery.rows[0] || {
        token_number: "None",
        status: "No active appointment",
        hospital_name: "AyushCare Center"
    };

    const summaryQuery = await pool.query(`SELECT cs.* FROM clinical_summaries cs JOIN consultations c ON c.id=cs.consultation_id WHERE c.patient_id=$1 ORDER BY cs.generated_at DESC LIMIT 1`, [patientId]);
    const patientResult = await pool.query(
        `SELECT id, abha_number, abha_address, full_name, gender, date_of_birth, mobile_number, address, aadhaar_number
         FROM patients WHERE id=$1 LIMIT 1`,
        [patientId]
    );
    const patient = patientResult.rows[0] ? {
        ...patientResult.rows[0],
        name: patientResult.rows[0].full_name,
        patientId: patientResult.rows[0].abha_number || patientResult.rows[0].id,
        abhaNumber: patientResult.rows[0].abha_number,
        mobile: patientResult.rows[0].mobile_number,
        phone: patientResult.rows[0].mobile_number,
        dateOfBirth: patientResult.rows[0].date_of_birth,
        dob: patientResult.rows[0].date_of_birth,
        aadhaarNumber: patientResult.rows[0].aadhaar_number,
        abhaAddress: patientResult.rows[0].abha_address,
    } : null;
    const privacyQuery = await pool.query('SELECT * FROM privacy_settings WHERE patient_id=$1', [patientId]);
    const privacy = privacyQuery.rows[0] || { share_previous_departments: true, share_previous_appointments: true, share_previous_reports: true };
    const departmentQuery = await pool.query(
        `SELECT d.name FROM consultations c
         LEFT JOIN departments d ON d.id=c.department_id
         WHERE c.patient_id=$1 ORDER BY c.created_at DESC LIMIT 1`,
        [patientId]
    );
    const vitalsQuery = await pool.query(
        `SELECT v.* FROM vitals v
         JOIN consultations c ON c.id = v.consultation_id
         WHERE c.patient_id = $1
         ORDER BY v.recorded_at DESC LIMIT 1`,
        [patientId]
    );

    const visitQuery = await pool.query(
        `SELECT c.id, c.token_number, c.status, c.risk_level, c.intake_pathway, c.created_at,
                h.name AS hospital_name, d.name AS department_name, u.name AS doctor_name
         FROM consultations c
         LEFT JOIN hospitals h ON h.id = c.hospital_id
         LEFT JOIN departments d ON d.id = c.department_id
         LEFT JOIN users u ON u.id = c.assigned_doctor_id
         WHERE c.patient_id = $1
         ORDER BY c.created_at DESC LIMIT 1`,
        [patientId]
    );

    const dashboardData = {
        patient,
        patient_name: patient?.full_name || null,
        patient_id: patient?.abha_number || null,
        appointment: {
            token: appointment.token_number,
            status: appointment.status,
            hospital: appointment.hospital_name,
            department: departmentQuery.rows[0]?.name || "AyushCare OPD"
        },
        ai_summary: summaryQuery.rows[0] || null,
        vitals: vitalsQuery.rows[0] || null,
        latest_visit: visitQuery.rows[0] || null
    };

    return res.status(200).json(new ApiResponse(200, dashboardData, "Dashboard data loaded"));
});

export const getPortalVisits = asyncHandler(async (req, res) => {
    const result = await pool.query(
        `SELECT c.id, c.token_number, c.status, c.risk_level, c.intake_pathway,
                c.language, c.created_at, c.updated_at, c.hospital_id, h.name AS hospital_name,
                d.id AS department_id, d.name AS department_name,
                u.id AS doctor_id, u.name AS doctor_name
         FROM consultations c
         LEFT JOIN hospitals h ON h.id=c.hospital_id
         LEFT JOIN departments d ON d.id=c.department_id
         LEFT JOIN users u ON u.id=c.assigned_doctor_id
         WHERE c.patient_id=$1
         ORDER BY c.created_at DESC LIMIT 100`, [req.user.id]
    );
    return res.json(new ApiResponse(200, result.rows, 'Patient visits loaded'));
});

export const getPortalVisitDetails = asyncHandler(async (req, res) => {
    const patientId = req.user.id;
    const visit = await pool.query(
        `SELECT c.*, p.abha_number, h.name AS hospital_name, h.state_code,
                d.name AS department_name, d.pathway, u.name AS doctor_name, u.specialization
         FROM consultations c JOIN patients p ON p.id=c.patient_id
         LEFT JOIN hospitals h ON h.id=c.hospital_id
         LEFT JOIN departments d ON d.id=c.department_id
         LEFT JOIN users u ON u.id=c.assigned_doctor_id
         WHERE c.id=$1 AND c.patient_id=$2 LIMIT 1`, [req.params.visit_id, patientId]
    );
    if (!visit.rowCount) throw new ApiError(404, 'Visit not found');
    const row = visit.rows[0];
    const [summary, vitals, documents] = await Promise.all([
        pool.query('SELECT * FROM clinical_summaries WHERE consultation_id=$1 LIMIT 1', [row.id]),
        pool.query('SELECT * FROM vitals WHERE consultation_id=$1 LIMIT 1', [row.id]),
        pool.query('SELECT * FROM uploaded_documents WHERE consultation_id=$1 ORDER BY created_at DESC', [row.id]),
    ]);
    const hydrated = await Promise.all(documents.rows.map(signedDocument));
    return res.json(new ApiResponse(200, {
        visit: row,
        summary: summary.rows[0] || null,
        vitals: vitals.rows[0] || null,
        documents: hydrated,
        abha_number: row.abha_number,
    }, 'Visit details loaded'));
});

export const getAudioSummary = asyncHandler(async (req, res) => {
    const summary = await pool.query(`SELECT cs.ai_payload, cs.chief_complaint, cs.history_of_present_illness, c.ai_session_id, c.language FROM clinical_summaries cs JOIN consultations c ON c.id=cs.consultation_id WHERE c.patient_id=$1 ORDER BY cs.generated_at DESC LIMIT 1`, [req.user.id]);
    if (!summary.rowCount) throw new ApiError(404, 'No clinical summary is available');
    const row=summary.rows[0];
    const text=[row.chief_complaint,row.history_of_present_illness].filter(Boolean).join('. ');
    const audio=await AiServiceGateway.tts(row.ai_session_id,text,row.language||'en');
    return res.json(new ApiResponse(200,audio,'Text-to-speech audio generated'));
});

export const getPortalDocuments = asyncHandler(async (req, res) => {
    const documents = await pool.query(
        `SELECT d.*, c.hospital_id, h.name AS hospital_name, c.created_at AS visit_created_at, c.status AS visit_status
         FROM uploaded_documents d JOIN consultations c ON d.consultation_id=c.id
         LEFT JOIN hospitals h ON h.id=c.hospital_id
         LEFT JOIN departments dpt ON dpt.id=c.department_id
         WHERE c.patient_id=$1 ORDER BY d.created_at DESC`,
        [req.user.id]
    );
    const hydrated = await Promise.all(documents.rows.map(signedDocument));
    return res.status(200).json(new ApiResponse(200, hydrated, 'Patient Document Vault loaded'));
});

export const getPortalPrivacyContext = asyncHandler(async (req, res) => {
    const patientId = req.user.id;
    const hospitals = await pool.query(
        `SELECT DISTINCT h.id, h.name, h.state_code
         FROM consultations c JOIN hospitals h ON h.id=c.hospital_id
         WHERE c.patient_id=$1 ORDER BY h.name`, [patientId]
    );
    const visits = await pool.query(
        `SELECT c.id, c.created_at, c.status, c.intake_pathway, h.id AS hospital_id, h.name AS hospital_name,
                d.name AS department_name, u.name AS doctor_name
         FROM consultations c LEFT JOIN hospitals h ON h.id=c.hospital_id
         LEFT JOIN departments d ON d.id=c.department_id LEFT JOIN users u ON u.id=c.assigned_doctor_id
         WHERE c.patient_id=$1 ORDER BY c.created_at DESC LIMIT 100`, [patientId]
    );
    const documents = await pool.query(
        `SELECT d.id, d.consultation_id, d.document_type, d.status, d.created_at,
                h.id AS hospital_id, h.name AS hospital_name
         FROM uploaded_documents d JOIN consultations c ON c.id=d.consultation_id
         LEFT JOIN hospitals h ON h.id=c.hospital_id
         WHERE c.patient_id=$1 ORDER BY d.created_at DESC LIMIT 200`, [patientId]
    );
    const rules = await pool.query(`SELECT * FROM patient_privacy_rules WHERE patient_id=$1 ORDER BY updated_at DESC`, [patientId]);
    return res.json(new ApiResponse(200, { hospitals: hospitals.rows, visits: visits.rows, documents: documents.rows, rules: rules.rows }, 'Granular privacy context loaded'));
});

export const updatePortalPrivacyRule = asyncHandler(async (req, res) => {
    const patientId = req.user.id;
    const { scope_type, hospital_id, consultation_id, document_id, allow_doctor_access, reason } = req.body || {};
    const { upsertPrivacyRule } = await import('../services/privacyService.js');
    const rule = await upsertPrivacyRule({
        patientId, scopeType: scope_type, hospitalId: hospital_id || null,
        consultationId: consultation_id || null, documentId: document_id || null,
        allowDoctorAccess: allow_doctor_access, reason: reason || null,
    });
    return res.json(new ApiResponse(200, rule, 'Privacy rule saved'));
});

export const getPortalPrivacy = asyncHandler(async (req, res) => {
    let privacyQuery = await pool.query('SELECT * FROM privacy_settings WHERE patient_id = $1', [req.user.id]);

    if (privacyQuery.rowCount === 0) {
        const seedQuery = await pool.query(
            `INSERT INTO privacy_settings
             (patient_id, isolate_past_history, consent_voice_processing,
              share_previous_departments, share_previous_reports, share_previous_appointments)
             VALUES ($1, FALSE, TRUE, TRUE, TRUE, TRUE) RETURNING *`,
            [req.user.id]
        );
        privacyQuery = seedQuery;
    }

    return res.status(200).json(new ApiResponse(200, privacyQuery.rows[0], "Patient privacy records loaded"));
});

export const updatePortalPrivacy = asyncHandler(async (req, res) => {
    const current = await pool.query('SELECT * FROM privacy_settings WHERE patient_id=$1', [req.user.id]);
    const base = current.rows[0] || {
        isolate_past_history: false,
        consent_voice_processing: true,
        share_previous_departments: true,
        share_previous_reports: true,
        share_previous_appointments: true,
    };
    const body = req.body || {};
    const isolate = body.isolate_past_history ?? base.isolate_past_history;
    const voice = body.consent_voice_processing ?? base.consent_voice_processing;
    const departments = body.share_previous_departments ?? base.share_previous_departments ?? true;
    const reports = body.share_previous_reports ?? base.share_previous_reports ?? true;
    const appointments = body.share_previous_appointments ?? base.share_previous_appointments ?? true;
    const lockDiagnosis = !departments;
    const lockVisits = !appointments;
    const lockReports = !reports;

    let row;
    if (current.rowCount > 0) {
        const updateRes = await pool.query(
            `UPDATE privacy_settings
             SET isolate_past_history=$1, consent_voice_processing=$2, share_previous_departments=$3,
                 share_previous_reports=$4, share_previous_appointments=$5,
                 lock_diagnosis=$6, lock_visits=$7, lock_reports=$8, updated_at=NOW()
             WHERE patient_id=$9 RETURNING *`,
            [Boolean(isolate), Boolean(voice), Boolean(departments), Boolean(reports), Boolean(appointments),
             Boolean(lockDiagnosis), Boolean(lockVisits), Boolean(lockReports), req.user.id]
        );
        row = updateRes.rows[0];
    } else {
        const insertRes = await pool.query(
            `INSERT INTO privacy_settings
                (patient_id, isolate_past_history, consent_voice_processing,
                 share_previous_departments, share_previous_reports, share_previous_appointments,
                 lock_diagnosis, lock_visits, lock_reports)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [req.user.id, Boolean(isolate), Boolean(voice), Boolean(departments), Boolean(reports), Boolean(appointments),
             Boolean(lockDiagnosis), Boolean(lockVisits), Boolean(lockReports)]
        );
        row = insertRes.rows[0];
    }
    return res.status(200).json(new ApiResponse(200, row, 'Preferences saved successfully'));
});

export const updatePortalProfile = asyncHandler(async (req, res) => {
    const patientId = req.user.id;
    const {
        full_name,
        name,
        gender,
        date_of_birth,
        dateOfBirth,
        mobile_number,
        mobile,
        phone,
        address,
        aadhaar_number,
        aadhaarNumber,
        abha_address,
        abhaAddress
    } = req.body || {};

    const resolvedName = (full_name || name || '').trim() || null;
    const resolvedGender = (gender || '').trim() || null;
    const resolvedDob = (date_of_birth || dateOfBirth || '').trim() || null;
    const resolvedMobile = (mobile_number || mobile || phone || '').trim() || null;
    const resolvedAddress = address !== undefined ? String(address).trim() : undefined;
    const resolvedAadhaar = (aadhaar_number || aadhaarNumber) !== undefined ? String(aadhaar_number || aadhaarNumber).replace(/\D/g, '') : undefined;
    const resolvedAbhaAddress = (abha_address || abhaAddress) !== undefined ? String(abha_address || abhaAddress).trim() : undefined;

    const fields = [];
    const values = [];

    if (resolvedName) {
        values.push(resolvedName);
        fields.push(`full_name = $${values.length}`);
    }
    if (resolvedGender) {
        values.push(resolvedGender);
        fields.push(`gender = $${values.length}`);
    }
    if (resolvedDob) {
        values.push(resolvedDob);
        fields.push(`date_of_birth = $${values.length}`);
    }
    if (resolvedMobile) {
        values.push(resolvedMobile);
        fields.push(`mobile_number = $${values.length}`);
    }
    if (resolvedAddress !== undefined) {
        values.push(resolvedAddress || null);
        fields.push(`address = $${values.length}`);
    }
    if (resolvedAadhaar !== undefined) {
        values.push(resolvedAadhaar || null);
        fields.push(`aadhaar_number = $${values.length}`);
    }
    if (resolvedAbhaAddress !== undefined) {
        values.push(resolvedAbhaAddress || null);
        fields.push(`abha_address = $${values.length}`);
    }

    if (fields.length === 0) {
        throw new ApiError(400, 'No valid fields provided for update');
    }

    values.push(patientId);
    const sql = `
        UPDATE patients
        SET ${fields.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, abha_number, abha_address, full_name, gender, date_of_birth, mobile_number, address, aadhaar_number, created_at
    `;

    const result = await pool.query(sql, values);
    if (!result.rowCount) {
        throw new ApiError(404, 'Patient record not found');
    }

    const row = result.rows[0];
    const clientPatient = {
        ...row,
        name: row.full_name,
        patientId: row.abha_number || row.id,
        abhaNumber: row.abha_number,
        mobile: row.mobile_number,
        phone: row.mobile_number,
        dateOfBirth: row.date_of_birth,
        dob: row.date_of_birth,
        aadhaarNumber: row.aadhaar_number,
        abhaAddress: row.abha_address,
    };

    return res.status(200).json(new ApiResponse(200, clientPatient, 'Profile updated successfully'));
});

export const getPortalProfile = asyncHandler(async (req, res) => {
    const patientId = req.user.id;
    const result = await pool.query(
        `SELECT id, abha_number, abha_address, full_name, gender, date_of_birth, mobile_number, address, aadhaar_number, created_at
         FROM patients WHERE id=$1 LIMIT 1`,
        [patientId]
    );
    if (!result.rowCount) throw new ApiError(404, 'Patient record not found');
    const row = result.rows[0];
    const clientPatient = {
        ...row,
        name: row.full_name,
        patientId: row.abha_number || row.id,
        abhaNumber: row.abha_number,
        mobile: row.mobile_number,
        phone: row.mobile_number,
        dateOfBirth: row.date_of_birth,
        dob: row.date_of_birth,
        aadhaarNumber: row.aadhaar_number,
        abhaAddress: row.abha_address,
    };
    return res.status(200).json(new ApiResponse(200, clientPatient, 'Profile loaded successfully'));
});


