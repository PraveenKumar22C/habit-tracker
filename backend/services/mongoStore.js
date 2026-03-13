import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import WhatsAppSession from '../models/WhatsappSession.js';

export class MongoStore {
  constructor(opts = {}) {
    this.verbose = opts.verbose ?? false;
  }

  _log(...args) {
    if (this.verbose) console.log('[MongoStore]', ...args);
  }

  _sessionName(session) {
    return path.basename(session);
  }

  async sessionExists({ session }) {
    const name = this._sessionName(session);
    const exists = !!(await WhatsAppSession.findOne({ sessionName: name }));
    this._log(`sessionExists(${name}) =>`, exists);
    return exists;
  }

  async save({ session }) {
    const name    = this._sessionName(session);
    const zipPath = `${session}.zip`;

    let base64;
    try {
      const buf = await readFile(zipPath);
      base64 = buf.toString('base64');
    } catch (err) {
      this._log(`save(${name}) — could not read zip at ${zipPath}: ${err.message}`);
      return;
    }

    await WhatsAppSession.findOneAndUpdate(
      { sessionName: name },
      { sessionName: name, data: base64, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    this._log(`save(${name}) — stored ${Math.round(base64.length / 1024)} KB`);
  }

  async extract({ session, path: destPath }) {
    const name = this._sessionName(session);
    const doc  = await WhatsAppSession.findOne({ sessionName: name });

    if (!doc) {
      this._log(`extract(${name}) — not found in DB`);
      return;
    }

    const buf = Buffer.from(doc.data, 'base64');
    await writeFile(destPath, buf);
    this._log(`extract(${name}) — wrote ${buf.length} bytes to ${destPath}`);
  }

  async delete({ session }) {
    const name = this._sessionName(session);
    await WhatsAppSession.deleteOne({ sessionName: name });
    this._log(`delete(${name})`);
  }
}