import fs from 'fs';
import path from 'path';

export function getChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
  const chromePath = findChrome(cacheDir);
  if (chromePath) {
    console.log(`[Chrome] Found at: ${chromePath}`);
    return chromePath;
  }

  const fallbacks = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of fallbacks) {
    if (fs.existsSync(p)) {
      console.log(`[Chrome] Fallback: ${p}`);
      return p;
    }
  }

  console.warn('[Chrome] No Chrome binary found — Puppeteer will try its default path');
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