import cron from 'node-cron';
import habitReminderService from './habitReminderService.js';
import whatsappClient from './whatsappClient.js';

class ReminderScheduler {
  constructor() {
    this.reminderJob = null;
    this.weeklyReportJob = null;
  }

  async start() {
    try {
      console.log('[ReminderScheduler] Starting scheduler...');

      try {
        await whatsappClient.initialize();
      } catch (error) {
        console.warn('[ReminderScheduler] WhatsApp client initialization failed:', error.message);
        console.log('[ReminderScheduler] Bot will continue to work when WhatsApp connects');
      }

      this.reminderJob = cron.schedule('*/5 * * * *', async () => {
        console.log('[ReminderScheduler] 5-min reminder check running...');
        try {
          await habitReminderService.checkAndSendReminders();
        } catch (error) {
          console.error('[ReminderScheduler] Error in reminder check:', error);
        }
      });

      this.weeklyReportJob = cron.schedule('30 15 * * 0', async () => {
        console.log('[ReminderScheduler] Running weekly reports...');
        try {
          await habitReminderService.sendWeeklyReports();
        } catch (error) {
          console.error('[ReminderScheduler] Error in weekly report:', error);
        }
      });

      console.log('[ReminderScheduler] ✅ Scheduler started');
      console.log('[ReminderScheduler]    Reminder check : every 5 minutes');
      console.log('[ReminderScheduler]    Send window    : 60 minutes after scheduled time');
      console.log('[ReminderScheduler]    Weekly reports : Sunday 9 PM IST (15:30 UTC)');
    } catch (error) {
      console.error('[ReminderScheduler] Failed to start scheduler:', error);
      throw error;
    }
  }

  stop() {
    try {
      if (this.reminderJob) {
        this.reminderJob.stop();
        console.log('[ReminderScheduler] Reminder job stopped');
      }
      if (this.weeklyReportJob) {
        this.weeklyReportJob.stop();
        console.log('[ReminderScheduler] Weekly report job stopped');
      }
      whatsappClient.close();
      console.log('[ReminderScheduler] Scheduler stopped');
    } catch (error) {
      console.error('[ReminderScheduler] Error stopping scheduler:', error);
    }
  }

  getStatus() {
    return {
      reminderJobActive: this.reminderJob && !this.reminderJob._destroyed,
      weeklyReportJobActive: this.weeklyReportJob && !this.weeklyReportJob._destroyed,
      whatsappConnected: whatsappClient.isConnected(),
      qrCode: whatsappClient.getQRCode(),
    };
  }
}

export default new ReminderScheduler();