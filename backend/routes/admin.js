// routes/admin.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import User from "../models/User.js";
import Habit from "../models/Habit.js";
import habitReminderService from "../services/habitReminderService.js";

const router = express.Router();

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch {
    return res.status(403).json({ error: "Admin access required" });
  }
};

// GET /api/admin/users-summary
// Lightweight list for dropdown
router.get("/users-summary", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select("_id name email whatsappNumber")
      .sort({ name: 1 })
      .lean();
    res.json(users);
  } catch (err) {
    console.error("[admin/users-summary] Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/users/:userId/habits
// Get active habits with reminders enabled for selected user
router.get("/users/:userId/habits", authMiddleware, adminOnly, async (req, res) => {
  try {
    const habits = await Habit.find({
      userId: req.params.userId,
      isActive: true,
      "reminder.enabled": true,
    })
      .select("name description reminder.time reminder.enabled isActive")
      .lean();

    res.json(habits);
  } catch (err) {
    console.error("[admin/users/:userId/habits] Error:", err);
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

// POST /api/admin/reminders/manual-trigger
// Body: { userId, habitIds: string[], type: "normal"|"missed", force: true }
router.post("/reminders/manual-trigger", authMiddleware, adminOnly, async (req, res) => {
  const { userId, habitIds = [], type = "normal", force = true } = req.body;

  if (!userId || !Array.isArray(habitIds) || habitIds.length === 0) {
    return res.status(400).json({ error: "userId and habitIds array are required" });
  }

  if (!["normal", "missed"].includes(type)) {
    return res.status(400).json({ error: "type must be 'normal' or 'missed'" });
  }

  try {
    const stats = await habitReminderService.sendManualReminders({
      userId,
      habitIds,
      isMissedStyle: type === "missed",
      forceBypassWindow: force,
    });

    res.json({
      success: true,
      whatsappSent: stats.whatsappSent || 0,
      emailSent: stats.emailSent || 0,
      skipped: stats.skipped || 0,
      failed: stats.failed || 0,
      message: `Manual reminder${habitIds.length > 1 ? "s" : ""} processed.`,
    });
  } catch (err) {
    console.error("[manual-trigger] Error:", err);
    res.status(500).json({ error: err.message || "Failed to send manual reminders" });
  }
});

export default router;