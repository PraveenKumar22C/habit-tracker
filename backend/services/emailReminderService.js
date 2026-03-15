import { habitReminderEmailTemplate } from './emailTemplate.js';

// ─── Why not nodemailer/SMTP? ─────────────────────────────────────────────────
// Render free tier blocks outbound TCP connections on SMTP ports (465, 587, 25).
// nodemailer with Gmail throws ENETUNREACH / Connection timeout.
// Solution: use an HTTP API-based email service instead.
//
// This file supports TWO providers — whichever env var is set wins:
//   Option A: RESEND_API_KEY      → resend.com  (free: 3000 emails/month, no card needed)
//   Option B: SENDGRID_API_KEY    → sendgrid.com (free: 100 emails/day)
//
// Add ONE of these to your Render environment variables:
//   RESEND_API_KEY=re_xxxxxxxxxxxx          (from resend.com → API Keys)
//   EMAIL_FROM=noreply@yourdomain.com       (verified sender, or use onboarding@resend.dev for testing)
//
//   OR
//
//   SENDGRID_API_KEY=SG.xxxxxxxxxxxx        (from sendgrid.com → Settings → API Keys)
//   EMAIL_FROM=noreply@yourdomain.com       (must be a verified sender in SendGrid)
// ──────────────────────────────────────────────────────────────────────────────

export function emailEnabled() {
  return !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
}

// ─── Send via Resend (https://resend.com) ─────────────────────────────────────
async function sendViaResend({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || 'HabitTrack <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  return await res.json();
}

// ─── Send via SendGrid (https://sendgrid.com) ─────────────────────────────────
async function sendViaSendGrid({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL;
  if (!from) throw new Error('EMAIL_FROM env var required for SendGrid');

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from:             { email: from, name: 'HabitTrack' },
      subject,
      content:          [{ type: 'text/html', value: html }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendGrid API error ${res.status}: ${err}`);
  }
  // SendGrid returns 202 with empty body on success
}

// ─── Main send function ───────────────────────────────────────────────────────
// @param {object} user    — { name, email }
// @param {Array}  habits  — [{ name, description? }]
// Returns 'sent' | 'skipped' | 'failed'
//
export async function sendReminderEmail(user, habits) {
  if (!emailEnabled()) {
    console.log('[EmailReminder] No email provider configured (set RESEND_API_KEY or SENDGRID_API_KEY)');
    return 'skipped';
  }
  if (!user.email) {
    console.log(`[EmailReminder] No email address for user ${user._id} — skipping`);
    return 'skipped';
  }
  if (!habits?.length) return 'skipped';

  const appUrl      = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
  const settingsUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?tab=whatsapp`;
  const sandboxNumber = process.env.TWILIO_WHATSAPP_FROM
    ? `+${process.env.TWILIO_WHATSAPP_FROM.replace(/^\+/, '')}`
    : '+14155238886';
  const sandboxCode = process.env.TWILIO_SANDBOX_CODE || 'join scientific-lungs';

  const html  = habitReminderEmailTemplate({ userName: user.name || 'there', habits, appUrl, sandboxNumber, sandboxCode, settingsUrl });
  const count = habits.length;
  const subject = `Your daily habit reminder — ${count} habit${count > 1 ? 's' : ''} today`;

  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend({ to: user.email, subject, html });
    } else {
      await sendViaSendGrid({ to: user.email, subject, html });
    }
    console.log(`[EmailReminder] ✅ Sent to ${user.email} (${count} habit${count > 1 ? 's' : ''})`);
    return 'sent';
  } catch (err) {
    console.error(`[EmailReminder] ❌ Failed for ${user.email}:`, err.message);
    return 'failed';
  }
}