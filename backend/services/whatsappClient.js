import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`; // e.g. whatsapp:+14155238886

const whatsappClient = {
  isConnected() {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
  },

  async sendMessage(number, message) {
    if (!this.isConnected()) {
      throw new Error('Twilio credentials not configured');
    }
    // number should be e.g. "919440667351" — we prefix whatsapp:+
    const to = `whatsapp:+${number.replace(/^\+/, '')}`;
    const result = await client.messages.create({ from: FROM, to, body: message });
    console.log(`[Twilio] Sent to ${to} — SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  },

  // No-op — kept so existing code that calls initialize() doesn't break
  async initialize() {
    if (this.isConnected()) {
      console.log('[Twilio] WhatsApp client ready (sandbox mode)');
    } else {
      console.warn('[Twilio] Missing credentials — check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM');
    }
  },

  // No-op — kept for compatibility
  async close() {},
  getQRCode() { return null; },
  getQRCodeDataUri() { return null; },
  getQRExpiresIn() { return 0; },
};

export default whatsappClient;