import WhatsAppSession from '../models/WhatsappSession';

export class MongoStore {
  constructor(opts = {}) {
    this.verbose = opts.verbose ?? false;
  }

  _log(...args) {
    if (this.verbose) console.log('[MongoStore]', ...args);
  }

  async sessionExists({ session }) {
    const exists = !!(await WhatsAppSession.findOne({ sessionName: session }));
    this._log(`sessionExists(${session}) =>`, exists);
    return exists;
  }

  async save({ session, data }) {
    const base64 = Buffer.isBuffer(data) ? data.toString('base64') : data;
    await WhatsAppSession.findOneAndUpdate(
      { sessionName: session },
      { sessionName: session, data: base64, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    this._log(`save(${session}) — ${Math.round(base64.length / 1024)} KB`);
  }

  async extract({ session, path: destPath }) {
    const doc = await WhatsAppSession.findOne({ sessionName: session });
    if (!doc) {
      this._log(`extract(${session}) — not found in DB`);
      return;
    }
    const { writeFile } = await import('fs/promises');
    const buf = Buffer.from(doc.data, 'base64');
    await writeFile(destPath, buf);
    this._log(`extract(${session}) — wrote ${buf.length} bytes to disk`);
  }

  async delete({ session }) {
    await WhatsAppSession.deleteOne({ sessionName: session });
    this._log(`delete(${session})`);
  }
}