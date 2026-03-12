export const sessionExpiredEmailTemplate = ({ settingsUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>WhatsApp Session Expired</title>
  <style>
    body {
      margin: 0; padding: 0;
      background-color: #0f0f0f;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      padding: 0 16px;
    }
    .card {
      background: #1a1a1a;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #2a2a2a;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      padding: 28px 32px 24px;
      text-align: center;
    }
    .header img {
      max-height: 52px;
      display: block;
      margin: 0 auto;
    }
    .body {
      padding: 32px;
    }
    .alert-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: 100px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #f59e0b;
      margin-bottom: 20px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 22px;
      font-weight: 700;
      color: #f0f0f0;
      line-height: 1.3;
    }
    p {
      margin: 0 0 16px;
      font-size: 14px;
      color: #a1a1aa;
      line-height: 1.7;
    }
    p strong {
      color: #f0f0f0;
    }
    .info-box {
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 20px 0 24px;
    }
    .info-box p {
      margin: 0;
      font-size: 13px;
      color: #71717a;
    }
    .info-box p + p { margin-top: 6px; }
    .info-box span {
      color: #f0f0f0;
      font-weight: 600;
    }
    .cta-btn {
      display: block;
      text-align: center;
      padding: 14px 32px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.2px;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
    }
    .divider {
      height: 1px;
      background: #2a2a2a;
      margin: 28px 0;
    }
    .footer {
      padding: 0 32px 28px;
      text-align: center;
    }
    .footer p {
      font-size: 11px;
      color: #3f3f46;
      margin: 0;
    }
    .footer p + p { margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">

      <div class="header">
        <img src="cid:habitTrackerLogo" alt="HabitTrack" />
      </div>

      <div class="body">
        <div class="alert-badge">⚠️ Action Required</div>

        <h2>WhatsApp Session Disconnected</h2>

        <p>
          Your HabitTrack WhatsApp bot has been <strong>disconnected or its session has expired</strong>.
          All scheduled reminders are currently <strong>paused</strong> until you re-link the account.
        </p>

        <div class="info-box">
          <p>📵 <span>Reminders paused</span> — users won't receive habit notifications</p>
          <p>⏱️ <span>Fix takes ~30 seconds</span> — just scan a new QR code</p>
        </div>

        <p>Open your admin settings and scan the new QR code to restore WhatsApp reminders for all users.</p>

        <a href="${settingsUrl}" class="cta-btn">Open WhatsApp Settings →</a>

        <div class="divider"></div>

        <p style="font-size: 13px; margin: 0; color: #52525b;">
          If you did not expect this alert or need help, reply to this email or check your server logs.
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