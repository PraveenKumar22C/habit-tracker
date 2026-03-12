#!/bin/bash

echo "==> Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

echo "==> Starting server..."
node server.js