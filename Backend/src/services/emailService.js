import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { EmailLog, ActivityLog } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Determine SMTP / Gmail configuration status
const isGmailConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS);
const isStandardSmtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);
const isSmtpConfigured = isGmailConfigured || isStandardSmtpConfigured;

// Create reusable Nodemailer transporter
let transporter = null;
if (isGmailConfigured) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS
    }
  });
  console.log(`[Email Service] Initialized Gmail SMTP transport for: ${process.env.GMAIL_USER}`);
} else if (isStandardSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log(`[Email Service] Initialized Standard SMTP transport on ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
}

/**
 * Base responsive HTML email wrapper branded with SCRM visual identity:
 * Obsidian background (#181818), warm-olive accents (#303018), and neon yellow (#F0FF60) CTAs.
 */
export function buildBrandedEmailHtml({ title, preheader, bodyHtml, ctaText, ctaUrl, trackingPixelId }) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const pixelImg = trackingPixelId
    ? `<img src="${process.env.BACKEND_URL || "http://localhost:5000"}/api/emails/track/${trackingPixelId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #121212; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #DFDFDF; }
    .container { max-width: 600px; margin: 30px auto; background-color: #181818; border: 1px solid #414141; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: #202020; border-bottom: 2px solid #F0FF60; padding: 24px 30px; text-align: left; }
    .logo-badge { display: inline-block; background: #F0FF60; color: #151515; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.1em; text-transform: uppercase; }
    .brand-title { display: inline-block; margin-left: 10px; font-size: 18px; font-weight: 800; color: #FFFFFF; vertical-align: middle; }
    .content { padding: 32px 30px; font-size: 15px; line-height: 1.6; color: #DFDFDF; }
    .content h2 { color: #FFFFFF; font-size: 22px; margin-top: 0; margin-bottom: 16px; }
    .cta-container { margin: 28px 0; text-align: center; }
    .cta-btn { display: inline-block; background-color: #F0FF60; color: #151515 !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 0 15px rgba(240, 255, 96, 0.3); }
    .code-box { background: #252525; border: 1px solid #4F5101; border-radius: 8px; padding: 16px; text-align: center; font-size: 28px; font-family: monospace; font-weight: 800; letter-spacing: 6px; color: #F0FF60; margin: 20px 0; }
    .footer { background: #151515; border-top: 1px solid #303018; padding: 20px 30px; font-size: 12px; color: #888888; text-align: center; }
    .footer a { color: #F0FF60; text-decoration: none; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#181818;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#121212;">
    <tr>
      <td align="center">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <span class="logo-badge">SCRM</span>
            <span class="brand-title">Small Customer Relationship Management</span>
          </div>
          <!-- Body Content -->
          <div class="content">
            <h2>${title}</h2>
            ${bodyHtml}
            ${ctaText && ctaUrl ? `
            <div class="cta-container">
              <a href="${ctaUrl}" class="cta-btn" target="_blank">${ctaText}</a>
            </div>` : ""}
          </div>
          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 6px 0;">This email was sent by <strong>SCRM Enterprise</strong> platform.</p>
            <p style="margin: 0;">Automated notification &bull; Do not reply directly to this message &bull; <a href="${appUrl}">Open SCRM Dashboard</a></p>
          </div>
        </div>
      </td>
    </tr>
  </table>
  ${pixelImg}
</body>
</html>
  `;
}

/**
 * Dispatch an email with full error handling, template rendering, and automatic database logging
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  userId = null,
  contactId = null,
  templateName = "System",
  trackingPixelId = null
}) {
  const fromAddress = process.env.SMTP_FROM || (process.env.GMAIL_USER ? `"SCRM Enterprise" <${process.env.GMAIL_USER}>` : `"SCRM Team" <noreply@scrm.enterprise>`);
  let status = "Sent";

  if (isSmtpConfigured && transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: text || "Please open this email in an HTML compatible mail client.",
        html
      });
      console.log(`[Email Service] Dispatched live email to ${to}: "${subject}"`);
    } catch (err) {
      console.warn(`[Email Service] SMTP live dispatch failed for ${to}: ${err.message}. Recording as simulated delivery.`);
      status = "Sent (Simulated Fallback)";
    }
  } else {
    console.log(`[Email Service] SMTP not configured. Simulated delivery for ${to}: "${subject}"`);
    status = "Sent (Simulated)";
  }

  // Record in EmailLog table
  try {
    const log = await EmailLog.create({
      user_id: userId,
      contact_id: contactId,
      template_name: templateName,
      recipient_email: to,
      subject,
      body: text || html.replace(/<[^>]+>/g, " "),
      tracking_pixel_id: trackingPixelId,
      status
    });
    return { success: true, status, logId: log.id };
  } catch (dbErr) {
    console.error("[Email Service] Failed to save email log to DB:", dbErr.message);
    return { success: true, status };
  }
}

/**
 * SYSTEM TRIGGER 1: Welcome / Onboarding Email upon Account Creation
 */
export async function sendWelcomeEmail(user) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const bodyHtml = `
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Welcome to <strong>SCRM</strong> (Small Customer Relationship Management). Your account has been provisioned with <strong>${user.role?.toUpperCase() || "STANDARD"}</strong> privileges.</p>
    <p>With SCRM, you can:</p>
    <ul>
      <li>Track deals across our visual 6-stage Kanban pipeline.</li>
      <li>Convert qualified leads into deals with a single click.</li>
      <li>Organize contacts, companies, tasks, quotes, and customer tickets.</li>
      <li>Dispatch tracked emails with real-time open notifications.</li>
    </ul>
    <p>Click below to sign in and launch your sales workspace:</p>
  `;

  const html = buildBrandedEmailHtml({
    title: `Welcome to SCRM, ${user.name}!`,
    preheader: "Your SCRM account is active and ready.",
    bodyHtml,
    ctaText: "Launch SCRM Dashboard",
    ctaUrl: `${appUrl}/login`
  });

  return sendEmail({
    to: user.email,
    subject: `Welcome to SCRM, ${user.name}!`,
    html,
    text: `Welcome to SCRM, ${user.name}! Log in at ${appUrl}/login`,
    userId: user.id,
    templateName: "Welcome"
  });
}

/**
 * SYSTEM TRIGGER 2: Security Alert & Profile Update Email
 */
export async function sendSecurityAlertEmail(user, actionDetails) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const bodyHtml = `
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>This is a security alert to confirm that a security-sensitive change occurred on your SCRM account:</p>
    <div style="background: #222222; border-left: 3px solid #F0FF60; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <strong>Action:</strong> ${actionDetails.action || "Profile Updated"}<br>
      <strong>Timestamp:</strong> ${new Date().toUTCString()}<br>
      <strong>Details:</strong> ${actionDetails.details || "Credentials or settings modified"}
    </div>
    <p>If you authorized this change, no further action is necessary. If you did NOT authorize this change, please immediately reset your password and contact your CRM administrator.</p>
  `;

  const html = buildBrandedEmailHtml({
    title: "Security Alert: Account Activity Detected",
    preheader: "Security notification regarding your SCRM account.",
    bodyHtml,
    ctaText: "Review Account Security",
    ctaUrl: `${appUrl}`
  });

  return sendEmail({
    to: user.email,
    subject: "SCRM Security Notification: Account Activity",
    html,
    text: `Security Notification for ${user.email}: ${actionDetails.action || "Account changed"} on ${new Date().toISOString()}`,
    userId: user.id,
    templateName: "Security_Alert"
  });
}

/**
 * SYSTEM TRIGGER 3: Password Reset Verification Email
 */
export async function sendPasswordResetEmail(user, resetToken) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const resetLink = `${appUrl}/login?resetToken=${resetToken}&email=${encodeURIComponent(user.email)}`;
  const bodyHtml = `
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>We received a request to reset the password for your SCRM account (<code>${user.email}</code>).</p>
    <p>Click the button below to choose a new password. This reset link is valid for <strong>1 hour</strong>.</p>
    <p style="font-size: 13px; color: #A0A0A0; margin-top: 20px;">If you did not request a password reset, you can safely ignore this email.</p>
  `;

  const html = buildBrandedEmailHtml({
    title: "Reset Your SCRM Password",
    preheader: "Instructions for resetting your SCRM account password.",
    bodyHtml,
    ctaText: "Reset My Password",
    ctaUrl: resetLink
  });

  return sendEmail({
    to: user.email,
    subject: "SCRM: Password Reset Request",
    html,
    text: `Reset your SCRM password at: ${resetLink}`,
    userId: user.id,
    templateName: "Password_Reset"
  });
}

/**
 * SYSTEM TRIGGER 4: Two-Factor Authentication (2FA) OTP Email
 */
export async function send2FAVerificationEmail(user, otpCode) {
  const bodyHtml = `
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Use the following 6-digit verification code to complete your two-factor authentication login:</p>
    <div class="code-box">${otpCode}</div>
    <p>This verification code is strictly confidential and will expire in <strong>10 minutes</strong>.</p>
    <p style="font-size: 13px; color: #A0A0A0;">Never share this code with anyone. SCRM staff will never ask for your verification code.</p>
  `;

  const html = buildBrandedEmailHtml({
    title: "Your Two-Factor Verification Code",
    preheader: `Your verification code is ${otpCode}`,
    bodyHtml
  });

  return sendEmail({
    to: user.email,
    subject: `SCRM Security: Your Login Verification Code is ${otpCode}`,
    html,
    text: `Your SCRM 2-step verification code is: ${otpCode}. It expires in 10 minutes.`,
    userId: user.id,
    templateName: "2FA_Verification"
  });
}

/**
 * Diagnostic: Verify SMTP Connection
 */
export async function verifySmtpConnection() {
  if (!transporter) {
    return {
      connected: false,
      configured: false,
      message: "No SMTP transporter configured. Please set GMAIL_USER & GMAIL_APP_PASS or SMTP credentials in .env"
    };
  }
  try {
    await transporter.verify();
    return {
      connected: true,
      configured: true,
      relay: isGmailConfigured ? "Gmail Service Relay" : `Standard SMTP (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587})`,
      fromAddress: process.env.GMAIL_USER || process.env.SMTP_FROM || process.env.SMTP_USER,
      message: "SMTP connection verified successfully."
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      error: err.message,
      message: `SMTP connection verification failed: ${err.message}`
    };
  }
}

/**
 * Diagnostic: Send Real Test Email
 */
export async function sendTestEmail(recipientEmail) {
  const bodyHtml = `
    <p>This is a real diagnostic test message dispatched from your <strong>SCRM Enterprise</strong> platform.</p>
    <p>If you are receiving this message, your SMTP relay and credential configuration are functioning correctly and ready for customer communications.</p>
    <div style="background: #252525; border-left: 3px solid #F0FF60; padding: 12px; margin: 16px 0; font-family: monospace; font-size: 13px;">
      <div><strong>Dispatched At:</strong> ${new Date().toISOString()}</div>
      <div><strong>Relay Type:</strong> ${isGmailConfigured ? "Gmail Service Relay" : "Standard SMTP"}</div>
      <div><strong>Recipient:</strong> ${recipientEmail}</div>
    </div>
  `;
  const html = buildBrandedEmailHtml({
    title: "SCRM SMTP Diagnostics Test",
    preheader: "Your SCRM email relay is operational.",
    bodyHtml
  });
  return sendEmail({
    to: recipientEmail,
    subject: "SCRM Diagnostic: Real SMTP Test Delivery",
    html,
    text: `SCRM Diagnostic: Real SMTP Test Delivery sent to ${recipientEmail} at ${new Date().toISOString()}`,
    templateName: "SMTP_Diagnostics_Test"
  });
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  sendPasswordResetEmail,
  send2FAVerificationEmail,
  verifySmtpConnection,
  sendTestEmail,
  buildBrandedEmailHtml
};
