import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import ReminderLog from "../models/ReminderLog.js";
import User from "../models/User.js";
import whatsappClient from "./whatsappClient.js";
import { sendReminderEmail, emailEnabled } from "./emailReminderService.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const SEND_WINDOW_MINUTES = 60;
const MISSED_THRESHOLD_H = 6;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;
const SESSION_TTL_MS = 71 * 60 * 60 * 1000;

const SANDBOX_ERROR_CODES = [63016, 63018, 21608];
const SANDBOX_ERROR_TEXTS = [
  "not currently opted in",
  "session expired",
  "not joined",
  "outside allowed window",
  "user did not send",
];

function getISTNow() {
  const nowUTC = new Date();
  const istMs = nowUTC.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  const istMidnightUTC = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) -
      IST_OFFSET_MS,
  );
  return {
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
    todayIST: istMidnightUTC,
    tomorrowIST: new Date(istMidnightUTC.getTime() + 24 * 60 * 60 * 1000),
    dateKey: `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(ist.getUTCDate()).padStart(2, "0")}`,
  };
}

function timeToMinutes(t) {
  const [h, m] = (t || "09:00").split(":").map(Number);
  return h * 60 + m;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isSandboxSessionError(err) {
  const code = Number(err?.code || err?.status || 0);
  const msg = (err?.message || "").toLowerCase();
  return (
    SANDBOX_ERROR_CODES.includes(code) ||
    SANDBOX_ERROR_TEXTS.some((t) => msg.includes(t))
  );
}

function hasActiveSandboxSession(user) {
  const s = user.whatsappSandbox;
  if (!s?.joined || !s?.lastMessageAt) return false;
  return Date.now() - new Date(s.lastMessageAt).getTime() < SESSION_TTL_MS;
}

class HabitReminderService {
  async checkAndSendReminders({
    returnStats = false,
    ignoreWindow = false,
    missedMode = false,
  } = {}) {
    const stats = {
      whatsappSent: 0,
      whatsappSkipped: 0,
      whatsappFailed: 0,
      sessionExpired: 0,
      notJoined: 0,
      emailSent: 0,
      emailSkipped: 0,
      emailFailed: 0,
      batches: 0,
    };

    try {
      const { hours, minutes, todayIST, tomorrowIST, dateKey } = getISTNow();
      const nowMinutes = hours * 60 + minutes;

      console.log(
        `[ReminderService] ▶ Start | IST ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} | ` +
          `date: ${dateKey} | ignoreWindow: ${ignoreWindow} | missedMode: ${missedMode}`,
      );

      const allUsers = await User.find({}).lean();
      const eligibleUsers = [];

      for (const u of allUsers) {
        const hasHabits = await Habit.exists({
          userId: u._id,
          isActive: true,
          "reminder.enabled": true,
        });
        if (hasHabits) eligibleUsers.push(u);
      }

      if (!eligibleUsers.length) {
        console.log("[ReminderService] No users with reminder-enabled habits.");
        return returnStats ? stats : undefined;
      }

      console.log(
        `[ReminderService] ${eligibleUsers.length} eligible user(s) → batches of ${BATCH_SIZE}`,
      );

      const batches = chunkArray(eligibleUsers, BATCH_SIZE);

      for (let bi = 0; bi < batches.length; bi++) {
        stats.batches++;
        console.log(
          `[ReminderService] 📦 Batch ${bi + 1}/${batches.length} — ${batches[bi].length} user(s)`,
        );

        const results = await Promise.allSettled(
          batches[bi].map((user) =>
            this._processUser(
              user,
              nowMinutes,
              todayIST,
              tomorrowIST,
              ignoreWindow,
              missedMode,
            ),
          ),
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            stats.whatsappSent += r.value.whatsappSent;
            stats.whatsappSkipped += r.value.whatsappSkipped;
            stats.whatsappFailed += r.value.whatsappFailed;
            stats.sessionExpired += r.value.sessionExpired;
            stats.notJoined += r.value.notJoined;
            stats.emailSent += r.value.emailSent;
            stats.emailSkipped += r.value.emailSkipped;
            stats.emailFailed += r.value.emailFailed;
          } else {
            stats.whatsappFailed++;
            console.error(
              "[ReminderService] Batch promise rejected:",
              r.reason,
            );
          }
        }

        console.log(
          `[ReminderService] Batch ${bi + 1} done — ` +
            `WA sent:${stats.whatsappSent} expired:${stats.sessionExpired} notJoined:${stats.notJoined} | ` +
            `Email sent:${stats.emailSent} skipped:${stats.emailSkipped} failed:${stats.emailFailed}`,
        );

        if (bi < batches.length - 1) {
          console.log(`[ReminderService] ⏳ ${BATCH_DELAY_MS}ms pause…`);
          await sleep(BATCH_DELAY_MS);
        }
      }

      console.log(
        `[ReminderService] 🏁 Complete — ` +
          `WA: sent=${stats.whatsappSent} expired=${stats.sessionExpired} notJoined=${stats.notJoined} failed=${stats.whatsappFailed} | ` +
          `Email: sent=${stats.emailSent} skipped=${stats.emailSkipped} failed=${stats.emailFailed}`,
      );
    } catch (err) {
      console.error("[ReminderService] Fatal error:", err);
    }

    return returnStats ? stats : undefined;
  }

  async _processUser(
    user,
    nowMinutes,
    todayIST,
    tomorrowIST,
    ignoreWindow,
    missedMode,
  ) {
    const result = {
      whatsappSent: 0,
      whatsappSkipped: 0,
      whatsappFailed: 0,
      sessionExpired: 0,
      notJoined: 0,
      emailSent: 0,
      emailSkipped: 0,
      emailFailed: 0,
    };

    const habits = await Habit.find({
      userId: user._id,
      isActive: true,
      "reminder.enabled": true,
    }).lean();

    if (!habits.length) return result;

    const pendingHabits = [];
    for (const habit of habits) {
      const eligible = await this._isHabitPending(
        habit,
        user,
        nowMinutes,
        todayIST,
        tomorrowIST,
        ignoreWindow,
        missedMode,
      );
      if (eligible) pendingHabits.push(habit);
    }

    if (!pendingHabits.length) {
      result.whatsappSkipped = habits.length;
      return result;
    }

    const waOk =
      whatsappClient.isConnected() &&
      user.whatsappNumber &&
      hasActiveSandboxSession(user);

    if (waOk) {
      for (const habit of pendingHabits) {
        try {
          const outcome = await this._sendWhatsAppReminder(
            user,
            habit,
            todayIST,
            missedMode,
          );
          if (outcome === "sent") result.whatsappSent++;
          else if (outcome === "session") {
            result.sessionExpired++;
            break;
          }
        } catch {
          result.whatsappFailed++;
        }
      }
    } else {
      if (user.whatsappNumber) {
        if (!user.whatsappSandbox?.joined) {
          result.notJoined++;
          await User.findByIdAndUpdate(user._id, {
            "whatsappSandbox.sessionActive": false,
            "whatsappSandbox.failReason":
              "Number has not joined the Twilio sandbox. Falling back to email.",
          });
        } else {
          result.sessionExpired++;
          await User.findByIdAndUpdate(user._id, {
            "whatsappSandbox.sessionActive": false,
            "whatsappSandbox.failReason":
              "Sandbox session expired (>23h). Falling back to email.",
          });
        }
      }

      const emailOutcome = await this._sendEmailFallback(
        user,
        pendingHabits,
        todayIST,
        missedMode,
      );
      if (emailOutcome === "sent") result.emailSent++;
      else if (emailOutcome === "skipped") result.emailSkipped++;
      else result.emailFailed++;
    }

    return result;
  }

  async _isHabitPending(
    habit,
    user,
    nowMinutes,
    todayIST,
    tomorrowIST,
    ignoreWindow,
    missedMode,
  ) {
    const scheduledMinutes = timeToMinutes(habit.reminder?.time);
    const elapsed = nowMinutes - scheduledMinutes;

    if (missedMode) {
      if (elapsed < MISSED_THRESHOLD_H * 60) return false;
    } else {
      if (!ignoreWindow) {
        if (elapsed < 0 || elapsed > SEND_WINDOW_MINUTES) return false;
      }
    }

    const alreadySent = await ReminderLog.findOne({
      habitId: habit._id,
      userId: user._id,
      date: todayIST,
      status: "sent",
    });
    if (alreadySent) return false;

    const done = await HabitLog.findOne({
      habitId: habit._id,
      userId: user._id,
      date: { $gte: todayIST, $lt: tomorrowIST },
      completed: true,
    });
    return !done;
  }

  async _sendWhatsAppReminder(user, habit, todayIST, missedMode = false) {
    const message = missedMode
      ? `⏰ *Missed Habit Reminder*\n\nYou haven't checked in for: *${habit.name}*\n` +
        (habit.description ? `_${habit.description}_\n\n` : "\n") +
        `It's not too late — check in now and keep your streak alive! 🔥`
      : `🔔 *Habit Reminder*\n\nDon't forget: *${habit.name}*\n` +
        (habit.description ? `_${habit.description}_\n\n` : "\n") +
        `Stay consistent — every day counts! 💪`;

    try {
      await whatsappClient.sendMessage(user.whatsappNumber, message);
      await ReminderLog.create({
        habitId: habit._id,
        userId: user._id,
        date: todayIST,
        reminderSent: true,
        status: "sent",
        reminderType: missedMode ? "evening" : "morning",
        sentAt: new Date(),
        message,
      });
      await User.findByIdAndUpdate(user._id, {
        "whatsappSandbox.sessionActive": true,
        "whatsappSandbox.failReason": null,
      });
      console.log(
        `[ReminderService] 📲 WA → ${user.whatsappNumber} "${habit.name}" ${missedMode ? "[MISSED]" : "[ON-TIME]"}`,
      );
      return "sent";
    } catch (err) {
      if (isSandboxSessionError(err)) {
        await User.findByIdAndUpdate(user._id, {
          "whatsappSandbox.sessionActive": false,
          "whatsappSandbox.failReason": `Session error: ${err.message}`,
        });
        await ReminderLog.create({
          habitId: habit._id,
          userId: user._id,
          date: todayIST,
          reminderSent: false,
          status: "failed",
          sentAt: new Date(),
          message,
          error: err.message,
        });
        console.warn(
          `[ReminderService] 🔒 Session error ${user.whatsappNumber}: ${err.message}`,
        );
        return "session";
      }
      console.error(
        `[ReminderService] ❌ WA failed ${user.whatsappNumber}: ${err.message}`,
      );
      throw err;
    }
  }

  async _sendEmailFallback(user, pendingHabits, todayIST, missedMode = false) {
    if (!emailEnabled()) {
      console.log(
        `[ReminderService] 📧 Email not configured — skipping for ${user.email || user._id}`,
      );
      return "skipped";
    }
    if (!user.email) return "skipped";

    const habitList = pendingHabits.map((h) => ({
      name: h.name,
      description: h.description || "",
    }));
    const outcome = await sendReminderEmail(user, habitList, missedMode);

    if (outcome === "sent") {
      await Promise.allSettled(
        pendingHabits.map((habit) =>
          ReminderLog.create({
            habitId: habit._id,
            userId: user._id,
            date: todayIST,
            reminderSent: true,
            status: "sent",
            reminderType: missedMode ? "evening" : "morning",
            sentAt: new Date(),
            message: `[email ${missedMode ? "missed" : "on-time"}] ${habit.name}`,
          }),
        ),
      );
      console.log(
        `[ReminderService] 📧 Email ${missedMode ? "[MISSED]" : "[ON-TIME]"} → ${user.email} (${pendingHabits.length} habits)`,
      );
    }
    return outcome;
  }

  async sendWeeklyReports() {
    try {
      const allUsers = await User.find({
        "preferences.reminderType": { $in: ["weekly", "both"] },
      }).lean();
      if (!allUsers.length) {
        console.log("[ReminderService] No users for weekly reports.");
        return;
      }

      console.log(
        `[ReminderService] Weekly — ${allUsers.length} user(s), batches of ${BATCH_SIZE}`,
      );
      const batches = chunkArray(allUsers, BATCH_SIZE);
      for (let i = 0; i < batches.length; i++) {
        await Promise.allSettled(
          batches[i].map((u) => this._sendWeeklyReport(u)),
        );
        if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
      }
      console.log("[ReminderService] 🏁 Weekly complete.");
    } catch (err) {
      console.error("[ReminderService] Weekly error:", err);
    }
  }

  async _sendWeeklyReport(user) {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const habits = await Habit.find({
        userId: user._id,
        isActive: true,
      }).lean();
      let completedCount = 0;
      const habitLines = [];
      for (const habit of habits) {
        const logs = await HabitLog.find({
          habitId: habit._id,
          userId: user._id,
          date: { $gte: weekStart },
          completed: true,
        });
        if (logs.length > 0) completedCount++;
        habitLines.push(`• ${habit.name}: ${logs.length}/7 days`);
      }
      const score =
        habits.length > 0
          ? Math.round((completedCount / habits.length) * 100)
          : 0;
      const message = `📊 *Weekly Habit Report*\n\n${habitLines.join("\n")}\n\n✅ Consistency Score: *${score}%*\nKeep building those habits! 🚀`;

      const waOk =
        whatsappClient.isConnected() &&
        user.whatsappNumber &&
        hasActiveSandboxSession(user);
      if (waOk) {
        await whatsappClient.sendMessage(user.whatsappNumber, message);
        console.log(`[ReminderService] 📲 Weekly WA → ${user.whatsappNumber}`);
      } else if (emailEnabled() && user.email) {
        const { sendReminderEmail: sendEmail } =
          await import("./emailReminderService.js");
        await sendEmail(
          user,
          habits.map((h, i) => ({ name: h.name, description: habitLines[i] })),
          false,
        );
        console.log(`[ReminderService] 📧 Weekly email → ${user.email}`);
      }
    } catch (err) {
      console.error(
        `[ReminderService] Weekly failed for ${user._id}:`,
        err.message,
      );
    }
  }

  async sendMilestoneMessage(user, habit, streak) {
    try {
      const milestones = {
        3: "🎉 3-day streak! You're building momentum!",
        7: "🔥 One full week! You're unstoppable!",
        21: "🏆 21 days! You've officially formed a habit!",
        30: "👑 30 days! Absolutely extraordinary!",
        100: "💯 100 DAYS! You are a habit LEGEND!",
      };
      if (!milestones[streak]) return;
      const message = `${milestones[streak]}\n\nHabit: *${habit.name}*\nStreak: *${streak} days* 🔥`;
      const waOk =
        whatsappClient.isConnected() &&
        user.whatsappNumber &&
        hasActiveSandboxSession(user);
      if (waOk) {
        await whatsappClient.sendMessage(user.whatsappNumber, message);
        console.log(
          `[ReminderService] 🏅 Milestone (${streak}d) WA → ${user.whatsappNumber}`,
        );
      } else if (emailEnabled() && user.email) {
        const { sendReminderEmail: sendEmail } =
          await import("./emailReminderService.js");
        await sendEmail(
          user,
          [
            {
              name: `${milestones[streak]} — ${habit.name}`,
              description: `${streak}-day streak!`,
            },
          ],
          false,
        );
      }
    } catch (err) {
      console.error("[ReminderService] Milestone failed:", err.message);
    }
  }

  async handleInboundMessage(from, body) {
    try {
      const number = from.replace("whatsapp:", "").replace("+", "").trim();
      const bodyClean = (body || "").trim();
      const isJoinMsg = /^join\s+\S+/i.test(bodyClean);

      console.log(
        `[Webhook] Processing inbound from ${number} | body: "${bodyClean}" | isJoinMsg: ${isJoinMsg}`,
      );

      const update = {
        "whatsappSandbox.joined": true,
        "whatsappSandbox.sessionActive": true,
        "whatsappSandbox.lastMessageAt": new Date(),
        "whatsappSandbox.failReason": null,
      };
      if (isJoinMsg) {
        update["whatsappSandbox.joinedAt"] = new Date();
      }

      const updated = await User.findOneAndUpdate(
        { whatsappNumber: number },
        { $set: update },
        { new: true },
      );

      if (updated) {
        const s = updated.whatsappSandbox;
        console.log(
          `[Webhook] ✅ Session updated for ${number}` +
            ` | joined=${s?.joined} | active=${s?.sessionActive}` +
            ` | lastMessageAt=${s?.lastMessageAt?.toISOString()}` +
            (isJoinMsg ? " | type=JOIN_MESSAGE" : " | type=SESSION_REFRESH"),
        );
      } else {
        console.log(
          `[Webhook] ⚠ Inbound from ${number} — number not found in DB.\n` +
            `  User must go to Settings → WhatsApp and save this number.`,
        );
      }
    } catch (err) {
      console.error("[Webhook] handleInboundMessage error:", err);
    }
  }

  async getSandboxStatus() {
    const users = await User.find({
      whatsappNumber: { $exists: true, $nin: [null, ""] },
    })
      .select("name whatsappNumber whatsappSandbox email")
      .lean();

    return users.map((u) => ({
      name: u.name,
      number: u.whatsappNumber,
      email: u.email,
      joined: u.whatsappSandbox?.joined ?? false,
      sessionActive: u.whatsappSandbox?.sessionActive ?? false,
      lastMessageAt: u.whatsappSandbox?.lastMessageAt ?? null,
      failReason: u.whatsappSandbox?.failReason ?? null,
    }));
  }
  
