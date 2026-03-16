const PING_INTERVAL_MS = 14 * 60 * 1000;

class KeepAliveService {
  constructor() {
    this._timer = null;
  }

  start() {
    const serverUrl =
      process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;

    if (!serverUrl) {
      console.log(
        "[KeepAlive] No RENDER_EXTERNAL_URL set — skipping self-ping.",
      );
      console.log(
        "[KeepAlive] Set RENDER_EXTERNAL_URL=https://your-app.onrender.com in env vars.",
      );
      return;
    }

    const pingUrl = `${serverUrl.replace(/\/$/, "")}/api/health`;
    console.log(`[KeepAlive] Started — pinging ${pingUrl} every 14 minutes`);

    this._ping(pingUrl);
    this._timer = setInterval(() => this._ping(pingUrl), PING_INTERVAL_MS);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      console.log("[KeepAlive] Stopped.");
    }
  }

  async _ping(url) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      console.log(`[KeepAlive] Ping OK — ${res.status}`);
    } catch (err) {
      console.warn(`[KeepAlive] Ping failed: ${err.message}`);
    }
  }
}

export default new KeepAliveService();
