import express from 'express';
import Habit from '../models/Habit.js';
import HabitLog from '../models/HabitLog.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

function parseToUTCMidnight(dateInput) {
  if (!dateInput) {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istNow = new Date(now.getTime() + IST_OFFSET);
    return new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  const raw = new Date(dateInput);
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(raw.getTime() + IST_OFFSET);
  return new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()));
}

const calculateStreak = async (habitId, userId) => {
  const logs = await HabitLog.find({ habitId, userId, completed: true }).sort({ date: -1 });

  let streak = 0;

  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET);
  const todayUTC = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));

  for (let i = 0; i < logs.length; i++) {
    const logDate = new Date(logs[i].date);
    logDate.setUTCHours(0, 0, 0, 0);

    const expectedDate = new Date(todayUTC);
    expectedDate.setUTCDate(expectedDate.getUTCDate() - i);

    if (logDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// Get all habits for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// Create habit
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, color, frequency, target, reminder } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Habit name is required' });
    }

    const habit = new Habit({
      userId: req.userId,
      name,
      description,
      category,
      color,
      frequency,
      target,
      reminder,
    });

    await habit.save();

    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.totalHabits': 1 },
    });

    res.status(201).json(habit);
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// Get habit by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch habit' });
  }
});

// Update habit
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, category, color, frequency, target, reminder, isActive } = req.body;

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(color && { color }),
        ...(frequency && { frequency }),
        ...(target && { target }),
        ...(reminder && { reminder }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

// Delete habit
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    await HabitLog.deleteMany({ habitId: req.params.id });

    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.totalHabits': -1 },
    });

    res.json({ message: 'Habit deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

// Log habit completion
router.post('/:id/log', authMiddleware, async (req, res) => {
  try {
    const { date, completed, value, notes } = req.body;
    const habitId = req.params.id;

    const habit = await Habit.findOne({ _id: habitId, userId: req.userId });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const logDate = parseToUTCMidnight(date);

    const existingLog = await HabitLog.findOne({ habitId, userId: req.userId, date: logDate });

    if (existingLog && existingLog.completed) {
      const streak = await calculateStreak(habitId, req.userId);
      return res.json({ log: existingLog, milestone: null, alreadyCompleted: true, streak });
    }

    let log = existingLog;
    if (!log) {
      log = new HabitLog({ habitId, userId: req.userId, date: logDate, completed, value: value || 1, notes: notes || '' });
    } else {
      log.completed = completed;
      log.value = value || log.value;
      log.notes = notes || log.notes;
    }
    await log.save();

    const streak = await calculateStreak(habitId, req.userId);

    const milestones = [3, 7, 21, 30, 100];
    let milestoneReached = null;
    if (completed && milestones.includes(streak)) {
      milestoneReached = `${streak}-day`;
      log.milestone = { reached: true, type: milestoneReached };
      await log.save();
    }

    if (completed) {
      // Recalculate completionRate from logs
      const allLogs = await HabitLog.find({ habitId, userId: req.userId });
      const completedCount = allLogs.filter(l => l.completed).length;
      const completionRate = allLogs.length > 0 ? Math.round((completedCount / allLogs.length) * 100) : 0;

      // Update Habit stats (including completionRate)
      const updatedHabit = await Habit.findByIdAndUpdate(habitId, {
        $set: {
          'stats.currentStreak': streak,
          'stats.longestStreak': Math.max(streak, habit.stats?.longestStreak || 0),
          'stats.completionRate': completionRate,
        },
        $inc: { 'stats.totalCompletions': 1 },
      }, { new: true });

      // Sync User.stats — aggregate across all habits
      const allHabits = await Habit.find({ userId: req.userId, isActive: true });
      const userTotalCompletions = allHabits.reduce((sum, h) => {
        const tc = h._id.toString() === habitId
          ? (updatedHabit?.stats?.totalCompletions || 0)
          : (h.stats?.totalCompletions || 0);
        return sum + tc;
      }, 0);

      const userCurrentStreak = Math.max(...allHabits.map(h =>
        h._id.toString() === habitId ? streak : (h.stats?.currentStreak || 0)
      ));
      const userLongestStreak = Math.max(...allHabits.map(h =>
        h._id.toString() === habitId
          ? Math.max(streak, habit.stats?.longestStreak || 0)
          : (h.stats?.longestStreak || 0)
      ));

      await User.findByIdAndUpdate(req.userId, {
        $set: {
          'stats.totalCompletions': userTotalCompletions,
          'stats.currentStreak': userCurrentStreak,
          'stats.longestStreak': userLongestStreak,
          'stats.totalHabits': allHabits.length,
        },
      });
    }

    res.json({ log, milestone: milestoneReached });
  } catch (error) {
    console.error('Log habit error:', error);
    res.status(500).json({ error: 'Failed to log habit', details: error.message });
  }
});

// Get logs for habit
router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {
      habitId: req.params.id,
      userId: req.userId,
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await HabitLog.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get habit statistics
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.userId });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const logs = await HabitLog.find({ habitId: req.params.id, userId: req.userId });

    const completedDays = logs.filter(log => log.completed).length;
    const totalDays = logs.length;
    const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

    const streak = await calculateStreak(req.params.id, req.userId);

    res.json({
      totalCompletions: completedDays,
      completionRate: Math.round(completionRate),
      currentStreak: streak,
      totalDays,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;