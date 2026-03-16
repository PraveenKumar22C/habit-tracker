import express from "express";
import whatsappClient from "../services/whatsappClient.js";
import habitReminderService from "../services/habitReminderService.js";
import reminderScheduler from "../services/reminderScheduler.js";
import { authMiddleware } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.isAdmin)
      return res.status(403).json({ error: "Admin access required" });
    next();
  } catch {
    return res.status(403).json({ error: "Admin access required" });
  }
};

// ─── GET /api/whatsapp/status ─────────────────────────────────────────────────
// Public — scheduler/Twilio connection status
router.get("/status", (req, res) => {
  const s = reminderScheduler.getStatus();
  res.json({
    connected: whatsappClient.isConnected(),
    scheduler: {
      running: s.running ?? false,
      nextMissedCheck: s.nextMissedCheck ?? null,
    },
  });
});

// ─── GET /api/whatsapp/my-status ─────────────────────────────────────────────
// Any logged-in user — their OWN sandbox session status
router.get("/my-status", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("name whatsappNumber whatsappSandbox")
      .lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const s = user.whatsappSandbox || {};
    res.json({
      number: user.whatsappNumber ?? null,
      joined: s.joined ?? false,
      sessionActive: s.sessionActive ?? false,
      lastMessageAt: s.lastMessageAt ?? null,
      failReason: s.failReason ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/whatsapp/sandbox-status ────────────────────────────────────────
// Admin only — ALL users' sandbox session info
router.get("/sandbox-status", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await habitReminderService.getSandboxStatus();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/webhook ───────────────────────────────────────────────
// Twilio calls this when any user messages the sandbox.
// NO auth — unauthenticated POST from Twilio.
router.post(
  "/webhook",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const from = req.body?.From || "";
      const body = req.body?.Body || "";
      console.log(`[Webhook] Inbound WhatsApp from ${from}: "${body}"`);
      await habitReminderService.handleInboundMessage(from, body);
      res.set("Content-Type", "text/xml");
      res.send("<Response></Response>");
    } catch (err) {
      console.error("[Webhook] Error:", err);
      res.status(500).send("<Response></Response>");
    }
  },
);

// ─── POST /api/whatsapp/trigger-reminders ─────────────────────────────────────
// Admin — manually runs the 6-hour missed-habit check
router.post(
  "/trigger-reminders",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      if (!whatsappClient.isConnected()) {
        return res.status(503).json({
          error:
            "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.",
        });
      }
      const result = await habitReminderService.checkAndSendReminders({
        returnStats: true,
        ignoreWindow: true,
        missedMode: true,
      });
      res.json({
        success: true,
        whatsappSent: result?.whatsappSent ?? 0,
        emailSent: result?.emailSent ?? 0,
        whatsappSkipped: result?.whatsappSkipped ?? 0,
        sessionExpired: result?.sessionExpired ?? 0,
        notJoined: result?.notJoined ?? 0,
        failed: result?.whatsappFailed ?? 0,
        batches: result?.batches ?? 0,
        message:
          `Done. WA sent: ${result?.whatsappSent ?? 0}, Email sent: ${result?.emailSent ?? 0}, ` +
          `Skipped: ${result?.whatsappSkipped ?? 0}, Expired: ${result?.sessionExpired ?? 0}, ` +
          `Not joined: ${result?.notJoined ?? 0} (${result?.batches ?? 0} batches of 5)`,
      });
    } catch (err) {
      console.error("[WhatsApp route] trigger-reminders error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to trigger reminders" });
    }
  },
);

// ─── POST /api/whatsapp/test-message ─────────────────────────────────────────
// Admin — test message to admin's own number
router.post("/test-message", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.whatsappNumber) {
      return res.status(400).json({
        error:
          "No WhatsApp number on your profile. Add it under Settings → WhatsApp.",
      });
    }
    if (!whatsappClient.isConnected()) {
      return res.status(503).json({ error: "Twilio not configured." });
    }
    const msg =
      "👋 Hello! This is a test message from Habit Tracker. Twilio WhatsApp is working!";
    await whatsappClient.sendMessage(user.whatsappNumber, msg);
    res.json({
      success: true,
      message: "Test message sent",
      number: user.whatsappNumber,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-custom ──────────────────────────────────────────
// Admin — send custom message to any number
router.post("/send-custom", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res
        .status(400)
        .json({ error: '"number" and "message" are required.' });
    }
    await whatsappClient.sendMessage(number, message);
    res.json({ success: true, number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
