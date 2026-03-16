import twilio from "twilio";
import nodemailer from "nodemailer";
import { authFailureEmailTemplate } from "./emailTemplate.js";

const FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;

async function sendAuthFailureEmail({ error, context }) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

    const { default: User } = await import("../models/User.js");
    const admins = await User.find({ isAdmin: true }).select("email").lean();
    if (!admins.length) return;

    const to = admins.map((u) => u.email).join(", ");
    const settingsUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/settings?tab=whatsapp`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"HabitTrack Bot" <${process.env.EMAIL_USER}>`,
      to,
      subject: "⚠️ Twilio Authentication Failed — Reminders Paused",
      html: authFailureEmailTemplate({ error, context, settingsUrl }),
    });

    console.log(`[Twilio] Alert email sent to: ${to}`);
  } catch (err) {
    console.error("[Twilio] Failed to send alert email:", err.message);
  }
}

let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3;
let lastEmailSentAt = null;
const EMAIL_COOLDOWN_MS = 60 * 60 * 1000;

class WhatsAppClient {
  isConnected() {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
    );
  }

  async sendMessage(number, message) {
    if (!this.isConnected()) {
      const err = "Twilio credentials not configured";
      await this._handleFailure(err, "Missing env vars");
      throw new Error(err);
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    const to = `whatsapp:+${number.replace(/^\+/, "")}`;

    try {
      const result = await client.messages.create({
        from: FROM,
        to,
        body: message,
      });
      console.log(`[Twilio] Sent to ${to} — SID: ${result.sid}`);
      consecutiveFailures = 0;
      return { success: true, sid: result.sid };
    } catch (err) {
      await this._handleFailure(err.message, `Sending to ${number}`);
      throw err;
    }
  }

  async _handleFailure(errorMessage, context) {
    consecutiveFailures++;
    console.error(
      `[Twilio] Failure #${consecutiveFailures} — ${context}: ${errorMessage}`,
    );

    const isTwilioAuthError =
      errorMessage.includes("authenticate") ||
      errorMessage.includes("Authentication") ||
      errorMessage.includes("20003") ||
      errorMessage.includes("credentials") ||
      errorMessage.includes("not configured");

    const cooldownPassed =
      !lastEmailSentAt || Date.now() - lastEmailSentAt > EMAIL_COOLDOWN_MS;

    if (
      (isTwilioAuthError || consecutiveFailures >= FAILURE_THRESHOLD) &&
      cooldownPassed
    ) {
      lastEmailSentAt = Date.now();
      await sendAuthFailureEmail({ error: errorMessage, context });
    } else if (!cooldownPassed) {
      console.log("[Twilio] Email suppressed — cooldown active (1hr)");
    }
  }

  async initialize() {
    if (this.isConnected()) {
      console.log("[Twilio] WhatsApp client ready (sandbox mode)");
      try {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN,
        );
        await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log("[Twilio] Credentials verified ✓");
        consecutiveFailures = 0;
      } catch (err) {
        console.error("[Twilio] Credential check failed:", err.message);
        await this._handleFailure(err.message, "Startup credential check");
      }
    } else {
      console.warn(
        "[Twilio] Missing credentials — check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM",
      );
      await this._handleFailure(
        "Twilio credentials not configured",
        "Server startup",
      );
    }
  }

  async close() {}
  getQRCode() {
    return null;
  }
  getQRCodeDataUri() {
    return null;
  }
  getQRExpiresIn() {
    return 0;
  }
}

export default new WhatsAppClient();
