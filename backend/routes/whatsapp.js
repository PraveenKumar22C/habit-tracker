import express from 'express';
import whatsappClient from '../services/whatsappClient.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch {
    return res.status(403).json({ error: 'Admin access required' });
  }
};

// Public — used by health check
router.get('/status', (req, res) => {
  res.json({ connected: whatsappClient.isConnected() });
});

// Admin — send a test message to your own number
router.post('/test-message', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.whatsappNumber) {
      return res.status(400).json({ error: 'WhatsApp number not set in your profile' });
    }
    if (!whatsappClient.isConnected()) {
      return res.status(503).json({ error: 'Twilio credentials not configured' });
    }
    const message = '👋 Hello! This is a test message from Habit Tracker. Twilio WhatsApp is working!';
    await whatsappClient.sendMessage(user.whatsappNumber, message);
    res.json({ success: true, message: 'Test message sent', number: user.whatsappNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin — send custom message
router.post('/send-custom', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ error: 'number and message are required' });
    }
    await whatsappClient.sendMessage(number, message);
    res.json({ success: true, number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;