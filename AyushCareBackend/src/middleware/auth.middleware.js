import jwt from 'jsonwebtoken';
import { ApiError } from '../utilities/ApiError.js';
import { asyncHandler } from '../utilities/asyncHandler.js';
import pool from '../database/dbConnection.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const authHeader = req.header("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bearerToken || req.cookies?.accessToken;

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const userQuery = await pool.query(
            'SELECT id, hospital_id, name, email, role, specialization FROM users WHERE id = $1',
            [decodedToken.id]
        );

        const user = userQuery.rows[0];

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});

export const verifyPatientJWT = asyncHandler(async (req, res, next) => {
    const authHeader = req.header("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bearerToken || req.cookies?.accessToken;

    if (!token) {
        throw new ApiError(401, "Unauthorized request. Missing token.");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (decodedToken.role !== 'patient') {
            throw new ApiError(403, "Access denied. Patient privileges required.");
        }

        const patientQuery = await pool.query(
            'SELECT id, abha_number, full_name, mobile_number, consent_granted FROM patients WHERE id = $1',
            [decodedToken.id]
        );

        const patient = patientQuery.rows[0];

        if (!patient) {
            throw new ApiError(401, "Invalid patient session token");
        }

        req.user = patient;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid patient session token");
    }
});