import { habitReminderEmailTemplate } from "./emailTemplate.js";

export function emailEnabled() {
  return !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
}

async function sendViaResend({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || "HabitTrack <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err}`);
  }
  return res.json();
}

async function sendViaSendGrid({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL;
  if (!from) throw new Error("EMAIL_FROM env var required for SendGrid");
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: "HabitTrack" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendGrid ${res.status}: ${err}`);
  }
}

export async function sendReminderEmail(user, habits, missedMode = false) {
  if (!emailEnabled()) {
    console.log(
      "[EmailReminder] No email provider configured (set RESEND_API_KEY or SENDGRID_API_KEY)",
    );
    return "skipped";
  }
  if (!user.email) {
    console.log(`[EmailReminder] No email for user ${user._id}`);
    return "skipped";
  }
  if (!habits?.length) return "skipped";

  const appUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
  const settingsUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/settings?tab=whatsapp`;
  const sandboxNumber = process.env.TWILIO_WHATSAPP_FROM
    ? `+${process.env.TWILIO_WHATSAPP_FROM.replace(/^\+/, "")}`
    : "+14155238886";
  const sandboxCode =
    process.env.TWILIO_SANDBOX_CODE || "join scientific-lungs";

  const html = habitReminderEmailTemplate({
    userName: user.name || "there",
    habits,
    appUrl,
    sandboxNumber,
    sandboxCode,
    settingsUrl,
    missedMode,
  });
  const count = habits.length;

  const subject = missedMode
    ? `⏰ You missed ${count} habit${count > 1 ? "s" : ""} today — it's not too late!`
    : `Your daily habit reminder — ${count} habit${count > 1 ? "s" : ""} today`;

  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend({ to: user.email, subject, html });
    } else {
      await sendViaSendGrid({ to: user.email, subject, html });
    }
    console.log(
      `[EmailReminder] ✅ ${missedMode ? "[MISSED]" : "[ON-TIME]"} Sent to ${user.email} (${count} habit${count > 1 ? "s" : ""})`,
    );
    return "sent";
  } catch (err) {
    console.error(`[EmailReminder] ❌ Failed for ${user.email}:`, err.message);
    return "failed";
  }
}
