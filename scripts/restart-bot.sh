#!/bin/bash

###############################################################################
# Full Restart Bot Script
# 
# This script performs a full restart of the Telegram bot:
# 1. Stops all running bot processes
# 2. Waits for graceful shutdown
# 3. Cleans up any stuck processes
# 4. Starts the bot again
# 5. Verifies the bot is running correctly
#
# Usage: ./scripts/restart-bot.sh [--force] [--wait SECONDS]
#
# Options:
#   --force    Force kill processes (skip graceful shutdown)
#   --wait N   Wait N seconds before starting bot again (default: 2)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BOT_LOG_FILE="/tmp/bot-restart.log"
WAIT_SECONDS=2
FORCE_KILL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_KILL=true
      shift
      ;;
    --wait)
      WAIT_SECONDS="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--force] [--wait SECONDS]"
      exit 1
      ;;
  esac
done

cd "$PROJECT_DIR" || exit 1

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Full Restart Bot Script                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Find and stop running bot processes
echo -e "${YELLOW}Step 1/5: Stopping running bot processes...${NC}"

BOT_PIDS=$(ps aux | grep -E "node.*src/bot.js" | grep -v grep | awk '{print $2}' || true)

if [ -z "$BOT_PIDS" ]; then
  echo -e "${GREEN}✓ No bot processes found${NC}"
else
  echo -e "${YELLOW}Found bot processes: ${BOT_PIDS}${NC}"
  
  if [ "$FORCE_KILL" = true ]; then
    echo -e "${YELLOW}Force killing bot processes...${NC}"
    echo "$BOT_PIDS" | xargs kill -9 2>/dev/null || true
  else
    echo -e "${YELLOW}Stopping bot gracefully...${NC}"
    echo "$BOT_PIDS" | xargs kill -TERM 2>/dev/null || true
    
    # Wait for graceful shutdown (max 10 seconds)
    for i in {1..10}; do
      sleep 1
      if ! ps -p $(echo "$BOT_PIDS" | tr '\n' ' ') > /dev/null 2>&1; then
        break
      fi
      if [ $i -eq 10 ]; then
        echo -e "${YELLOW}Graceful shutdown timed out, force killing...${NC}"
        echo "$BOT_PIDS" | xargs kill -9 2>/dev/null || true
      fi
    done
  fi
  
  echo -e "${GREEN}✓ Bot processes stopped${NC}"
fi

# Step 2: Clean up any remaining processes
echo -e "${YELLOW}Step 2/5: Cleaning up remaining processes...${NC}"
sleep 1

# Check for any remaining bot processes and kill them
REMAINING_PIDS=$(ps aux | grep -E "node.*src/bot.js|npm.*start" | grep -v grep | awk '{print $2}' || true)
if [ -n "$REMAINING_PIDS" ]; then
  echo -e "${YELLOW}Found remaining processes: ${REMAINING_PIDS}${NC}"
  echo "$REMAINING_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo -e "${GREEN}✓ Cleanup completed${NC}"

# Step 3: Verify no bot processes are running
echo -e "${YELLOW}Step 3/5: Verifying all processes stopped...${NC}"
sleep 1

FINAL_CHECK=$(ps aux | grep -E "node.*src/bot.js" | grep -v grep | wc -l || echo "0")
if [ "$FINAL_CHECK" -gt 0 ]; then
  echo -e "${RED}✗ Warning: Some bot processes may still be running${NC}"
  ps aux | grep -E "node.*src/bot.js" | grep -v grep || true
else
  echo -e "${GREEN}✓ All bot processes stopped${NC}"
fi

# Step 4: Wait before restart
echo -e "${YELLOW}Step 4/5: Waiting ${WAIT_SECONDS} seconds before restart...${NC}"
sleep "$WAIT_SECONDS"

# Step 5: Start bot
echo -e "${YELLOW}Step 5/5: Starting bot...${NC}"

# Clear previous log file
> "$BOT_LOG_FILE"

# Start bot in background
cd "$PROJECT_DIR" || exit 1
npm start > "$BOT_LOG_FILE" 2>&1 &
BOT_PID=$!

echo -e "${GREEN}✓ Bot started (PID: ${BOT_PID})${NC}"

# Wait a moment for bot to initialize
sleep 3

# Verify bot is running
if ps -p "$BOT_PID" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Bot process is running${NC}"
  
  # Check for errors in log
  if grep -i "error" "$BOT_LOG_FILE" | grep -v "ERROR" | head -5; then
    echo -e "${YELLOW}⚠ Warning: Some errors detected in log (check ${BOT_LOG_FILE})${NC}"
  else
    echo -e "${GREEN}✓ Bot started successfully${NC}"
  fi
  
  # Show recent log entries
  echo ""
  echo -e "${BLUE}Recent bot log entries:${NC}"
  tail -10 "$BOT_LOG_FILE" | sed 's/^/  /'
  
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ Bot restart completed successfully!                   ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "Bot Status:"
  echo -e "  ${BLUE}PID:${NC}     ${BOT_PID}"
  echo -e "  ${BLUE}Status:${NC}   ${GREEN}Running${NC}"
  echo -e "  ${BLUE}Log:${NC}      ${BOT_LOG_FILE}"
  echo ""
else
  echo -e "${RED}✗ Bot failed to start!${NC}"
  echo ""
  echo -e "${RED}Error log:${NC}"
  tail -20 "$BOT_LOG_FILE" | sed 's/^/  /'
  exit 1
fi

