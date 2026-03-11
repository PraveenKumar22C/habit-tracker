import express from 'express';
import QRCode from 'qrcode';
import whatsappClient from '../services/whatsappClient.js';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware: only allow admin users
const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch {
    return res.status(403).json({ error: 'Admin access required' });
  }
};

/**
 * GET /api/whatsapp/status
 * Public — just returns connected boolean (no QR, no admin needed).
 * Frontend uses this to show "WhatsApp active" badge.
 */
router.get('/status', (req, res) => {
  res.json({ connected: whatsappClient.isConnected() });
});

/**
 * GET /api/whatsapp/qr
 * Admin only — returns QR as a base64 PNG data URI so the frontend
 * can display it with a plain <img> tag. No qrcode.react needed.
 */
router.get('/qr', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rawQr = whatsappClient.getQRCode();

    if (whatsappClient.isConnected()) {
      return res.json({ connected: true, qrCode: null });
    }

    if (!rawQr) {
      return res.json({ connected: false, qrCode: null, message: 'QR not ready yet, retry in a few seconds' });
    }

    // Convert the raw WhatsApp QR string → PNG data URI
    const dataUri = await QRCode.toDataURL(rawQr, {
      errorCorrectionLevel: 'M',
      width: 256,
      margin: 2,
    });

    res.json({ connected: false, qrCode: dataUri });
  } catch (error) {
    console.error('Error generating QR image:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

/**
 * POST /api/whatsapp/test-message
 * Admin only — sends a test message to the admin's own WhatsApp number.
 */
router.post('/test-message', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.whatsappNumber) {
      return res.status(400).json({ error: 'WhatsApp number not set in your profile' });
    }
    if (!whatsappClient.isConnected()) {
      return res.status(503).json({ error: 'WhatsApp client is not connected' });
    }

    const message = `Hello! This is a test message from Habit Tracker. WhatsApp notifications are working correctly!`;
    await whatsappClient.sendMessage(user.whatsappNumber, message);

    res.json({ success: true, message: 'Test message sent', number: user.whatsappNumber });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({ error: error.message || 'Failed to send test message' });
  }
});

/**
 * POST /api/whatsapp/send-custom
 * Admin only.
 */
router.post('/send-custom', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ error: 'number and message are required' });
    }
    if (!whatsappClient.isConnected()) {
      return res.status(503).json({ error: 'WhatsApp client is not connected' });
    }

    await whatsappClient.sendMessage(number, message);
    res.json({ success: true, message: 'Message sent', number });
  } catch (error) {
    console.error('Error sending custom message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

export default router;