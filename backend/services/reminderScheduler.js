import cron from "node-cron";
import habitReminderService from "./habitReminderService.js";
import whatsappClient from "./whatsappClient.js";
class ReminderScheduler {
  constructor() {
    this.regularJob = null;
    this.missedJob = null;
    this.weeklyJob = null;
    this._running = false;
  }

  async start() {
    console.log("[ReminderScheduler] Starting…");
    await whatsappClient.initialize();

    this.regularJob = cron.schedule("*/5 * * * *", async () => {
      try {
        await habitReminderService.checkAndSendReminders({
          returnStats: false,
          ignoreWindow: false,
          missedMode: false,
        });
      } catch (err) {
        console.error("[ReminderScheduler] Regular check error:", err);
      }
    });

    this.missedJob = cron.schedule("30 0,6,12,18 * * *", async () => {
      const istHour =
        ((new Date().getUTCHours() + 5) % 24) +
        Math.floor(new Date().getUTCMinutes() >= 30 ? 0.5 : 0);
      console.log(
        `[ReminderScheduler] ⏰ 6h missed-habit check running (≈${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})`,
      );
      try {
        const result = await habitReminderService.checkAndSendReminders({
          returnStats: true,
          ignoreWindow: true,
          missedMode: true,
        });
        console.log(
          `[ReminderScheduler] Missed-habit check complete — ` +
            `WA sent:${result?.whatsappSent} | Email sent:${result?.emailSent} | ` +
            `skipped:${result?.whatsappSkipped} | sessionExpired:${result?.sessionExpired} | ` +
            `notJoined:${result?.notJoined} | failed:${result?.whatsappFailed}`,
        );
      } catch (err) {
        console.error("[ReminderScheduler] Missed-habit check error:", err);
      }
    });

    this.weeklyJob = cron.schedule("30 15 * * 0", async () => {
      console.log("[ReminderScheduler] 📊 Weekly reports starting…");
      try {
        await habitReminderService.sendWeeklyReports();
      } catch (err) {
        console.error("[ReminderScheduler] Weekly error:", err);
      }
    });

    this._running = true;
    console.log("[ReminderScheduler] ✅ Jobs started:");
    console.log(
      "   Job 1  On-time check   : every 5 min (within 60-min window of habit.reminder.time)",
    );
    console.log(
      "   Job 2  Missed check     : every 6h IST (00:00 / 06:00 / 12:00 / 18:00)",
    );
    console.log("   Job 3  Weekly reports   : Sunday 9 PM IST");
  }

  stop() {
    this.regularJob?.stop();
    this.missedJob?.stop();
    this.weeklyJob?.stop();
    this._running = false;
    console.log("[ReminderScheduler] Stopped.");
  }

  getStatus() {
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const checkpoints = [0, 6, 12, 18];
    let nextUTCHour = checkpoints.find(
      (h) => h > utcH || (h === utcH && utcM < 30),
    );
    if (nextUTCHour === undefined) nextUTCHour = 0;

    const next = new Date();
    next.setUTCHours(nextUTCHour, 30, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

    return {
      whatsappConnected: whatsappClient.isConnected(),
      running: this._running,
      nextMissedCheck: next.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    };
  }
}

export default new ReminderScheduler();
