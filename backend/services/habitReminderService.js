import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import ReminderLog from '../models/ReminderLog.js';
import User from '../models/User.js';
import whatsappClient from './whatsappClient.js';
import { sendReminderEmail, emailEnabled } from './emailReminderService.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const IST_OFFSET_MS       = 5.5 * 60 * 60 * 1000;
const SEND_WINDOW_MINUTES = 60;
const BATCH_SIZE          = 5;
const BATCH_DELAY_MS      = 2000;
const SESSION_TTL_MS      = 23 * 60 * 60 * 1000; // 23h safety margin

// Twilio sandbox session-expired error codes / messages
const SANDBOX_ERROR_CODES = [63016, 63018, 21608];
const SANDBOX_ERROR_TEXTS = [
  'not currently opted in', 'session expired', 'not joined',
  'outside allowed window', 'user did not send',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getISTNow() {
  const nowUTC = new Date();
  const istMs  = nowUTC.getTime() + IST_OFFSET_MS;
  const ist    = new Date(istMs);
  const istMidnightUTC = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS
  );
  return {
    hours:       ist.getUTCHours(),
    minutes:     ist.getUTCMinutes(),
    todayIST:    istMidnightUTC,
    tomorrowIST: new Date(istMidnightUTC.getTime() + 24 * 60 * 60 * 1000),
    dateKey: `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`,
  };
}

