import { habitReminderEmailTemplate } from "./emailTemplate.js";

export function emailEnabled() {
  return !!process.env.BREVO_API_KEY;
}

async function sendViaBrevo({ to, subject, html, userName }) {
  const from = process.env.EMAIL_USER;
  if (!from) throw new Error("EMAIL_USER env var required");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "HabitTrack", email: from },
      to: [{ email: to, name: userName || to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo ${res.status}: ${err}`);
  }
}

export async function sendReminderEmail(user, habits, missedMode = false) {
  if (!emailEnabled()) {
    console.log("[EmailReminder] BREVO_API_KEY not set — skipping");
    return "skipped";
  }
  if (!user.email) {
    console.log(`[EmailReminder] No email for user ${user._id}`);
    return "skipped";
  }
  if (!habits?.length) return "skipped";

  const appUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/habits`;
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
    await sendViaBrevo({
      to: user.email,
      subject,
      html,
      userName: user.name || "",
    });
    console.log(
      `[EmailReminder] ✅ ${missedMode ? "[MISSED]" : "[ON-TIME]"} Sent to ${user.email} (${count} habit${count > 1 ? "s" : ""})`
    );
    return "sent";
  } catch (err) {
    console.error(`[EmailReminder] ❌ Failed for ${user.email}:`, err.message);
    return "failed";
  }
}