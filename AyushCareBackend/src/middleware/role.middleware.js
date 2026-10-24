import { ApiError } from '../utilities/ApiError.js';

export const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'hospital_admin') {
        return next(new ApiError(403, "Access denied. Admin permissions required."));
    }
    next();
};