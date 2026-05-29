import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// OTP email validity in minutes (for display in email body only — enforcement is on the backend)
const OTP_VALIDITY_MINUTES = 15;

/**
 * Creates and returns a configured Nodemailer transporter using SMTP2GO.
 * Reads credentials from environment variables:
 * - SMTP2GO_USER
 * - SMTP2GO_PASS
 * - SMTP_HOST (optional, defaults to mail.smtp2go.com)
 * - SMTP_PORT (optional, defaults to 2525)
 */
function createTransporter() {
  const smtpUser = process.env.SMTP2GO_USER?.trim();
  const smtpPass = process.env.SMTP2GO_PASS?.trim();
  const smtpHost = process.env.SMTP_HOST || "mail.smtp2go.com";
  const smtpPort = Number(process.env.SMTP_PORT || 2525);

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false, // smtp2go uses STARTTLS on 2525
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      // Enforce modern TLS versions where available
      ciphers: "TLSv1.2",
    },
  });
}

/**
 * Builds a professional, spam-resistant HTML email body for a points notification.
 *
 * Anti-spam best practices applied:
 * - Inline CSS (no external stylesheets)
 * - Plain-text alternative (multipart/alternative)
 * - Valid From/Reply-To headers
 * - No trigger words, no all-caps, no excessive punctuation
 * - Clear unsubscribe/footer info
 * - Structured layout with semantic table-based HTML (email-client safe)
 *
 * @param {Object} params
 * @param {string} params.farmerName   - Full name of the farmer.
 * @param {string} params.farmName     - Name of the farm.
 * @param {string} params.farmId       - Farm ID string (e.g. FAM00202).
 * @param {string} params.season       - Season (e.g. "Maha").
 * @param {number} params.year         - Harvest year.
 * @param {number} params.pointsEarned - Points awarded for this harvest.
 * @param {number} params.totalPoints  - Farmer's updated total points.
 * @param {number} params.harvestQty   - Harvest quantity in kg.
 * @param {string} params.crop         - Crop type.
 * @returns {{ html: string, text: string }}
 */
function buildPointsEmailContent({
  farmerName,
  farmName,
  farmId,
  season,
  year,
  pointsEarned,
  totalPoints,
  harvestQty,
  crop,
}) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AgriConnect – Harvest Points Awarded</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f3;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f4f6f3;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;
                 overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- Header banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#2d6a4f 0%,#40916c 100%);
                       padding:36px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#b7e4c7;letter-spacing:2px;
                         text-transform:uppercase;font-weight:600;">AgriConnect Platform</p>
              <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700;line-height:1.3;">
                Harvest Points Awarded 🌾
              </h1>
              <p style="margin:10px 0 0 0;font-size:14px;color:#d8f3dc;">
                Your hard work has been recognised.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px 0;font-size:16px;color:#1b4332;font-weight:600;">
                Dear ${farmerName},
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.7;">
                We are pleased to inform you that harvest points have been credited to your
                AgriConnect account based on your recent harvest submission.
              </p>

              <!-- Points highlight box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:10px;
                       margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 4px 0;font-size:13px;color:#166534;
                               text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
                      Points Earned This Harvest
                    </p>
                    <p style="margin:0;font-size:48px;font-weight:700;color:#15803d;line-height:1.1;">
                      +${pointsEarned.toLocaleString()}
                    </p>
                    <p style="margin:8px 0 0 0;font-size:13px;color:#4b5563;">
                      Your new total:&nbsp;
                      <strong style="color:#1b4332;">${totalPoints.toLocaleString()} pts</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Harvest summary table -->
              <p style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#1b4332;
                         text-transform:uppercase;letter-spacing:1px;">
                Harvest Summary
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="border-collapse:collapse;border-radius:8px;overflow:hidden;
                       border:1px solid #e5e7eb;margin-bottom:28px;">
                ${[
                  ["Farm",        farmName],
                  ["Farm ID",     farmId],
                  ["Crop",        crop],
                  ["Season",      season],
                  ["Year",        year],
                  ["Harvest Qty", `${Number(harvestQty).toLocaleString()} kg`],
                ].map(([label, value], i) => `
                <tr style="background-color:${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
                  <td style="padding:12px 16px;font-size:14px;color:#6b7280;
                             font-weight:500;width:40%;border-bottom:1px solid #f3f4f6;">
                    ${label}
                  </td>
                  <td style="padding:12px 16px;font-size:14px;color:#111827;
                             font-weight:600;border-bottom:1px solid #f3f4f6;">
                    ${value}
                  </td>
                </tr>`).join("")}
              </table>

              <!-- Info note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#fffbeb;border-left:4px solid #f59e0b;
                       border-radius:4px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;font-size:14px;color:#78350f;line-height:1.6;">
                    <strong>How are points calculated?</strong><br/>
                    Points are awarded based on your farm's yield performance compared to the
                    average yield across all districts for the same crop and season.
                    Higher yields relative to the district average earn more points.
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <p style="margin:0 0 24px 0;font-size:15px;color:#374151;line-height:1.7;">
                Log in to your AgriConnect dashboard to view your full harvest history,
                track your points, and explore available rewards.
              </p>

              <p style="margin:0 0 32px 0;font-size:15px;color:#374151;line-height:1.7;">
                Thank you for your continued dedication to sustainable agriculture.
              </p>

              <p style="margin:0;font-size:15px;color:#1b4332;font-weight:600;">
                Warm regards,<br/>
                <span style="font-weight:400;color:#374151;">The AgriConnect Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;
                       padding:20px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#9ca3af;">
                This is an automated notification from the AgriConnect platform.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                If you believe you received this email in error, please contact support.
              </p>
            </td>
          </tr>

        </table>
        <!-- End card -->

      </td>
    </tr>
  </table>

