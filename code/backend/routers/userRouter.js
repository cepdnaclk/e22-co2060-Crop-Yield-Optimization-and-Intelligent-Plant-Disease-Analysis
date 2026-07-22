/**
 * Express Router: User Routes
 * Handles user authentication, profile details, and role checks.
 * Base path: /api/users
 */
import express from "express";
import { createUser, loginUser, fetchUser, getRecentFarmers, updateProfile } from "../controllers/userController.js";
import { sendOtp, verifyOtp, changeEmail, forgotPassword, resetPassword } from "../controllers/otpController.js";
import { requireAuth, requireEmailVerified } from "../middleware/authMiddleware.js";

const userRouter = express.Router()

// ── Public: no auth required ─────────────────────────────────────────────────
userRouter.post("/", createUser)
userRouter.post("/login", loginUser)
userRouter.post("/forgot-password", forgotPassword)
userRouter.post("/reset-password", resetPassword)

// ── OTP Verification (public — works before and after login) ─────────────────
userRouter.post("/send-otp",    sendOtp)
userRouter.post("/verify-otp",  verifyOtp)

// ── Email change (requires auth but NOT email verification — so locked-out
//    users can still fix a wrong email address) ───────────────────────────────
userRouter.post("/change-email", requireAuth, changeEmail)

// ── Profile (requires auth; profile fetch does NOT require email verification
//    so the frontend can read emailVerified status to show/hide the modal) ────
userRouter.get("/profile",         requireAuth,                fetchUser)
userRouter.put("/profile",         requireAuth, requireEmailVerified, updateProfile)
userRouter.get("/recent-farmers",  requireAuth, requireEmailVerified, getRecentFarmers)

export default userRouter