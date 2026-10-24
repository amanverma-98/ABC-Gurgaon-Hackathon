import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import doctorRouter from './routes/doctor.routes.js';
import kioskRouter from './routes/kiosk.routes.js';
import mobileRouter from './routes/mobile.routes.js';
import languageRouter from './routes/language.routes.js';
import emergencyRouter from './routes/emergency.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads/audio');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';

app.use(cors({ 
    origin: allowedOrigins, 
    credentials: true 
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.get('/health', (req,res)=>res.json({success:true,service:'P2Care backend',timestamp:new Date().toISOString()}));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/doctor', doctorRouter);
app.use('/api/v1/intake', kioskRouter);
app.use('/api/v1/mobile', mobileRouter);
app.use('/api/v1/language', languageRouter);
app.use('/api/v1/emergency', emergencyRouter);
app.use(errorHandler);
export { app };
