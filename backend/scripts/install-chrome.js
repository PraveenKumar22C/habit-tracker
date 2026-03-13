import { execSync } from 'child_process';

console.log('==> Installing Chrome for Puppeteer (build time)...');

try {
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: '/opt/render/.cache/puppeteer',
    },
  });
  console.log('==> Chrome installed successfully.');
} catch (err) {
  console.warn('==> Chrome install failed:', err.message);
}