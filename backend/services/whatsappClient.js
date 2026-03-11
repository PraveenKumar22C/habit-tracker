import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsDir = path.join(__dirname, '../sessions');

if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
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
        try {
          await this.client.destroy();
        } catch {}
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
          ],
        },
      });

      this.client.on('qr', (qr) => {
        console.log('[WhatsApp] QR Code received. Scan once to connect permanently.');
        this.qrCode = qr;
      });

      this.client.on('authenticated', () => {
        console.log('[WhatsApp] Authenticated! Session saved — future restarts will reconnect automatically.');
        this.qrCode = null;
      });

      this.client.on('ready', () => {
        console.log('[WhatsApp] Client is ready!');
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
        console.log('[WhatsApp] Session wiped. Re-initializing to show fresh QR...');
        setTimeout(() => this.initialize(), 3000);
      });

      this.client.on('disconnected', async (reason) => {
        console.log('[WhatsApp] Disconnected:', reason);
        this.isReady = false;
        this.qrCode = null;
        this.isInitializing = false;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 60000);
          console.log(`[WhatsApp] Reconnect attempt ${this.reconnectAttempts} in ${delay / 1000}s...`);
          setTimeout(() => this.initialize(), delay);
        } else {
          console.error('[WhatsApp] Max reconnect attempts reached.');
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

  getQRCode() {
    return this.qrCode;
  }

  isConnected() {
    return this.isReady;
  }

  async sendMessage(number, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }
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