import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/user.js";
dotenv.config();

/**
 * Strict Authentication Middleware
 * Ensures the request contains a valid JWT token that was successfully decoded
 * by the global middleware. Use this to protect routes that require
 * authentication but not necessarily email verification or admin privileges.
 */
export const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required. Please log in."
        });
    }
    next();
};

/**
 * Email Verification Middleware
 * Must be used AFTER requireAuth.
 *
 * Live-checks the database on every request to ensure the user's email is
 * verified. This prevents bypassing the check by using an old JWT token
 * issued before the email was changed/reset.
 *
 * Returns 403 with { emailUnverified: true } so the frontend can distinguish
 * this error from other 403s and re-show the verification modal.
 *
 * Admins are exempt — only farmer-role users are blocked.
 */
export const requireEmailVerified = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required." });
    }

    // Admins are never blocked by email verification
    if (req.user.role === "admin") {
        return next();
    }

    try {
        // Live DB check — not relying on the JWT payload alone
        const user = await User.findById(req.user.id || req.user._id)
            .select("emailVerified email role")
            .lean();

        if (!user) {
            return res.status(401).json({ message: "User account not found. Please log in again." });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                message:       "Email verification required.",
                emailUnverified: true,
                email:         user.email,
            });
        }

        next();
    } catch (error) {
        console.error("[AuthMiddleware] Error checking email verification:", error);
        return res.status(500).json({ message: "Server error. Please try again." });
    }
};
