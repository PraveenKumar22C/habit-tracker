#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Habit Tracker Application...${NC}"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo -e "${RED}Error: .env.local not found. Please create it with your configuration.${NC}"
  exit 1
fi

# Check if backend/.env exists
if [ ! -f "backend/.env" ]; then
  echo -e "${RED}Error: backend/.env not found. Please create it with your configuration.${NC}"
  exit 1
fi

# Install backend dependencies if node_modules doesn't exist
if [ ! -d "backend/node_modules" ]; then
  echo -e "${YELLOW}Installing backend dependencies...${NC}"
  cd backend
  npm install
  cd ..
fi

# Start backend in background
echo -e "${GREEN}Starting backend server on port 5000...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}Starting frontend server on port 3000...${NC}"
npm run dev

# Cleanup on exit
cleanup() {
  echo -e "${YELLOW}Stopping services...${NC}"
  kill $BACKEND_PID 2>/dev/null
  exit 0
}

trap cleanup EXIT INT TERM
