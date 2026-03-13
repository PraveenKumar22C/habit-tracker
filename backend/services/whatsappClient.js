import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

import { MongoStore } from './mongoStore.js';
import { sessionExpiredEmailTemplate } from './emailTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tempDir = path.join(__dirname, '../.wwebjs_auth');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const SESSION_KEY = 'RemoteAuth-habit-tracker-bot';

async function sendSessionExpiredEmail() {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const { default: User } = await import('../models/User.js');
    const admins = await User.find({ isAdmin: true }).select('email').lean();
    if (!admins.length) return;

    const to = admins.map(u => u.email).join(', ');
    const settingsUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?tab=whatsapp`;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const logoPath = path.join(__dirname, '../public/apple-icon.png');
    await transporter.sendMail({
      from: `"HabitTrack Bot" <${process.env.EMAIL_USER}>`,
      to,
      subject: '⚠️ WhatsApp Session Expired — Re-scan Required',
      html: sessionExpiredEmailTemplate({ settingsUrl }),
      ...(fs.existsSync(logoPath) && {
        attachments: [{ filename: 'apple-icon.png', path: logoPath, cid: 'habitTrackerLogo' }],
      }),
    });
    console.log(`[WhatsApp] Alert email sent to: ${to}`);
  } catch (err) {
    console.error('[WhatsApp] Failed to send alert email:', err.message);
  }
}

class WhatsAppClient {
  constructor() {
    this.client         = null;
    this.isReady        = false;
    this.qrCode         = null;
    this.qrDataUri      = null;
    this.qrReceivedAt   = null;
    this.reconnectAttempts = 0;
    this.baseDelay      = 10000;
    this.isInitializing = false;
    this._sessionWiped  = false;
    this._stopped       = false;
  }

  async initialize() {
    if (this.isInitializing) {
      console.log('[WhatsApp] Already initializing — skipping.');
      return;
    }
    this.isInitializing = true;
    this._stopped = false;

    try {
      console.log('[WhatsApp] Initializing with RemoteAuth (MongoDB session)...');
      console.log(`[WhatsApp] Session key used by RemoteAuth: "${SESSION_KEY}"`);

      if (this.client) {
        try { await this.client.destroy(); } catch {}
        this.client = null;
      }

      const store = new MongoStore({ verbose: true });

      this.client = new Client({
        authStrategy: new RemoteAuth({
          clientId: 'habit-tracker-bot',
          store,
          backupSyncIntervalMs: 60000, 
          dataPath: tempDir,
        }),
        puppeteer: {
          headless: true,
          protocolTimeout: 600000,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
            '--memory-pressure-off',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      });

      this.client.on('qr', async (qr) => {
        console.log('[WhatsApp] New QR received — pre-rendering PNG...');
        this.isReady      = false;
        this.qrCode       = qr;
        this.qrReceivedAt = Date.now();
        try {
          this.qrDataUri = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          console.log('[WhatsApp] QR PNG ready — you have 10 minutes to scan');
        } catch (err) {
          console.error('[WhatsApp] QR render failed:', err.message);
          this.qrDataUri = null;
        }
      });

      this.client.on('authenticated', () => {
        console.log('[WhatsApp] Authenticated — waiting for remote_session_saved event...');
        this._sessionWiped = false;
        this._clearQR();
      });

      this.client.on('remote_session_saved', () => {
        console.log(`[WhatsApp] ✅ Session saved to MongoDB (key: ${SESSION_KEY})`);
        console.log('[WhatsApp] Server will auto-connect on next restart — no re-scan needed.');
      });

      this.client.on('ready', () => {
        console.log('[WhatsApp] Client ready!');
        this.isReady        = true;
        this._clearQR();
        this.reconnectAttempts = 0;
        this.isInitializing = false;
      });

      this.client.on('auth_failure', async (msg) => {
        console.error('[WhatsApp] Auth failure:', msg);
        this.isReady        = false;
        this.isInitializing = false;
        if (!this._sessionWiped) {
          this._sessionWiped = true;
          console.log('[WhatsApp] Wiping DB session after auth failure.');
          await this._wipeDBSession();
          await sendSessionExpiredEmail();
        }
        this._scheduleReconnect();
      });

      this.client.on('disconnected', async (reason) => {
        console.log('[WhatsApp] Disconnected:', reason);
        this.isReady        = false;
        this.isInitializing = false;
        if ((reason === 'LOGOUT' || reason === 'CONFLICT') && !this._sessionWiped) {
          this._sessionWiped = true;
          console.log('[WhatsApp] Logout/conflict — wiping DB session.');
          await this._wipeDBSession();
          await sendSessionExpiredEmail();
        }
        this._scheduleReconnect();
      });

      await this.client.initialize();

    } catch (error) {
      console.error('[WhatsApp] Initialization error:', error.message);
      this.isInitializing = false;
      this._scheduleReconnect();
    }
  }

  _clearQR() {
    this.qrCode       = null;
    this.qrDataUri    = null;
    this.qrReceivedAt = null;
  }

  async _wipeDBSession() {
    try {
      const store = new MongoStore({ verbose: true });
      await store.delete({ session: SESSION_KEY });
      console.log('[WhatsApp] DB session wiped.');
    } catch (err) {
      console.error('[WhatsApp] Failed to wipe DB session:', err.message);
    }
  }

  _scheduleReconnect() {
    if (this._stopped) return;
    const delay = Math.min(
      this.baseDelay * Math.pow(1.5, this.reconnectAttempts),
      120000
    );
    this.reconnectAttempts++;
    console.log(`[WhatsApp] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => this.initialize(), delay);
  }

  isConnected() { return this.isReady; }

  getQRCodeDataUri() {
    if (!this.qrDataUri || !this.qrReceivedAt) return null;
    if (Date.now() - this.qrReceivedAt > 10 * 60 * 1000) return null;
    return this.qrDataUri;
  }

  getQRExpiresIn() {
    if (!this.qrReceivedAt) return 0;
    const remaining = (10 * 60 * 1000) - (Date.now() - this.qrReceivedAt);
    return Math.max(0, Math.round(remaining / 1000));
  }

  getQRCode() { return this.qrCode; }

  async sendMessage(number, message) {
    if (!this.isReady) throw new Error('WhatsApp client is not ready');
    const chatId = `${number}@c.us`;
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('sendMessage timed out after 60s')), 60000)
    );
    await Promise.race([this.client.sendMessage(chatId, message), timeout]);
    console.log(`[WhatsApp] Message sent to ${number}`);
    return { success: true };
  }

  async close() {
    this._stopped = true;
    try {
      if (this.client) {
        await this.client.destroy();
        this.isReady = false;
        console.log('[WhatsApp] Client closed.');
      }
    } catch (err) {
      console.error('[WhatsApp] Error closing:', err.message);
    }
  }
}

export default new WhatsAppClient();