function timeToMinutes(t) {
  const [h, m] = (t || '09:00').split(':').map(Number);
  return h * 60 + m;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isSandboxSessionError(err) {
  const code    = Number(err?.code || err?.status || 0);
  const msg     = (err?.message || '').toLowerCase();
  return SANDBOX_ERROR_CODES.includes(code) ||
         SANDBOX_ERROR_TEXTS.some(t => msg.includes(t));
}

function hasActiveSandboxSession(user) {
  const s = user.whatsappSandbox;
  if (!s?.joined || !s?.lastMessageAt) return false;
  return (Date.now() - new Date(s.lastMessageAt).getTime()) < SESSION_TTL_MS;
}

// ─── Main service ─────────────────────────────────────────────────────────────
class HabitReminderService {

  // ── Entry point — used by both midnight cron AND admin trigger ─────────────
  async checkAndSendReminders({ returnStats = false, ignoreWindow = false } = {}) {
    const stats = {
      // WhatsApp counters
      whatsappSent: 0, whatsappSkipped: 0, whatsappFailed: 0,
      sessionExpired: 0, notJoined: 0,
      // Email fallback counters
      emailSent: 0, emailSkipped: 0, emailFailed: 0,
      // Overall
      batches: 0,
    };

    try {
      const { hours, minutes, todayIST, tomorrowIST, dateKey } = getISTNow();
      const nowMinutes = hours * 60 + minutes;

      console.log(
        `[ReminderService] ▶ Start | IST ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')} | ` +
        `date: ${dateKey} | ignoreWindow: ${ignoreWindow}`
      );

      // Fetch everyone who has reminder-enabled habits (with or without WhatsApp)
      const allUsers = await User.find({}).lean();
      const eligibleUsers = [];

      for (const u of allUsers) {
        const hasHabits = await Habit.exists({
          userId: u._id, isActive: true, 'reminder.enabled': true,
        });
        if (hasHabits) eligibleUsers.push(u);
      }

      if (!eligibleUsers.length) {
        console.log('[ReminderService] No users with reminder-enabled habits.');
        return returnStats ? stats : undefined;
      }

      console.log(`[ReminderService] ${eligibleUsers.length} eligible user(s) → batches of ${BATCH_SIZE}`);

      const batches = chunkArray(eligibleUsers, BATCH_SIZE);

      for (let bi = 0; bi < batches.length; bi++) {
        stats.batches++;
        console.log(`[ReminderService] 📦 Batch ${bi + 1}/${batches.length} — ${batches[bi].length} user(s)`);

        const results = await Promise.allSettled(
          batches[bi].map(user =>
            this._processUser(user, nowMinutes, todayIST, tomorrowIST, ignoreWindow)
          )
        );

        for (const r of results) {
          if (r.status === 'fulfilled') {
            stats.whatsappSent     += r.value.whatsappSent;
            stats.whatsappSkipped  += r.value.whatsappSkipped;
            stats.whatsappFailed   += r.value.whatsappFailed;
            stats.sessionExpired   += r.value.sessionExpired;
            stats.notJoined        += r.value.notJoined;
            stats.emailSent        += r.value.emailSent;
            stats.emailSkipped     += r.value.emailSkipped;
            stats.emailFailed      += r.value.emailFailed;
          } else {
            stats.whatsappFailed++;
            console.error('[ReminderService] Batch promise rejected:', r.reason);
          }
        }

        console.log(
          `[ReminderService] Batch ${bi + 1} done — ` +
          `WA sent:${stats.whatsappSent} expired:${stats.sessionExpired} notJoined:${stats.notJoined} | ` +
          `Email sent:${stats.emailSent} skipped:${stats.emailSkipped} failed:${stats.emailFailed}`
        );

        if (bi < batches.length - 1) {
          console.log(`[ReminderService] ⏳ ${BATCH_DELAY_MS}ms pause…`);
          await sleep(BATCH_DELAY_MS);
        }
      }

      console.log(
        `[ReminderService] 🏁 Complete — ` +
        `WA: sent=${stats.whatsappSent} expired=${stats.sessionExpired} notJoined=${stats.notJoined} failed=${stats.whatsappFailed} | ` +
        `Email: sent=${stats.emailSent} skipped=${stats.emailSkipped} failed=${stats.emailFailed}`
      );

    } catch (err) {
      console.error('[ReminderService] Fatal error:', err);
    }

    return returnStats ? stats : undefined;
  }

  // ── Process all reminder habits for one user ───────────────────────────────
  async _processUser(user, nowMinutes, todayIST, tomorrowIST, ignoreWindow) {
    const result = {
      whatsappSent: 0, whatsappSkipped: 0, whatsappFailed: 0,
      sessionExpired: 0, notJoined: 0,
      emailSent: 0, emailSkipped: 0, emailFailed: 0,
    };

    const habits = await Habit.find({
      userId: user._id, isActive: true, 'reminder.enabled': true,
    }).lean();

    if (!habits.length) return result;

    // ── Determine which habits still need a reminder today ────────────────
    const pendingHabits = [];
    for (const habit of habits) {
      const eligible = await this._isHabitPending(
        habit, user, nowMinutes, todayIST, tomorrowIST, ignoreWindow
      );
      if (eligible) pendingHabits.push(habit);
    }

    if (!pendingHabits.length) {
      result.whatsappSkipped = habits.length;
      return result;
    }

    // ── Decide channel: WhatsApp first, email as fallback ─────────────────
    const waOk = whatsappClient.isConnected() &&
                 user.whatsappNumber &&
                 hasActiveSandboxSession(user);

    if (waOk) {
      // ── WhatsApp path ──────────────────────────────────────────────────
      for (const habit of pendingHabits) {
        try {
          const outcome = await this._sendWhatsAppReminder(user, habit, todayIST);
          if (outcome === 'sent')          result.whatsappSent++;
          else if (outcome === 'session') {
            result.sessionExpired++;
            // Session just expired mid-batch — fall through to email for remaining habits
            break;
          }
        } catch {
          result.whatsappFailed++;
        }
      }
    } else {
      // ── Log why WhatsApp was skipped ───────────────────────────────────
      if (user.whatsappNumber) {
        if (!user.whatsappSandbox?.joined) {
          result.notJoined++;
          await User.findByIdAndUpdate(user._id, {
            'whatsappSandbox.sessionActive': false,
            'whatsappSandbox.failReason':
              'Number has not joined the Twilio sandbox. Falling back to email.',
          });
        } else {
          result.sessionExpired++;
          await User.findByIdAndUpdate(user._id, {
            'whatsappSandbox.sessionActive': false,
            'whatsappSandbox.failReason':
              'Sandbox session expired (>23h since last message). Falling back to email.',
          });
        }
      }

      // ── Email fallback ─────────────────────────────────────────────────
      const emailOutcome = await this._sendEmailFallback(user, pendingHabits, todayIST);
      if (emailOutcome === 'sent')        result.emailSent++;
      else if (emailOutcome === 'skipped') result.emailSkipped++;
      else                                result.emailFailed++;
    }

    return result;
  }

  // ── Check whether a single habit still needs a reminder ───────────────────
  async _isHabitPending(habit, user, nowMinutes, todayIST, tomorrowIST, ignoreWindow) {
    // Time-window check (skipped for midnight blast / admin trigger)
    if (!ignoreWindow) {
      const elapsed = nowMinutes - timeToMinutes(habit.reminder?.time);
      if (elapsed < 0 || elapsed > SEND_WINDOW_MINUTES) return false;
    }

    // Already sent a reminder today (via any channel)?
    const alreadySent = await ReminderLog.findOne({
      habitId: habit._id, userId: user._id, date: todayIST, status: 'sent',
    });
    if (alreadySent) return false;

    // Already completed today?
    const done = await HabitLog.findOne({
      habitId: habit._id, userId: user._id,
      date: { $gte: todayIST, $lt: tomorrowIST }, completed: true,
    });
    return !done;
  }

  // ── Send one WhatsApp reminder and log it ─────────────────────────────────
  async _sendWhatsAppReminder(user, habit, todayIST) {
    const message =
      `🔔 *Habit Reminder*\n\n` +
      `Don't forget: *${habit.name}*\n` +
      (habit.description ? `_${habit.description}_\n\n` : '\n') +
      `Stay consistent — every day counts! 💪`;

    try {
      await whatsappClient.sendMessage(user.whatsappNumber, message);

      await ReminderLog.create({
        habitId: habit._id, userId: user._id, date: todayIST,
        reminderSent: true, status: 'sent',
        reminderType: 'morning', sentAt: new Date(), message,
      });

      await User.findByIdAndUpdate(user._id, {
        'whatsappSandbox.sessionActive': true,
        'whatsappSandbox.failReason':    null,
      });

      console.log(`[ReminderService] 📲 WA → ${user.whatsappNumber} "${habit.name}"`);
      return 'sent';

    } catch (err) {
      if (isSandboxSessionError(err)) {
        await User.findByIdAndUpdate(user._id, {
          'whatsappSandbox.sessionActive': false,
          'whatsappSandbox.failReason':    `Session error: ${err.message}`,
        });

        await ReminderLog.create({
          habitId: habit._id, userId: user._id, date: todayIST,
          reminderSent: false, status: 'failed',
          sentAt: new Date(), message, error: err.message,
        });

        console.warn(`[ReminderService] 🔒 WA session error for ${user.whatsappNumber}: ${err.message}`);
        return 'session';
      }

      console.error(`[ReminderService] ❌ WA failed ${user.whatsappNumber}: ${err.message}`);
      throw err;
    }
  }

  // ── Send email fallback for ALL pending habits in one email ───────────────
  // Collects all pending habits and sends a single consolidated email.
  // Logs ONE ReminderLog entry per habit so duplicates are prevented.
  async _sendEmailFallback(user, pendingHabits, todayIST) {
    if (!emailEnabled()) {
      console.log(`[ReminderService] 📧 Email not configured — skipping fallback for ${user.email || user._id}`);
      return 'skipped';
    }

    if (!user.email) {
      console.log(`[ReminderService] 📧 No email address for user ${user._id} — skipping fallback`);
      return 'skipped';
    }

    const habitList = pendingHabits.map(h => ({
      name:        h.name,
      description: h.description || '',
    }));

    const outcome = await sendReminderEmail(user, habitList);

    if (outcome === 'sent') {
      // Log one ReminderLog per habit so future runs know reminders were sent today
      await Promise.allSettled(
        pendingHabits.map(habit =>
          ReminderLog.create({
            habitId:      habit._id,
            userId:       user._id,
            date:         todayIST,
            reminderSent: true,
            status:       'sent',
            reminderType: 'morning',
            sentAt:       new Date(),
            message:      `[email fallback] ${habit.name}`,
          })
        )
      );
      console.log(`[ReminderService] 📧 Email fallback sent to ${user.email} (${pendingHabits.length} habits)`);
    }

    return outcome;
  }

  // ── Weekly summary reports (also batched, email fallback included) ─────────
  async sendWeeklyReports() {
    try {
      const allUsers = await User.find({
        'preferences.reminderType': { $in: ['weekly', 'both'] },
      }).lean();

      if (!allUsers.length) {
        console.log('[ReminderService] No users opted in for weekly reports.');
        return;
      }

      console.log(`[ReminderService] Weekly reports — ${allUsers.length} user(s), batches of ${BATCH_SIZE}`);
      const batches = chunkArray(allUsers, BATCH_SIZE);

      for (let i = 0; i < batches.length; i++) {
        console.log(`[ReminderService] 📦 Weekly batch ${i + 1}/${batches.length}`);
        await Promise.allSettled(batches[i].map(u => this._sendWeeklyReport(u)));
        if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
      }

      console.log('[ReminderService] 🏁 Weekly reports complete.');
    } catch (err) {
      console.error('[ReminderService] Weekly reports error:', err);
    }
  }

  async _sendWeeklyReport(user) {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const habits = await Habit.find({ userId: user._id, isActive: true }).lean();
      let completedCount = 0;
      const habitLines = [];

      for (const habit of habits) {
        const logs = await HabitLog.find({
          habitId: habit._id, userId: user._id,
          date: { $gte: weekStart }, completed: true,
        });
        if (logs.length > 0) completedCount++;
        habitLines.push(`• ${habit.name}: ${logs.length}/7 days`);
      }

      const score   = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
      const message =
        `📊 *Weekly Habit Report*\n\n` +
        habitLines.join('\n') + '\n\n' +
        `✅ Consistency Score: *${score}%*\n` +
        `Keep building those habits! 🚀`;

      const waOk = whatsappClient.isConnected() &&
                   user.whatsappNumber &&
                   hasActiveSandboxSession(user);

      if (waOk) {
        await whatsappClient.sendMessage(user.whatsappNumber, message);
        console.log(`[ReminderService] 📲 Weekly WA → ${user.whatsappNumber}`);
      } else if (emailEnabled() && user.email) {
        // Simple plain-text weekly summary email — reuse reminder template
        const { sendReminderEmail: sendEmail } = await import('./emailReminderService.js');
        // Build a summary habit list for the email template
        const summaryHabits = habits.map((h, i) => ({
          name:        h.name,
          description: habitLines[i],
        }));
        await sendEmail(user, summaryHabits);
        console.log(`[ReminderService] 📧 Weekly email fallback → ${user.email}`);
      } else {
        console.log(`[ReminderService] Weekly: no channel available for ${user._id}`);
      }
    } catch (err) {
      console.error(`[ReminderService] Weekly report failed for ${user._id}:`, err.message);
    }
  }

  // ── Milestone message ──────────────────────────────────────────────────────
  async sendMilestoneMessage(user, habit, streak) {
    try {
      const milestones = {
        3:   "🎉 3-day streak! You're building momentum!",
        7:   "🔥 One full week! You're unstoppable!",
        21:  "🏆 21 days! You've officially formed a habit!",
        30:  "👑 30 days! Absolutely extraordinary!",
        100: "💯 100 DAYS! You are a habit LEGEND!",
      };
      if (!milestones[streak]) return;

      const message = `${milestones[streak]}\n\nHabit: *${habit.name}*\nStreak: *${streak} days* 🔥`;

      const waOk = whatsappClient.isConnected() &&
                   user.whatsappNumber &&
                   hasActiveSandboxSession(user);

      if (waOk) {
        await whatsappClient.sendMessage(user.whatsappNumber, message);
        console.log(`[ReminderService] 🏅 Milestone (${streak}d) WA → ${user.whatsappNumber}`);
      } else if (emailEnabled() && user.email) {
        // Milestone via email — treat the milestone as a one-habit reminder
        const { sendReminderEmail: sendEmail } = await import('./emailReminderService.js');
        await sendEmail(user, [{ name: `${milestones[streak]} — ${habit.name}`, description: `${streak}-day streak!` }]);
        console.log(`[ReminderService] 🏅 Milestone (${streak}d) email → ${user.email}`);
      }
    } catch (err) {
      console.error('[ReminderService] Milestone failed:', err.message);
    }
  }

  // ── Inbound webhook handler (refreshes sandbox session) ───────────────────
  async handleInboundMessage(from, body) {
    try {
      const number    = from.replace('whatsapp:', '').replace('+', '').trim();
      const isJoinMsg = /^join\s+\S+/i.test((body || '').trim());

      // ANY inbound message from a user proves they have joined the sandbox
      // and opens/refreshes their 24h session window.
      // We always set joined=true — if they can message us, they have joined.
      const update = {
        'whatsappSandbox.joined':        true,   // ← always true on any inbound message
        'whatsappSandbox.sessionActive': true,
        'whatsappSandbox.lastMessageAt': new Date(),
        'whatsappSandbox.failReason':    null,
      };

      // Track first join time only when they send the actual join message
      if (isJoinMsg) {
        update['whatsappSandbox.joinedAt'] = new Date();
      }

      const updated = await User.findOneAndUpdate(
        { whatsappNumber: number },
        update,
        { new: true }
      );

      if (updated) {
        console.log(
          `[ReminderService] 📩 Inbound from ${number} — joined=true, session active` +
          (isJoinMsg ? ' (join message)' : '')
        );
      } else {
        console.log(`[ReminderService] 📩 Inbound from unknown number ${number} — not in DB`);
      }
    } catch (err) {
      console.error('[ReminderService] handleInboundMessage error:', err);
    }
  }

  // ── Sandbox status for admin table ─────────────────────────────────────────
  async getSandboxStatus() {
    const users = await User.find({
      whatsappNumber: { $exists: true, $nin: [null, ''] },
    }).select('name whatsappNumber whatsappSandbox email').lean();

    return users.map(u => ({
      name:          u.name,
      number:        u.whatsappNumber,
      email:         u.email,
      joined:        u.whatsappSandbox?.joined        ?? false,
      sessionActive: u.whatsappSandbox?.sessionActive ?? false,
      lastMessageAt: u.whatsappSandbox?.lastMessageAt ?? null,
      failReason:    u.whatsappSandbox?.failReason    ?? null,
    }));
  }
}

export default new HabitReminderService();