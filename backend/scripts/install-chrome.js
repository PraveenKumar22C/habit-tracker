import { execSync } from 'child_process';

const cacheDir = './.puppeteer-cache';

console.log('==> Installing Chrome for Puppeteer (build time)...');
console.log(`==> Cache dir: ${cacheDir}`);

try {
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
  });
  console.log('==> Chrome installed successfully.');
} catch (err) {
  console.warn('==> Chrome install failed:', err.message);
}