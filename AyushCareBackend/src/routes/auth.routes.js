import { Router } from 'express';
import { registerAdmin, loginUser, logoutUser, getMe } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.route("/register-admin").post(registerAdmin);
router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWT, getMe);

export default router;