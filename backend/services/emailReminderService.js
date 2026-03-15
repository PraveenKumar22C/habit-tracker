import nodemailer from 'nodemailer';
import { habitReminderEmailTemplate } from './emailTemplate.js';

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return _transporter;
}

export function emailEnabled() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

export async function sendReminderEmail(user, habits) {
  if (!emailEnabled()) {
    console.log('[EmailReminder] EMAIL_USER / EMAIL_PASS not set — skipping email fallback');
    return 'skipped';
  }

  if (!user.email) {
    console.log(`[EmailReminder] No email on user ${user._id} — skipping`);
    return 'skipped';
  }

  if (!habits || habits.length === 0) {
    return 'skipped';
  }

  const transporter = getTransporter();
  if (!transporter) return 'skipped';

  const appUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;

  const html = habitReminderEmailTemplate({
    userName: user.name || 'there',
    habits,
    appUrl,
  });

  try {
    await transporter.sendMail({
      from:    `"HabitTrack" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: `Your daily habit reminder — ${habits.length} habit${habits.length > 1 ? 's' : ''} today`,
      html,
    });

    console.log(`[EmailReminder] ✅ Sent to ${user.email} (${habits.length} habit${habits.length > 1 ? 's' : ''})`);
    return 'sent';
  } catch (err) {
    console.error(`[EmailReminder] ❌ Failed for ${user.email}:`, err.message);
    return 'failed';
  }
}