</body>
</html>
`;

  const text = `
AgriConnect – Harvest Points Awarded

Dear ${farmerName},

We are pleased to inform you that harvest points have been credited to your AgriConnect account.

Points Earned This Harvest: +${pointsEarned.toLocaleString()}
Your New Total: ${totalPoints.toLocaleString()} pts

--- Harvest Summary ---
Farm:        ${farmName} (${farmId})
Crop:        ${crop}
Season:      ${season}
Year:        ${year}
Harvest Qty: ${Number(harvestQty).toLocaleString()} kg

Points are awarded based on your farm's yield performance compared to the district average for the same crop and season.

Log in to your AgriConnect dashboard to view your full harvest history and track your points.

Thank you for your continued dedication to sustainable agriculture.

Warm regards,
The AgriConnect Team

---
This is an automated notification from the AgriConnect platform.
If you believe you received this email in error, please contact support.
`;

  return { html, text };
}

/**
 * Sends a points-awarded notification email to the farmer.
 * This function is designed to NEVER throw — failures are logged silently
 * so the calling operation (point assignment) is never interrupted.
 *
 * @param {Object} params
 * @param {string} params.farmerEmail  - Recipient email address.
 * @param {string} params.farmerName   - Full name of the farmer.
 * @param {string} params.farmName     - Name of the farm.
 * @param {string} params.farmId       - Farm ID string.
 * @param {string} params.season       - Season (e.g. "Maha").
 * @param {number} params.year         - Harvest year.
 * @param {number} params.pointsEarned - Points awarded for this harvest.
 * @param {number} params.totalPoints  - Farmer's updated total points.
 * @param {number} params.harvestQty   - Harvest quantity in kg.
 * @param {string} params.crop         - Crop type.
 * @returns {Promise<void>}
 */
export async function sendPointsAwardedEmail(params) {
  // Validate required environment variables before attempting to send
  const smtpFrom = process.env.SMTP_FROM_ADDRESS?.trim();
  if (!process.env.SMTP2GO_USER || !process.env.SMTP2GO_PASS || !smtpFrom) {
    console.warn("[EmailService] SMTP2GO credentials or SMTP_FROM_ADDRESS not configured. Skipping email.");
    return;
  }

  if (!params.farmerEmail) {
    console.warn("[EmailService] No farmer email provided. Skipping email.");
    return;
  }

  try {
    const transporter = createTransporter();
    const { html, text } = buildPointsEmailContent(params);

    const mailOptions = {
      from: {
        name: "AgriConnect Notifications",
        address: smtpFrom,
      },
      replyTo: smtpFrom,
      to: params.farmerEmail,
      subject: `Your harvest points have been updated – AgriConnect`,
      text,   // Plain-text fallback (critical for spam score)
      html,
      headers: {
        // Precedence header tells mail clients this is automated (helps inbox placement)
        "Precedence": "bulk",
        "X-Auto-Response-Suppress": "All",
      },
    };

    // verify connection configuration before sending (helps diagnose auth/connectivity)
    try {
      await transporter.verify();
    } catch (vErr) {
      console.error("[EmailService] SMTP verification failed:", vErr && vErr.message ? vErr.message : vErr);
    }

    // Ensure envelope uses the configured SMTP FROM address to avoid provider rejections
    mailOptions.envelope = { from: smtpFrom, to: params.farmerEmail };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Points email sent to ${params.farmerEmail}. MessageId: ${info.messageId}`);
    console.log(`[EmailService] SMTP send result: accepted=${JSON.stringify(info.accepted)}, rejected=${JSON.stringify(info.rejected)}, response=${info.response}`);
  } catch (error) {
    // Log the error but DO NOT re-throw — email failure must not break point assignment
    console.error(`[EmailService] Failed to send points email to ${params.farmerEmail}:`, error.message);
  }
}

