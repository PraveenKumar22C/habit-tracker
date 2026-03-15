// ─── Auth failure alert (existing, unchanged) ────────────────────────────────
export const authFailureEmailTemplate = ({ error, context, settingsUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Twilio Authentication Failed</title>
  <style>
    body { margin:0; padding:0; background-color:#0f0f0f; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
    .container { max-width:560px; margin:40px auto; padding:0 16px; }
    .card { background:#1a1a1a; border-radius:16px; overflow:hidden; border:1px solid #2a2a2a; }
    .header { background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%); padding:28px 32px 24px; text-align:center; }
    .header h1 { margin:0; font-size:24px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
    .header p { margin:6px 0 0; font-size:13px; color:rgba(255,255,255,0.7); }
    .body { padding:32px; }
    .alert-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:100px; padding:6px 14px; font-size:13px; font-weight:600; color:#ef4444; margin-bottom:20px; }
    h2 { margin:0 0 12px; font-size:22px; font-weight:700; color:#f0f0f0; line-height:1.3; }
    p { margin:0 0 16px; font-size:14px; color:#a1a1aa; line-height:1.7; }
    p strong { color:#f0f0f0; }
    .error-box { background:#111; border:1px solid #3f1111; border-radius:10px; padding:16px 20px; margin:20px 0; }
    .error-box p { margin:0; font-size:12px; color:#71717a; font-family:monospace; }
    .error-box .label { font-size:11px; font-weight:600; color:#ef4444; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
    .info-box { background:#111; border:1px solid #2a2a2a; border-radius:10px; padding:16px 20px; margin:20px 0 24px; }
    .info-box p { margin:0; font-size:13px; color:#71717a; }
    .info-box p+p { margin-top:6px; }
    .info-box span { color:#f0f0f0; font-weight:600; }
    .cta-btn { display:block; text-align:center; padding:14px 32px; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff !important; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px; box-shadow:0 4px 16px rgba(124,58,237,0.35); }
    .divider { height:1px; background:#2a2a2a; margin:28px 0; }
    .footer { padding:0 32px 28px; text-align:center; }
    .footer p { font-size:11px; color:#3f3f46; margin:0; }
    .footer p+p { margin-top:4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>HabitTrack</h1>
        <p>Automated alert from your server</p>
      </div>
      <div class="body">
        <div class="alert-badge">🚨 Authentication Failed</div>
        <h2>Twilio WhatsApp Reminders Paused</h2>
        <p>
          Your HabitTrack server failed to authenticate with <strong>Twilio</strong>.
          All WhatsApp reminders are currently <strong>paused</strong> until this is resolved.
        </p>
        <div class="error-box">
          <p class="label">Error details</p>
          <p><strong>Context:</strong> ${context}</p>
          <p style="margin-top:6px"><strong>Message:</strong> ${error}</p>
        </div>
        <div class="info-box">
          <p>📵 <span>Reminders paused</span> — users won't receive habit notifications</p>
          <p>🔑 <span>Fix:</span> Check your Twilio credentials in Render env vars</p>
        </div>
        <p>Verify these environment variables are set correctly on Render:</p>
        <div class="error-box">
          <p>TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>
          <p style="margin-top:4px">TWILIO_AUTH_TOKEN=your_auth_token</p>
          <p style="margin-top:4px">TWILIO_WHATSAPP_FROM=+14155238886</p>
        </div>
        <a href="${settingsUrl}" class="cta-btn">Open App Settings →</a>
        <div class="divider"></div>
        <p style="font-size:13px;margin:0;color:#52525b;">
          If credentials look correct, check your Twilio Console at
          <a href="https://console.twilio.com" style="color:#7c3aed;">console.twilio.com</a>
          for account status or billing issues.
        </p>
      </div>
      <div class="footer">
        <p>Sent automatically by your HabitTrack server.</p>
        <p>You are receiving this because your account has admin privileges.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ─── Tiny HTML escape — prevents injection from user-supplied habit names ─────
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Habit reminder email ─────────────────────────────────────────────────────
// Fallback sent when a user's WhatsApp sandbox session is expired or they
// haven't joined. Encourages them to log in and check their notification prefs.
// Also lists the habits they have waiting for today, so they see the value of
// rejoining the sandbox and getting WhatsApp reminders working again.  
export const habitReminderEmailTemplate = ({ userName, habits, appUrl }) => {
  const rows = habits.map(h => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #242424;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#f0f0f0;line-height:1.4;">
              ${escapeHtml(h.name)}
            </p>
            ${h.description
              ? `<p style="margin:3px 0 0;font-size:12px;color:#71717a;line-height:1.5;">${escapeHtml(h.description)}</p>`
              : ''}
          </td>
        </tr>`).join('');

  const count   = habits.length;
  const countTxt = count === 1
    ? `<strong style="color:#f0f0f0;">1 habit</strong> waiting for today`
    : `<strong style="color:#f0f0f0;">${count} habits</strong> waiting for today`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Daily habit reminder</title>
  <style>
    body{margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
    .wrap{max-width:520px;margin:40px auto;padding:0 16px;}
    .card{background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;}
    .hdr{background:linear-gradient(135deg,#1D9E75 0%,#0a5c44 100%);padding:28px 32px 22px;text-align:center;}
    .hdr h1{margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.3px;}
    .hdr p{margin:5px 0 0;font-size:12px;color:rgba(255,255,255,0.72);}
    .bdy{padding:32px;}
    .name{margin:0 0 4px;font-size:20px;font-weight:700;color:#f0f0f0;line-height:1.3;}
    .sub{margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.7;}
    table{width:100%;border-collapse:collapse;margin:0 0 28px;}
    table tr:last-child td{border-bottom:none;}
    .btn{display:block;text-align:center;padding:14px 32px;background:linear-gradient(135deg,#1D9E75,#0a5c44);color:#fff!important;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;}
    .div{height:1px;background:#2a2a2a;margin:28px 0;}
    .ftr{padding:0 32px 28px;text-align:center;}
    .ftr p{font-size:11px;color:#3f3f46;margin:0;line-height:1.6;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">

      <div class="hdr">
        <h1>HabitTrack</h1>
        <p>Daily reminder</p>
      </div>

      <div class="bdy">
        <p class="name">Hey ${escapeHtml(userName)} 👋</p>
        <p class="sub">You have ${countTxt}. Keep the streak going — every day counts.</p>

        <table>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <a href="${appUrl}" class="btn">Check In Now →</a>

        <div class="div"></div>
        <p style="font-size:13px;color:#52525b;margin:0;line-height:1.7;">
          Small steps, every day. That is how habits are built.
        </p>
      </div>

      <div class="ftr">
        <p>You are receiving this because you have active habits on HabitTrack.</p>
        <p>Log in to update your notification preferences.</p>
      </div>

    </div>
  </div>
</body>
</html>`;
};