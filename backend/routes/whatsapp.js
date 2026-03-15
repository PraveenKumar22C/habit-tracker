import express from 'express';
import whatsappClient from '../services/whatsappClient.js';
import habitReminderService from '../services/habitReminderService.js';
import reminderScheduler from '../services/reminderScheduler.js';
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

// ─── GET /api/whatsapp/status ─────────────────────────────────────────────────
// Public — used by WhatsAppQRDisplay status banner
router.get('/status', (req, res) => {
  const s = reminderScheduler.getStatus();
  res.json({
    connected: whatsappClient.isConnected(),
    scheduler: {
      running:      s.running ?? false,
      nextMidnight: s.nextMidnight ?? null,
    },
  });
});

// ─── GET /api/whatsapp/sandbox-status ────────────────────────────────────────
// Admin — returns per-user sandbox session info for admin dashboard
router.get('/sandbox-status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await habitReminderService.getSandboxStatus();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/webhook ───────────────────────────────────────────────
// Twilio calls this when a user MESSAGES the sandbox number.
// This is how we know:
//   1. A new user has joined (body starts with "join <code>")
//   2. An existing user has refreshed their 24h session
//
// Configure this URL in Twilio Console:
//   Messaging → Try WhatsApp → Sandbox → "WHEN A MESSAGE COMES IN"
//   → set to: https://your-backend.onrender.com/api/whatsapp/webhook
//
// NO auth middleware — Twilio sends this as an unauthenticated POST
router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const from = req.body?.From || '';   // "whatsapp:+919440667351"
    const body = req.body?.Body || '';   // message text

    console.log(`[Webhook] Inbound WhatsApp from ${from}: "${body}"`);

    await habitReminderService.handleInboundMessage(from, body);

    // Twilio expects a 200 response (optionally with TwiML)
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (err) {
    console.error('[Webhook] Error:', err);
    res.status(500).send('<Response></Response>');
  }
});

// ─── POST /api/whatsapp/trigger-reminders ─────────────────────────────────────
// Admin — manually runs the same logic as the midnight blast.
// Same batching: 5 users → 2s → 5 → ...
// Same session check: skips expired/not-joined users.
router.post('/trigger-reminders', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (!whatsappClient.isConnected()) {
      return res.status(503).json({
        error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.',
      });
    }

    const result = await habitReminderService.checkAndSendReminders({
      returnStats:  true,
      ignoreWindow: true,
    });

    res.json({
      success:       true,
      sent:          result?.sent          ?? 0,
      skipped:       result?.skipped       ?? 0,
      sessionExpired: result?.sessionExpired ?? 0,
      notJoined:     result?.notJoined     ?? 0,
      failed:        result?.failed        ?? 0,
      batches:       result?.batches       ?? 0,
      message:
        `Done. Sent: ${result?.sent ?? 0}, Skipped: ${result?.skipped ?? 0}, ` +
        `Session expired: ${result?.sessionExpired ?? 0}, Not joined: ${result?.notJoined ?? 0}, ` +
        `Failed: ${result?.failed ?? 0} (${result?.batches ?? 0} batches of 5)`,
    });
  } catch (err) {
    console.error('[WhatsApp route] trigger-reminders error:', err);
    res.status(500).json({ error: err.message || 'Failed to trigger reminders' });
  }
});

// ─── POST /api/whatsapp/test-message ─────────────────────────────────────────
// Admin — sends a test message to the admin's own WhatsApp number
router.post('/test-message', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.whatsappNumber) {
      return res.status(400).json({
        error: 'No WhatsApp number on your profile. Add it under Settings → WhatsApp.',
      });
    }
    if (!whatsappClient.isConnected()) {
      return res.status(503).json({
        error: 'Twilio not configured.',
      });
    }
    const msg = '👋 Hello! This is a test message from Habit Tracker. Twilio WhatsApp is working!';
    await whatsappClient.sendMessage(user.whatsappNumber, msg);
    res.json({ success: true, message: 'Test message sent', number: user.whatsappNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-custom ──────────────────────────────────────────
// Admin — send a custom message to any number
router.post('/send-custom', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ error: '"number" and "message" are required.' });
    }
    await whatsappClient.sendMessage(number, message);
    res.json({ success: true, number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;