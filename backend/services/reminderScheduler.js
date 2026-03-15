import cron from 'node-cron';
import habitReminderService from './habitReminderService.js';
import whatsappClient from './whatsappClient.js';

/**
 * ReminderScheduler
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Job 1 — Every 5 minutes                                                │
 * │  Per-habit window check. Sends only habits whose reminder.time falls    │
 * │  within the current 60-minute window. Skips users with expired/no       │
 * │  sandbox session. Batched: 5 users → 2s → next 5.                      │
 * │                                                                          │
 * │  Job 2 — 12:00 AM IST every night (18:30 UTC)  ← MIDNIGHT BLAST        │
 * │  ignoreWindow=true → sends to ALL eligible users regardless of          │
 * │  reminder.time. Skips users whose sandbox session is expired/not        │
 * │  joined. Same batching as above.                                         │
 * │  This is also what the admin "Run Reminder Check" button calls.         │
 * │                                                                          │
 * │  Job 3 — Sunday 9 PM IST (15:30 UTC)                                    │
 * │  Weekly summary reports, also batched.                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Sandbox Session Lifecycle
 * ─────────────────────────
 * 1. User sends "join <code>" to +14155238886 on WhatsApp.
 *    → POST /api/whatsapp/webhook fires → handleInboundMessage() marks
 *      whatsappSandbox.joined=true, sessionActive=true, lastMessageAt=now
 *
 * 2. Any subsequent message from the user refreshes lastMessageAt → session stays alive.
 *
 * 3. If no message for 23+ hours → hasActiveSandboxSession() returns false
 *    → user is skipped in next batch run → failReason is written to their record.
 *
 * 4. Admin can see all users' session status via GET /api/whatsapp/sandbox-status.
 */
class ReminderScheduler {
  constructor() {
    this.regularJob  = null;
    this.midnightJob = null;
    this.weeklyJob   = null;
    this._running    = false;
  }

  async start() {
    console.log('[ReminderScheduler] Starting…');
    await whatsappClient.initialize();

    // ── Job 1: Every 5 minutes ────────────────────────────────────────────
    this.regularJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await habitReminderService.checkAndSendReminders({
          returnStats:  false,
          ignoreWindow: false,
        });
      } catch (err) {
        console.error('[ReminderScheduler] Regular check error:', err);
      }
    });

    // ── Job 2: 12:00 AM IST = 18:30 UTC ───────────────────────────────────
    this.midnightJob = cron.schedule('30 18 * * *', async () => {
      console.log('[ReminderScheduler] ⏰ Midnight blast (12:00 AM IST) starting…');
      try {
        const result = await habitReminderService.checkAndSendReminders({
          returnStats:  true,
          ignoreWindow: true,
        });
        console.log(
          `[ReminderScheduler] Midnight blast complete — ` +
          `batches:${result?.batches} | sent:${result?.sent} | skipped:${result?.skipped} | ` +
          `sessionExpired:${result?.sessionExpired} | notJoined:${result?.notJoined} | failed:${result?.failed}`
        );
      } catch (err) {
        console.error('[ReminderScheduler] Midnight blast error:', err);
      }
    });

    // ── Job 3: Weekly — Sunday 9 PM IST = 15:30 UTC ───────────────────────
    this.weeklyJob = cron.schedule('30 15 * * 0', async () => {
      console.log('[ReminderScheduler] 📊 Weekly reports starting…');
      try {
        await habitReminderService.sendWeeklyReports();
      } catch (err) {
        console.error('[ReminderScheduler] Weekly error:', err);
      }
    });

    this._running = true;
    console.log('[ReminderScheduler] ✅ Jobs started:');
    console.log('   Job 1  Per-habit check : every 5 min  (window-aware, session-aware, batched)');
    console.log('   Job 2  Midnight blast  : 12:00 AM IST / 18:30 UTC  (ignoreWindow, batched)');
    console.log('   Job 3  Weekly reports  : Sunday 9 PM IST / 15:30 UTC');
  }

  stop() {
    this.regularJob?.stop();
    this.midnightJob?.stop();
    this.weeklyJob?.stop();
    this._running = false;
    console.log('[ReminderScheduler] Stopped.');
  }

  getStatus() {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(18, 30, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

    return {
      whatsappConnected: whatsappClient.isConnected(),
      running:           this._running,
      nextMidnight:      next.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };
  }
}

export default new ReminderScheduler();