//  Manually trigger reminders for specific user + specific habits

async sendManualReminders({ userId, habitIds, isMissedStyle = false, forceBypassWindow = true }) {
  const stats = {
    whatsappSent: 0,
    whatsappFailed: 0,
    emailSent: 0,
    emailFailed: 0,
    skipped: 0,
  };

  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error("User not found");
    }

    const habits = await Habit.find({
      _id: { $in: habitIds },
      userId: user._id,
      isActive: true,
      "reminder.enabled": true,
    }).lean();

    if (!habits.length) {
      stats.skipped = habitIds.length;
      return stats;
    }

    const now = new Date();
    const todayIST = new Date(now.getTime() + IST_OFFSET_MS);
    todayIST.setUTCHours(0, 0, 0, 0);

    const waCapable =
      whatsappClient.isConnected() &&
      user.whatsappNumber &&
      hasActiveSandboxSession(user);

    for (const habit of habits) {
      // Skip if already sent today (safety)
      const alreadySent = await ReminderLog.findOne({
        habitId: habit._id,
        userId: user._id,
        date: todayIST,
        status: "sent",
      });

      if (alreadySent && !forceBypassWindow) {
        stats.skipped++;
        continue;
      }

      let outcome;
      if (waCapable) {
        outcome = await this._sendWhatsAppReminder(
          user,
          habit,
          todayIST,
          isMissedStyle
        );
        if (outcome === "sent") stats.whatsappSent++;
        else if (outcome === "session") {
          stats.whatsappFailed++;
          // fallback to email below
        } else {
          stats.whatsappFailed++;
        }
      }

      // Fallback or only email
      if (!waCapable || outcome !== "sent") {
        const emailOutcome = await this._sendEmailFallback(
          user,
          [habit], // single habit
          todayIST,
          isMissedStyle
        );
        if (emailOutcome === "sent") stats.emailSent++;
        else if (emailOutcome === "skipped") stats.skipped++;
        else stats.emailFailed++;
      }
    }

    console.log(
      `[ManualReminder] user:${userId} habits:${habitIds.length} ` +
      `WA:${stats.whatsappSent} Email:${stats.emailSent} skipped:${stats.skipped}`
    );

    return stats;
  } catch (err) {
    console.error("[sendManualReminders] Fatal:", err);
    throw err;
  }
}
}

export default new HabitReminderService();
