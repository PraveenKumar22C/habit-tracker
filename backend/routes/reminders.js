import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import Reminder from "../models/Reminder.js";
import reminderScheduler from "../services/reminderScheduler.js";

const router = express.Router();

// Get all reminders for user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.userId })
      .populate("habit", "name color")
      .sort({ reminderTime: 1 });

    res.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

// Get reminders for specific habit
router.get("/habit/:habitId", authMiddleware, async (req, res) => {
  try {
    const reminders = await Reminder.find({
      user: req.userId,
      habit: req.params.habitId,
    }).sort({ reminderTime: 1 });

    res.json(reminders);
  } catch (error) {
    console.error("Error fetching habit reminders:", error);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

// Create reminder
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { habitId, reminderTime, frequency, enabled } = req.body;

    if (!habitId || !reminderTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const reminder = new Reminder({
      user: req.userId,
      habit: habitId,
      reminderTime,
      frequency: frequency || "daily",
      enabled: enabled !== false,
    });

    await reminder.save();
    await reminder.populate("habit", "name color");

    res.status(201).json(reminder);
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

// Update reminder
router.put("/:reminderId", authMiddleware, async (req, res) => {
  try {
    const { reminderTime, frequency, enabled } = req.body;

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.reminderId, user: req.userId },
      {
        ...(reminderTime && { reminderTime }),
        ...(frequency && { frequency }),
        ...(enabled !== undefined && { enabled }),
        updatedAt: new Date(),
      },
      { new: true },
    ).populate("habit", "name color");

    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.json(reminder);
  } catch (error) {
    console.error("Error updating reminder:", error);
    res.status(500).json({ error: "Failed to update reminder" });
  }
});

// Delete reminder
router.delete("/:reminderId", authMiddleware, async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.reminderId,
      user: req.userId,
    });

    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.json({ message: "Reminder deleted" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

export default router;
