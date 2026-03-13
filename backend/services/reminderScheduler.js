import cron from 'node-cron';
import habitReminderService from './habitReminderService.js';
import whatsappClient from './whatsappClient.js';

class ReminderScheduler {
  constructor() {
    this.reminderJob = null;
    this.weeklyReportJob = null;
  }

  async start() {
    console.log('[ReminderScheduler] Starting scheduler...');

    whatsappClient.initialize().catch(err => {
      console.warn('[ReminderScheduler] WhatsApp init error (will retry):', err.message);
    });

    this.reminderJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await habitReminderService.checkAndSendReminders();
      } catch (err) {
        console.error('[ReminderScheduler] Reminder check error:', err);
      }
    });

    this.weeklyReportJob = cron.schedule('30 15 * * 0', async () => {
      console.log('[ReminderScheduler] Running weekly reports...');
      try {
        await habitReminderService.sendWeeklyReports();
      } catch (err) {
        console.error('[ReminderScheduler] Weekly report error:', err);
      }
    });

    console.log('[ReminderScheduler] Started:');
    console.log('   Reminder check : every 5 minutes');
    console.log('   Send window    : 60 minutes after scheduled time');
    console.log('   Weekly reports : Sunday 9 PM IST');
  }

  stop() {
    if (this.reminderJob)     { this.reminderJob.stop();     }
    if (this.weeklyReportJob) { this.weeklyReportJob.stop(); }
    whatsappClient.close();
    console.log('[ReminderScheduler] Stopped.');
  }

  getStatus() {
    return {
      whatsappConnected: whatsappClient.isConnected(),
      qrAvailable: !!whatsappClient.getQRCodeDataUri(),
    };
  }
}

export default new ReminderScheduler();