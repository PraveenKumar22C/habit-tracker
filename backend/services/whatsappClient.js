import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { sessionExpiredEmailTemplate } from './emailTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsDir = path.join(__dirname, '../sessions');

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
}

async function sendSessionExpiredEmail() {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('[WhatsApp] EMAIL_USER / EMAIL_PASS not set — skipping alert email');
      return;
    }

    const { default: User } = await import('../models/User.js');
    const adminUsers = await User.find({ isAdmin: true }).select('email name').lean();

    if (!adminUsers.length) {
      console.warn('[WhatsApp] No admin users found in DB — skipping alert email');
      return;
    }

    const adminEmails = adminUsers.map(u => u.email);
    console.log(`[WhatsApp] Sending session-expired alert to: ${adminEmails.join(', ')}`);

    const settingsUrl =
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?tab=whatsapp`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const logoPath = path.join(__dirname, '../public/apple-icon.png');
    const logoExists = fs.existsSync(logoPath);

    await transporter.sendMail({
      from: `"HabitTrack Bot" <${process.env.EMAIL_USER}>`,
      to: adminEmails.join(', '),
      subject: '⚠️ WhatsApp Session Expired — Re-scan Required',
      html: sessionExpiredEmailTemplate({ settingsUrl }),
      ...(logoExists && {
        attachments: [
          {
            filename: 'apple-icon.png',
            path: logoPath,
            cid: 'habitTrackerLogo',
          },
        ],
      }),
    });

    console.log(`[WhatsApp] 📧 Alert sent to: ${adminEmails.join(', ')}`);
  } catch (err) {
    console.error('[WhatsApp] Failed to send alert email:', err.message);
  }
}

class WhatsAppClient {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 999;
    this.reconnectDelay = 5000;
    this.isInitializing = false;
    this._authenticatedOnce = false;
  }

  async initialize() {
    if (this.isInitializing) {
      console.log('[WhatsApp] Already initializing, skipping...');
      return;
    }
    this.isInitializing = true;

    try {
      console.log('[WhatsApp] Initializing WhatsApp client...');

      if (this.client) {
        try { await this.client.destroy(); } catch {}
        this.client = null;
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'habit-tracker-bot',
          dataPath: sessionsDir,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
          ],
        },
      });

      this.client.on('qr', (qr) => {
        console.log('[WhatsApp] QR Code received. Scan once to connect permanently.');
        this.qrCode = qr;
      });

      this.client.on('authenticated', () => {
        if (this._authenticatedOnce) {
          console.log('[WhatsApp] Re-authenticated. New session saved — old one replaced.');
        } else {
          console.log('[WhatsApp] Authenticated! Session saved.');
          this._authenticatedOnce = true;
        }
        this.qrCode = null;
      });

      this.client.on('ready', () => {
        console.log('[WhatsApp] Client is ready! ✅');
        this.isReady = true;
        this.qrCode = null;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        this.isInitializing = false;
      });

      this.client.on('auth_failure', async (msg) => {
        console.error('[WhatsApp] Auth failure:', msg);
        this.isReady = false;
        this.isInitializing = false;
        this._wipeSession();
        await sendSessionExpiredEmail();
        setTimeout(() => this.initialize(), 3000);
      });

      this.client.on('disconnected', async (reason) => {
        console.log('[WhatsApp] Disconnected:', reason);
        this.isReady = false;
        this.qrCode = null;
        this.isInitializing = false;

        if (reason === 'LOGOUT' || reason === 'CONFLICT') {
          console.log('[WhatsApp] Session expired. Wiping session folder...');
          this._wipeSession();
          await sendSessionExpiredEmail();
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 60000);
          console.log(`[WhatsApp] Reconnect attempt ${this.reconnectAttempts} in ${delay / 1000}s...`);
          setTimeout(() => this.initialize(), delay);
        }
      });

      await this.client.initialize();

    } catch (error) {
      console.error('[WhatsApp] Failed to initialize:', error.message);
      this.isInitializing = false;
      const delay = Math.min(this.reconnectDelay * (this.reconnectAttempts + 1), 60000);
      console.log(`[WhatsApp] Retrying in ${delay / 1000}s...`);
      setTimeout(() => this.initialize(), delay);
    }
  }

  _wipeSession() {
    try {
      const sessionPath = path.join(sessionsDir, 'session-habit-tracker-bot');
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('[WhatsApp] Session directory wiped.');
      }
    } catch (err) {
      console.error('[WhatsApp] Failed to wipe session:', err.message);
    }
  }

  getQRCode()   { return this.qrCode; }
  isConnected() { return this.isReady; }

  async sendMessage(number, message) {
    if (!this.isReady) throw new Error('WhatsApp client is not ready');
    const chatId = `${number}@c.us`;
    await this.client.sendMessage(chatId, message);
    console.log(`[WhatsApp] Message sent to ${number}`);
    return { success: true };
  }

  async sendBulkMessages(recipients) {
    const results = { successful: [], failed: [] };
    for (const { number, message } of recipients) {
      try {
        await this.sendMessage(number, message);
        results.successful.push({ number });
      } catch (error) {
        results.failed.push({ number, error: error.message });
      }
    }
    return results;
  }

  async close() {
    try {
      if (this.client) {
        await this.client.destroy();
        this.isReady = false;
        console.log('[WhatsApp] Client closed.');
      }
    } catch (error) {
      console.error('[WhatsApp] Error closing client:', error);
    }
  }
}

export default new WhatsAppClient();