/**
 * OTP Controller
 * Manages email verification via one-time codes (OTP).
 *
 * Strategy (Option A — pre-registration flow):
 * - OTPs for emails that don't yet have a user record are stored in a
 *   lightweight in-memory Map (pendingOtps). This allows an admin to verify
 *   an email address BEFORE the farmer account is created.
 * - OTPs for existing user accounts are stored (hashed) on the User document.
 * - On user creation, `createUser` checks both locations to resolve the
 *   `emailVerified` flag.
 *
 * OTP rules:
 * - 6 digits, cryptographically random.
 * - Valid for 15 minutes from generation time.
 * - Only the latest OTP is valid (each new send overwrites the previous).
 * - Stored as bcrypt hash to protect against DB/memory inspection.
 * - Backend-enforced 1-minute resend cooldown (cannot be bypassed by the frontend).
 */

import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import User from "../models/user.js";
import { sendOtpEmail } from "../services/emailService.js";

const OTP_VALIDITY_MS   = 15 * 60 * 1000; // 15 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;      // 1 minute resend cooldown
const BCRYPT_ROUNDS      = 10;

/**
 * In-memory store for OTPs sent to emails that don't yet have a user account.
 * Structure: Map<email, { hashedCode, expiresAt, cooldownUntil, firstName, verified? }>
 *
 * Note: This is intentionally in-memory. If the server restarts, pending
 * pre-registration OTPs are lost — the admin simply clicks "Send" again.
 * This is acceptable for this use-case.
 */
const pendingOtps = new Map();

/**
 * Generates a cryptographically random 6-digit OTP string.
 * @returns {string}
 */
function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * POST /api/users/send-otp
 * Body: { email, firstName? }
 *
 * Sends a 6-digit OTP to the given email.
 * Backend enforces a 1-minute resend cooldown — returns 429 if called too soon.
 * Works for both existing users (stores hash on User document) and
 * pre-registration emails (stores in pendingOtps Map).
 */
export async function sendOtp(req, res) {
  const { email, firstName } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const code        = generateOtpCode();
    const hashedCode  = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const now         = Date.now();
    const expiresAt   = new Date(now + OTP_VALIDITY_MS);
    const cooldownUntil = new Date(now + RESEND_COOLDOWN_MS);

    // ── Case 1: Existing user ──────────────────────────────────────────────
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      // Backend cooldown enforcement
      if (
        existingUser.emailOtp?.cooldownUntil &&
        new Date() < new Date(existingUser.emailOtp.cooldownUntil)
      ) {
        const remaining = Math.ceil(
          (new Date(existingUser.emailOtp.cooldownUntil) - new Date()) / 1000
        );
        return res.status(429).json({
          message: `Please wait ${remaining} second(s) before requesting a new code.`,
          cooldownSeconds: remaining,
        });
      }

      // Overwrite OTP — invalidates any previous code
      existingUser.emailOtp = { code: hashedCode, expiresAt, cooldownUntil };
      await existingUser.save();

      await sendOtpEmail({
        email:     normalizedEmail,
        code,
        firstName: existingUser.firstName || firstName || "there",
      });

      return res.json({
        message:         "Verification code sent. Please check your email.",
        cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
      });
    }

    // ── Case 2: Pre-registration (in-memory) ──────────────────────────────
    const pending = pendingOtps.get(normalizedEmail);

    if (pending?.cooldownUntil && new Date() < new Date(pending.cooldownUntil)) {
      const remaining = Math.ceil(
        (new Date(pending.cooldownUntil) - new Date()) / 1000
      );
      return res.status(429).json({
        message: `Please wait ${remaining} second(s) before requesting a new code.`,
        cooldownSeconds: remaining,
      });
    }

    pendingOtps.set(normalizedEmail, {
      hashedCode,
      expiresAt,
      cooldownUntil,
      firstName: firstName || "there",
    });

    await sendOtpEmail({
      email:     normalizedEmail,
      code,
      firstName: firstName || "there",
    });

    return res.json({
      message:         "Verification code sent. Please check your email.",
      cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    console.error("[OtpController] Error sending OTP:", error);
    return res.status(500).json({ message: "Failed to send verification code. Please try again." });
  }
}

/**
 * POST /api/users/verify-otp
 * Body: { email, code }
 *
 * Validates the OTP for the given email.
 * - If the user exists: updates emailVerified = true and clears the OTP.
 * - If pre-registration: marks the pendingOtps entry as verified.
 */
