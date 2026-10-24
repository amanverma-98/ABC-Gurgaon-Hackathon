import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

export const hashQrToken = (token) => createHash('sha256').update(String(token)).digest('hex');

export const createRawQrToken = () => randomBytes(24).toString('base64url');

export const signPatientToken = (patient) => jwt.sign(
    { id: patient.id, abha_number: patient.abha_number || patient.abhaNumber || null, email: patient.mobile_number, role: 'patient' },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '8h' }
);
