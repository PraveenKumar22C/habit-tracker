import express from 'express';
import whatsappClient from '../services/whatsappClient.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch {
    return res.status(403).json({ error: 'Admin access required' });
  }
};

// Public — connected boolean (used by frontend badge)
router.get('/status', (req, res) => {
  res.json({ connected: whatsappClient.isConnected() });
});

// GET /api/whatsapp/qr  (admin only)
router.get('/qr', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (whatsappClient.isConnected()) {
      return res.json({ connected: true, qrCode: null });
    }

    const dataUri   = whatsappClient.getQRCodeDataUri();
    const expiresIn = whatsappClient.getQRExpiresIn();

    if (!dataUri) {
      return res.json({
        connected: false,
        qrCode: null,
        expiresIn: 0,
        message: 'QR not ready yet — generating, retry in a few seconds',
      });
    }

    return res.json({ connected: false, qrCode: dataUri, expiresIn });
  } catch (error) {
    console.error('[WhatsApp Route] Error:', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

// Admin — send a test message to self
router.post('/test-message', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user.whatsappNumber) return res.status(400).json({ error: 'WhatsApp number not set in your profile' });
    if (!whatsappClient.isConnected()) return res.status(503).json({ error: 'WhatsApp client is not connected' });
    const message = `Hello! This is a test message from Habit Tracker. WhatsApp notifications are working correctly! ✅`;
    await whatsappClient.sendMessage(user.whatsappNumber, message);
    res.json({ success: true, message: 'Test message sent', number: user.whatsappNumber });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to send test message' });
  }
});

// Admin — send a custom message to any number
router.post('/send-custom', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).json({ error: 'number and message are required' });
    if (!whatsappClient.isConnected()) return res.status(503).json({ error: 'WhatsApp client is not connected' });
    await whatsappClient.sendMessage(number, message);
    res.json({ success: true, number });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

export default router;