export async function verifyOtp(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and verification code are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedCode     = String(code).trim();

  try {
    // ── Case 1: Existing user ──────────────────────────────────────────────
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.emailOtp?.code || !user.emailOtp?.expiresAt) {
        return res.status(400).json({ message: "No verification code found. Please request a new one." });
      }

      if (new Date() > new Date(user.emailOtp.expiresAt)) {
        user.emailOtp = { code: null, expiresAt: null, cooldownUntil: null };
        await user.save();
        return res.status(400).json({
          message: "Verification code expired. Please request a new one.",
          expired: true,
        });
      }

      const isMatch = await bcrypt.compare(trimmedCode, user.emailOtp.code);
      if (!isMatch) {
        return res.status(400).json({
          message: "Invalid verification code. Please try again.",
          invalid: true,
        });
      }

      // Success — mark verified and clear OTP fields
      user.emailVerified = true;
      user.emailOtp      = { code: null, expiresAt: null, cooldownUntil: null };
      await user.save();

      return res.json({ message: "Email verified successfully.", verified: true });
    }

    // ── Case 2: Pre-registration (in-memory) ──────────────────────────────
    const pending = pendingOtps.get(normalizedEmail);

    if (!pending) {
      return res.status(400).json({ message: "No verification code found. Please request a new one." });
    }

    if (new Date() > new Date(pending.expiresAt)) {
      pendingOtps.delete(normalizedEmail);
      return res.status(400).json({
        message: "Verification code expired. Please request a new one.",
        expired: true,
      });
    }

    const isMatch = await bcrypt.compare(trimmedCode, pending.hashedCode);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid verification code. Please try again.",
        invalid: true,
      });
    }

    // Mark as verified — createUser will consume this
    pendingOtps.set(normalizedEmail, { ...pending, verified: true });

    return res.json({ message: "Email verified successfully.", verified: true });
  } catch (error) {
    console.error("[OtpController] Error verifying OTP:", error);
    return res.status(500).json({ message: "Failed to verify code. Please try again." });
  }
}

/**
 * POST /api/users/change-email
 * Body: { newEmail }
 * Requires: valid JWT (req.user set by global middleware)
 *
 * Allows a logged-in user to update their email address.
 * - Validates the new email is not already in use.
 * - Updates email and resets emailVerified = false.
 * - Clears any existing OTP.
 * - Immediately sends a fresh OTP to the new address.
 *
 * This endpoint bypasses requireEmailVerified so unverified users can fix
 * a wrong email without being permanently locked out.
 */
export async function changeEmail(req, res) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const { newEmail } = req.body;
  if (!newEmail || typeof newEmail !== "string") {
    return res.status(400).json({ message: "New email address is required." });
  }

  const normalizedNew = newEmail.toLowerCase().trim();

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedNew)) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }

  try {
    // Check the new email isn't already taken by another account
    const conflict = await User.findOne({ email: normalizedNew });
    if (conflict && String(conflict._id) !== String(req.user.id || req.user._id)) {
      return res.status(409).json({ message: "This email address is already in use by another account." });
    }

    // Find the current user
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.email === normalizedNew) {
      return res.status(400).json({ message: "The new email is the same as your current email." });
    }

    // Generate and store a new OTP for the new address
    const code          = generateOtpCode();
    const hashedCode    = await bcrypt.hash(code, BCRYPT_ROUNDS);
    const now           = Date.now();
    const expiresAt     = new Date(now + OTP_VALIDITY_MS);
    const cooldownUntil = new Date(now + RESEND_COOLDOWN_MS);

    // Update the user record
    user.email         = normalizedNew;
    user.emailVerified = false;
    user.emailOtp      = { code: hashedCode, expiresAt, cooldownUntil };
    await user.save();

    // Send OTP to new address (fire-and-forget style — don't fail the update if email fails)
    sendOtpEmail({
      email:     normalizedNew,
      code,
      firstName: user.firstName || "there",
    }).catch((err) =>
      console.error("[OtpController] Failed to send OTP after email change:", err.message)
    );

    return res.json({
      message:         "Email updated. A verification code has been sent to your new address.",
      newEmail:        normalizedNew,
      cooldownSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    console.error("[OtpController] Error changing email:", error);
    return res.status(500).json({ message: "Failed to update email. Please try again." });
  }
}

/**
 * Checks whether a pre-registration email was verified via OTP.
 * Called by createUser to decide the initial emailVerified value.
 * Cleans up the pending entry after reading.
 *
 * @param {string} email
 * @returns {boolean}
 */
export function consumePendingVerification(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const pending         = pendingOtps.get(normalizedEmail);

  if (!pending) return false;

  pendingOtps.delete(normalizedEmail);

  return pending.verified === true;
}
