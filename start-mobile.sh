#!/bin/bash

echo "🚀 Starting LogScanner for iPhone Testing..."

# Function to cleanup background processes
cleanup() {
    echo "🛑 Stopping services..."
    kill $DEV_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Start the Next.js development server in the background
echo "📱 Starting Next.js development server..."
npm run dev:mobile &
DEV_PID=$!

# Wait a moment for the dev server to start
sleep 5

# Start ngrok tunnel in the background
echo "🌐 Starting ngrok tunnel..."
ngrok http 3000 --log stdout > ngrok.log &
NGROK_PID=$!

# Wait a moment for ngrok to start
sleep 3

# Extract the ngrok URL
echo "🔗 Getting ngrok URL..."
NGROK_URL=$(curl -s localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep https | cut -d'"' -f4)

if [ -n "$NGROK_URL" ]; then
    echo ""
    echo "✅ LogScanner is now accessible from your iPhone!"
    echo ""
    echo "📱 iPhone URL: $NGROK_URL"
    echo ""
    echo "🎯 Instructions for iPhone testing:"
    echo "1. Open Safari on your iPhone"
    echo "2. Navigate to: $NGROK_URL"
    echo "3. Tap the share button and 'Add to Home Screen'"
    echo "4. Grant camera permissions when prompted"
    echo ""
    echo "📲 Or scan this QR code:"
    echo "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=$(echo $NGROK_URL | sed 's/:/%%3A/g' | sed 's/\//%%2F/g')"
    echo ""
    echo "💡 Tip: Use the mobile share button in the app for easy QR code access!"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""
else
    echo "❌ Failed to get ngrok URL. Check if ngrok is installed and working."
    exit 1
fi

# Keep the script running
wait