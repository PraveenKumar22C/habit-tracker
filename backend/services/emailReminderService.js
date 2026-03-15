import nodemailer from 'nodemailer';
import { habitReminderEmailTemplate } from './emailTemplate.js';

// ── Lazy transporter ──────────────────────────────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return _transporter;
}

export function emailEnabled() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

// ─── Send a single reminder email to one user ─────────────────────────────────
// @param {object} user    — { name, email }
// @param {Array}  habits  — [{ name, description? }]
// Returns 'sent' | 'skipped' | 'failed'
//
export async function sendReminderEmail(user, habits) {
  if (!emailEnabled()) {
    console.log('[EmailReminder] EMAIL_USER/EMAIL_PASS not set — skipping email fallback');
    return 'skipped';
  }
  if (!user.email) {
    console.log(`[EmailReminder] No email for user ${user._id} — skipping`);
    return 'skipped';
  }
  if (!habits?.length) return 'skipped';

  const transporter = getTransporter();
  if (!transporter) return 'skipped';

  const appUrl      = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  const settingsUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?tab=whatsapp`;

  // Pass sandbox details from env so the template is always up-to-date
  const sandboxNumber = process.env.TWILIO_WHATSAPP_FROM
    ? `+${process.env.TWILIO_WHATSAPP_FROM.replace(/^\+/, '')}`
    : '+14155238886';
  const sandboxCode   = process.env.TWILIO_SANDBOX_CODE || 'join scientific-lungs';

  const html = habitReminderEmailTemplate({
    userName: user.name || 'there',
    habits,
    appUrl,
    sandboxNumber,
    sandboxCode,
    settingsUrl,
  });

  const count = habits.length;

  try {
    await transporter.sendMail({
      from:    `"HabitTrack" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: `Your daily habit reminder — ${count} habit${count > 1 ? 's' : ''} today`,
      html,
    });
    console.log(`[EmailReminder] ✅ Sent to ${user.email} (${count} habit${count > 1 ? 's' : ''})`);
    return 'sent';
  } catch (err) {
    console.error(`[EmailReminder] ❌ Failed for ${user.email}:`, err.message);
    return 'failed';
  }
}