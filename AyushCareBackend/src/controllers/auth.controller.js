import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utilities/ApiError.js';
import { ApiResponse } from '../utilities/ApiResponse.js';
import { asyncHandler } from '../utilities/asyncHandler.js';
import pool from '../database/dbConnection.js';

const generateToken = (userId, email, role) => {
    return jwt.sign(
        { id: userId, email, role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'None'
};


export const registerAdmin = asyncHandler(async (req, res) => {
    const { hospitalName, stateCode, name, email, password } = req.body;

    if ([hospitalName, stateCode, name, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existingUser = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existingUser.rowCount > 0) {
            throw new ApiError(409, "User email already registered");
        }
        const hospitalQuery = await client.query(
            'INSERT INTO hospitals (name, state_code) VALUES ($1, $2) RETURNING id',
            [hospitalName, stateCode]
        );
        const hospitalId = hospitalQuery.rows[0].id;

        const hashedPassword = await bcrypt.hash(password, 10);
        const userQuery = await client.query(
            `INSERT INTO users (hospital_id, name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4, 'hospital_admin') 
             RETURNING id, name, email, role`,
            [hospitalId, name, email, hashedPassword]
        );

        await client.query('COMMIT');

        const createdUser = userQuery.rows[0];
        return res
            .status(201)
            .json(new ApiResponse(201, createdUser, "Hospital and Admin registered successfully"));

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userQuery.rows[0];

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const accessToken = generateToken(user.id, user.email, user.role);

    const { password_hash, ...loggedUser } = user;

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedUser, accessToken },
                "User logged in successfully"
            )
        );
});


export const logoutUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});


export const getMe = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User profile retrieved successfully"));
});