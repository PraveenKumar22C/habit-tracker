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

      // Check reminders every 5 minutes
      // Cron expression: */5 * * * * (every 5 minutes)
      this.reminderJob = cron.schedule('*/5 * * * *', async () => {
        console.log('[ReminderScheduler] Running reminder check...');
        try {
          await habitReminderService.checkAndSendReminders();
        } catch (error) {
          console.error('[ReminderScheduler] Error in reminder check:', error);
        }
      });

      // Send weekly reports every Sunday at 9 PM (21:00)
      // Cron expression: 0 21 * * 0 (Sunday at 21:00)
      this.weeklyReportJob = cron.schedule('0 21 * * 0', async () => {
        console.log('[ReminderScheduler] Running weekly report check...');
        try {
          await habitReminderService.sendWeeklyReports();
        } catch (error) {
          console.error('[ReminderScheduler] Error in weekly report:', error);
        }
      });

      console.log('[ReminderScheduler] Scheduler started successfully');
      console.log('[ReminderScheduler] Reminder check: Every 5 minutes');
      console.log('[ReminderScheduler] Weekly reports: Sunday at 9 PM');
    } catch (error) {
      console.error('[ReminderScheduler] Failed to start scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the reminder scheduler
   */
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

      // Close WhatsApp client
      whatsappClient.close();

      console.log('[ReminderScheduler] Scheduler stopped');
    } catch (error) {
      console.error('[ReminderScheduler] Error stopping scheduler:', error);
    }
  }

  /**
   * Get scheduler status
   */
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
