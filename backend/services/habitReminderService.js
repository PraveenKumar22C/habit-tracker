import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import ReminderLog from '../models/ReminderLog.js';
import User from '../models/User.js';
import whatsappClient from './whatsappClient.js';

class HabitReminderService {

  async checkAndSendReminders() {
    try {
      if (!whatsappClient.isConnected()) {
        console.log('[ReminderService] WhatsApp not connected, skipping');
        return;
      }

      const now = new Date();
      const currentHour   = now.getHours();
      const currentMinute = now.getMinutes();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      console.log(`[ReminderService] Checking reminders at ${String(currentHour).padStart(2,'0')}:${String(currentMinute).padStart(2,'0')}`);

      const users = await User.find({
        whatsappNumber: { $exists: true, $ne: null },
      });

      for (const user of users) {
        const habits = await Habit.find({
          userId: user._id,
          isActive: true,
          'reminder.enabled': true,
        });

        for (const habit of habits) {
          await this._processHabitReminder(user, habit, now, today);
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error checking reminders:', error);
    }
  }

  async _processHabitReminder(user, habit, now, today) {
    try {
      const reminderTime = habit.reminder?.time || '09:00';
      const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);

      const scheduledMs = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        reminderHour, reminderMinute, 0, 0
      ).getTime();

      const diffMinutes = (now.getTime() - scheduledMs) / 60000;

      if (diffMinutes < 0 || diffMinutes > 5) {
        return;
      }

      const alreadySent = await ReminderLog.findOne({
        habitId: habit._id,
        userId: user._id,
        date: today,
        reminderSent: true,
      });

      if (alreadySent) {
        return;
      }

      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const todayLog = await HabitLog.findOne({
        habitId: habit._id,
        userId: user._id,
        date: { $gte: today, $lt: tomorrow },
        completed: true,
      });

      if (todayLog) {
        await ReminderLog.create({
          habitId: habit._id,
          userId: user._id,
          date: today,
          reminderSent: true,
          status: 'sent',
          sentAt: new Date(),
          message: 'Already completed, no reminder needed',
        });
        return;
      }

      await this._sendReminderMessage(user, habit, today);

    } catch (error) {
      console.error(`[ReminderService] Error processing habit "${habit.name}":`, error.message);
    }
  }

  async _sendReminderMessage(user, habit, today) {
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
        date: today,
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
        date: today,
        reminderSent: false,
        status: 'failed',
        error: error.message,
      });
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
        3:   '🎉 3-day streak! You\'re building momentum!',
        7:   '🔥 One full week! You\'re unstoppable!',
        21:  '🏆 21 days! You\'ve officially formed a habit!',
        30:  '👑 30 days! Absolutely extraordinary!',
        100: '💯 100 DAYS! You are a habit LEGEND!',
      };

      if (!milestones[streak]) return;

      const message =
        `${milestones[streak]}\n\n` +
        `Habit: *${habit.name}*\n` +
        `Streak: *${streak} days* 🔥`;

      await whatsappClient.sendMessage(user.whatsappNumber, message);
      console.log(`[ReminderService] Milestone (${streak} days) sent to ${user.whatsappNumber}`);
    } catch (error) {
      console.error(`[ReminderService] Failed to send milestone:`, error.message);
    }
  }
}

export default new HabitReminderService();