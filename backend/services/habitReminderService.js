import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import ReminderLog from '../models/ReminderLog.js';
import User from '../models/User.js';
import whatsappClient from './whatsappClient.js';

// IST = UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns current IST time details.
 */
function getISTNow() {
  const nowUTC = new Date();
  const istMs = nowUTC.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);

  // IST midnight expressed as UTC (for MongoDB date-range queries)
  const istMidnightUTC = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS
  );

  return {
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
    todayIST: istMidnightUTC,
    tomorrowIST: new Date(istMidnightUTC.getTime() + 24 * 60 * 60 * 1000),
    dateKey: `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`,
  };
}

/** Convert "HH:MM" to total minutes since midnight */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const SEND_WINDOW_MINUTES = 60;

class HabitReminderService {
  async checkAndSendReminders() {
    try {
      if (!whatsappClient.isConnected()) {
        console.log('[ReminderService] WhatsApp not connected, skipping');
        return;
      }

      const { hours, minutes, todayIST, tomorrowIST, dateKey } = getISTNow();
      const nowMinutes = hours * 60 + minutes;

      console.log(
        `[ReminderService] Check | IST ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')} (${nowMinutes} min) | date: ${dateKey}`
      );

      const users = await User.find({
        whatsappNumber: { $exists: true, $ne: null, $ne: '' },
      });

      for (const user of users) {
        const habits = await Habit.find({
          userId: user._id,
          isActive: true,
          'reminder.enabled': true,
        });

        for (const habit of habits) {
          await this._processHabitReminder(user, habit, nowMinutes, todayIST, tomorrowIST);
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error in checkAndSendReminders:', error);
    }
  }

  async _processHabitReminder(user, habit, nowMinutes, todayIST, tomorrowIST) {
    try {
      const reminderTime = habit.reminder?.time || '09:00';
      const scheduledMinutes = timeToMinutes(reminderTime);
      const elapsed = nowMinutes - scheduledMinutes;

      // ── 10-minute window: [0, 10] minutes after scheduled time ───────────
      if (elapsed < 0 || elapsed > SEND_WINDOW_MINUTES) return;

      // ── Already sent (or skipped) today? ──────────────────────────────────
      const alreadyLogged = await ReminderLog.findOne({
        habitId: habit._id,
        userId: user._id,
        date: todayIST,
        reminderSent: true,
      });
      if (alreadyLogged) {
        console.log(`[ReminderService] Already handled "${habit.name}" today, skipping`);
        return;
      }

      // ── Already completed today? ──────────────────────────────────────────
      const completedToday = await HabitLog.findOne({
        habitId: habit._id,
        userId: user._id,
        date: { $gte: todayIST, $lt: tomorrowIST },
        completed: true,
      });

      if (completedToday) {
        await ReminderLog.create({
          habitId: habit._id,
          userId: user._id,
          date: todayIST,
          reminderSent: true,
          status: 'sent',
          sentAt: new Date(),
          message: 'Habit already completed today — reminder skipped',
        });
        return;
      }

      // ── Fire! ─────────────────────────────────────────────────────────────
      await this._sendReminderMessage(user, habit, todayIST);
    } catch (error) {
      console.error(`[ReminderService] Error processing habit "${habit.name}":`, error.message);
    }
  }

  async _sendReminderMessage(user, habit, todayIST) {
    try {
      const message =
        `🔔 *Habit Reminder*\n\n` +
        `Don't forget: *${habit.name}*\n` +
        (habit.description ? `_${habit.description}_\n\n` : '\n') +
        `Stay consistent — every day counts! 💪`;

      await whatsappClient.sendMessage(user.whatsappNumber, message);

      await ReminderLog.create({
        habitId: habit._id,
        userId: user._id,
        date: todayIST,
        reminderSent: true,
        status: 'sent',
        sentAt: new Date(),
        message,
      });

      console.log(`[ReminderService] ✅ Sent to ${user.whatsappNumber} for "${habit.name}"`);
    } catch (error) {
      console.error(`[ReminderService] ❌ Failed for "${habit.name}":`, error.message);

      await ReminderLog.create({
        habitId: habit._id,
        userId: user._id,
        date: todayIST,
        reminderSent: false,
        status: 'failed',
        error: error.message,
      }).catch(() => {});
    }
  }

  async sendWeeklyReports() {
    try {
      if (!whatsappClient.isConnected()) {
        console.log('[ReminderService] WhatsApp not connected, skipping weekly reports');
        return;
      }

      const users = await User.find({
        whatsappNumber: { $exists: true, $ne: null },
        'preferences.reminderType': { $in: ['weekly', 'both'] },
      });

      console.log(`[ReminderService] Sending weekly reports to ${users.length} users`);

      for (const user of users) {
        try {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);

          const habits = await Habit.find({ userId: user._id, isActive: true });
          let completedCount = 0;
          const habitLines = [];

          for (const habit of habits) {
            const logs = await HabitLog.find({
              habitId: habit._id,
              userId: user._id,
              date: { $gte: weekStart },
              completed: true,
            });
            const daysCompleted = logs.length;
            if (daysCompleted > 0) completedCount++;
            habitLines.push(`• ${habit.name}: ${daysCompleted}/7 days`);
          }

          const total = habits.length;
          const score = total > 0 ? Math.round((completedCount / total) * 100) : 0;

          const message =
            `📊 *Weekly Habit Report*\n\n` +
            habitLines.join('\n') + '\n\n' +
            `✅ Consistency Score: *${score}%*\n` +
            `Keep building those habits! 🚀`;

          await whatsappClient.sendMessage(user.whatsappNumber, message);
          console.log(`[ReminderService] Weekly report sent to ${user.whatsappNumber}`);
        } catch (error) {
          console.error(`[ReminderService] Failed weekly report for ${user.whatsappNumber}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error sending weekly reports:', error);
    }
  }

  async sendMilestoneMessage(user, habit, streak) {
    try {
      if (!whatsappClient.isConnected() || !user.whatsappNumber) return;

      const milestones = {
        3:   "🎉 3-day streak! You're building momentum!",
        7:   "🔥 One full week! You're unstoppable!",
        21:  "🏆 21 days! You've officially formed a habit!",
        30:  "👑 30 days! Absolutely extraordinary!",
        100: "💯 100 DAYS! You are a habit LEGEND!",
      };

      if (!milestones[streak]) return;

      const message =
        `${milestones[streak]}\n\n` +
        `Habit: *${habit.name}*\n` +
        `Streak: *${streak} days* 🔥`;

      await whatsappClient.sendMessage(user.whatsappNumber, message);
      console.log(`[ReminderService] Milestone (${streak} days) sent to ${user.whatsappNumber}`);
    } catch (error) {
      console.error('[ReminderService] Failed to send milestone:', error.message);
    }
  }
}

export default new HabitReminderService();