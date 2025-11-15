#!/bin/bash

#
# Twitter/X Posting Test Script Wrapper
# Easy-to-use interface for testing Twitter posting functionality
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Twitter/X Posting Test Suite                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if node_modules exists
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "⚠️  Installing dependencies..."
  cd "$SCRIPT_DIR"
  npm install --production > /dev/null 2>&1
  echo "✅ Dependencies installed"
  echo ""
fi

# Show menu if no argument provided
if [ -z "$1" ]; then
  echo "Select a test:"
  echo "  1) All tests"
  echo "  2) Text posting only"
  echo "  3) Media (image) posting"
  echo "  4) Video posting"
  echo "  5) Account status"
  echo ""
  read -p "Enter choice (1-5): " choice
  
  case $choice in
    1)
      node "$SCRIPT_DIR/test_twitter_posting.js" all
      ;;
    2)
      node "$SCRIPT_DIR/test_twitter_posting.js" text
      ;;
    3)
      node "$SCRIPT_DIR/test_twitter_posting.js" media
      ;;
    4)
      node "$SCRIPT_DIR/test_twitter_posting.js" video
      ;;
    5)
      node -e "require('./test_twitter_posting.js')" 2>/dev/null | head -20
      ;;
    *)
      echo "Invalid choice"
      exit 1
      ;;
  esac
else
  # Run with provided argument
  case $1 in
    all|text|media|video)
      node "$SCRIPT_DIR/test_twitter_posting.js" "$1"
      ;;
    status)
      node -e "const test = require('./test_twitter_posting.js')" 2>/dev/null
      ;;
    *)
      echo "Usage: $0 [all|text|media|video|status]"
      echo ""
      echo "Examples:"
      echo "  $0              # Interactive menu"
      echo "  $0 all          # Run all tests"
      echo "  $0 text         # Test text posting"
      echo "  $0 media        # Test image posting"
      echo "  $0 video        # Test video posting"
      echo "  $0 status       # Show account status"
      exit 1
      ;;
  esac
fi

echo ""