/**
 * Sends a one-time verification code (OTP) email to a recipient.
 * This function is designed to NEVER throw — failures are logged silently.
 *
 * @param {Object}  params
 * @param {string}  params.email       - Recipient email address.
 * @param {string}  params.code        - The 6-digit OTP code (plain, NOT hashed).
 * @param {string}  [params.firstName] - Recipient's first name (optional, for personalisation).
 * @returns {Promise<void>}
 */
export async function sendOtpEmail({ email, code, firstName = "there" }) {
  const smtpFrom = process.env.SMTP_FROM_ADDRESS?.trim();
  if (!process.env.SMTP2GO_USER || !process.env.SMTP2GO_PASS || !smtpFrom) {
    console.warn("[EmailService] SMTP2GO credentials or SMTP_FROM_ADDRESS not configured. Skipping OTP email.");
    return;
  }
  if (!email || !code) {
    console.warn("[EmailService] Missing email or OTP code. Skipping OTP email.");
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>AgriConnect – Email Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f3;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f4f6f3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;
                 overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2d6a4f 0%,#40916c 100%);
                       padding:36px 40px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#b7e4c7;letter-spacing:2px;
                         text-transform:uppercase;font-weight:600;">AgriConnect Platform</p>
              <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700;line-height:1.3;">
                Email Verification
              </h1>
              <p style="margin:10px 0 0 0;font-size:14px;color:#d8f3dc;">
                Use the code below to verify your email address.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px 0;font-size:16px;color:#1b4332;font-weight:600;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#374151;line-height:1.7;">
                Your verification code for AgriConnect is:
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:10px;
                       margin-bottom:28px;">
                <tr>
                  <td style="padding:28px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:13px;color:#166534;
                               text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                      Verification Code
                    </p>
                    <p style="margin:0;font-size:52px;font-weight:700;color:#15803d;
                               letter-spacing:12px;line-height:1.1;font-family:monospace;">
                      ${code}
                    </p>
                    <p style="margin:12px 0 0 0;font-size:13px;color:#4b5563;">
                      This code is valid for
                      <strong style="color:#1b4332;">${OTP_VALIDITY_MINUTES} minutes</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#fffbeb;border-left:4px solid #f59e0b;
                       border-radius:4px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;font-size:14px;color:#78350f;line-height:1.6;">
                    <strong>Did not request this code?</strong><br/>
                    If you did not request an AgriConnect verification code, you can safely
                    ignore this email. Your account will not be affected.
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:15px;color:#1b4332;font-weight:600;">
                Warm regards,<br/>
                <span style="font-weight:400;color:#374151;">The AgriConnect Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;
                       padding:20px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#9ca3af;">
                This is an automated message from the AgriConnect platform.
                Please do not reply to this email.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Department of Agriculture – Sri Lanka
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
AgriConnect – Email Verification Code

Hi ${firstName},

Your verification code for AgriConnect is:

  ${code}

This code is valid for ${OTP_VALIDITY_MINUTES} minutes.

If you did not request this code, you can safely ignore this email.

Warm regards,
The AgriConnect Team

---
This is an automated message from the AgriConnect platform. Please do not reply.
Department of Agriculture – Sri Lanka
`;

  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: {
        name: "AgriConnect Notifications",
        address: smtpFrom,
      },
      replyTo: smtpFrom,
      to: email,
      subject: `${code} is your AgriConnect verification code`,
      text,
      html,
      headers: {
        "Precedence":              "transactional",
        "X-Auto-Response-Suppress": "All",
      },
    };

    // verify connection configuration before sending
    try {
      await transporter.verify();
    } catch (vErr) {
      console.error("[EmailService] SMTP verification failed:", vErr && vErr.message ? vErr.message : vErr);
    }

    mailOptions.envelope = { from: smtpFrom, to: email };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] OTP email sent to ${email}. MessageId: ${info.messageId}`);
    console.log(`[EmailService] SMTP send result: accepted=${JSON.stringify(info.accepted)}, rejected=${JSON.stringify(info.rejected)}, response=${info.response}`);
  } catch (error) {
    console.error(`[EmailService] Failed to send OTP email to ${email}:`, error.message, error.code || "");
    if (error.response) {
      console.error(`[EmailService] SMTP response for ${email}:`, error.response);
    }
  }
}
