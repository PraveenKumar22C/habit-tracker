import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const cacheDir = path.resolve(__dirname, '../.puppeteer-cache');
  const found = findChrome(cacheDir);
  if (found) {
    console.log(`[Chrome] Found at: ${found}`);
    return found;
  }

  console.warn('[Chrome] No Chrome binary found — Puppeteer will use its default');
  return undefined;
}

function findChrome(cacheDir) {
  if (!fs.existsSync(cacheDir)) return null;
  const chromeDir = path.join(cacheDir, 'chrome');
  if (!fs.existsSync(chromeDir)) return null;
  const versions = fs.readdirSync(chromeDir).sort().reverse();
  for (const version of versions) {
    const bin = path.join(chromeDir, version, 'chrome-linux64', 'chrome');
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}