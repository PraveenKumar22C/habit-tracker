import express from 'express';
import HabitLog from '../models/HabitLog.js';
import Habit from '../models/Habit.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get daily analytics
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const logs = await HabitLog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    }).populate('habitId');
    
    const habitMap = {};
    
    logs.forEach(log => {
      const dateKey = log.date.toISOString().split('T')[0];
      if (!habitMap[dateKey]) {
        habitMap[dateKey] = {
          date: dateKey,
          completed: 0,
          total: 0,
          habits: [],
        };
      }
      habitMap[dateKey].total++;
      if (log.completed) habitMap[dateKey].completed++;
      habitMap[dateKey].habits.push({
        habitId: log.habitId._id,
        habitName: log.habitId.name,
        completed: log.completed,
      });
    });
    
    const data = Object.values(habitMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
});

// Get weekly analytics
router.get('/weekly', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const logs = await HabitLog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    });
    
    const weekMap = {};
    
    logs.forEach(log => {
      const date = new Date(log.date);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          week: weekKey,
          completed: 0,
          total: 0,
          rate: 0,
        };
      }
      weekMap[weekKey].total++;
      if (log.completed) weekMap[weekKey].completed++;
    });
    
    Object.values(weekMap).forEach(week => {
      week.rate = week.total > 0 ? Math.round((week.completed / week.total) * 100) : 0;
    });
    
    const data = Object.values(weekMap).sort((a, b) => new Date(a.week) - new Date(b.week));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly analytics' });
  }
});

// Get heatmap data
router.get('/heatmap', authMiddleware, async (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = parseInt(year) || new Date().getFullYear();
    
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum, 11, 31);
    
    const logs = await HabitLog.find({
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate },
      completed: true,
    });
    
    const heatmapData = {};
    logs.forEach(log => {
      const dateKey = log.date.toISOString().split('T')[0];
      heatmapData[dateKey] = (heatmapData[dateKey] || 0) + 1;
    });
    
    res.json(heatmapData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// Get overview stats
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.userId, isActive: true });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const recentLogs = await HabitLog.find({
      userId: req.userId,
      date: { $gte: thirtyDaysAgo },
    });
    
    const completedLogs = recentLogs.filter(log => log.completed).length;
    const completionRate = recentLogs.length > 0 ? Math.round((completedLogs / recentLogs.length) * 100) : 0;
    
    const milestones = recentLogs.filter(log => log.milestone.reached).length;
    
    res.json({
      totalHabits: habits.length,
      completionRate,
      recentCompletions: completedLogs,
      milestoneReached: milestones,
      averageDaily: habits.length > 0 ? Math.round(completedLogs / 30) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

export default router;
