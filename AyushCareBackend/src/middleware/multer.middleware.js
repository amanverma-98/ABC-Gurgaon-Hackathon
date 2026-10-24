import multer from 'multer';
import path from 'path';
import fs from 'fs';

const tempDir = path.resolve('public', 'temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname) || '';
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (allowed.includes(String(file.mimetype).toLowerCase())) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WebP images and PDF documents are allowed'), false);
    }
};

export const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter
});
