#!/bin/bash

echo "🚀 Starting LogScanner for Local Network iPhone Testing..."

# Function to cleanup background processes
cleanup() {
    echo "🛑 Stopping development server..."
    kill $DEV_PID 2>/dev/null
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Start the Next.js development server in the background
echo "📱 Starting Next.js development server on all interfaces..."
npm run dev:mobile &
DEV_PID=$!

# Wait a moment for the dev server to start
sleep 5

# Get local IP addresses
LOCAL_IPS=$(hostname -I | tr ' ' '\n' | grep -E '^(192\.168\.|10\.|172\.)' | head -3)

echo ""
echo "✅ LogScanner is now running locally!"
echo ""
echo "📱 For iPhone Testing (Local Network):"
echo ""

# Display all possible local network URLs
for IP in $LOCAL_IPS; do
    if [[ $IP =~ ^192\.168\. ]] || [[ $IP =~ ^10\. ]] || [[ $IP =~ ^172\. ]]; then
        echo "🔗 http://$IP:3000"
    fi
done

echo ""
echo "🎯 iPhone Setup Instructions:"
echo "1. Connect your iPhone to the SAME Wi-Fi network as this computer"
echo "2. Open Safari on your iPhone"
echo "3. Navigate to one of the URLs above"
echo "4. If it doesn't work, try the other URLs"
echo "5. Tap 'Share' → 'Add to Home Screen' for best PWA experience"
echo "6. Grant camera permissions when prompted"
echo ""
echo "🔧 Alternative Methods:"
echo "• Use USB tethering/hotspot from your iPhone"
echo "• Set up ngrok with authentication: https://dashboard.ngrok.com/signup"
echo "• Deploy to a cloud service (Vercel, Netlify, etc.)"
echo ""
echo "📲 Or scan this QR code (if on the same network):"
FIRST_IP=$(echo $LOCAL_IPS | cut -d' ' -f1)
if [ -n "$FIRST_IP" ]; then
    echo "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://$FIRST_IP:3000"
fi
echo ""
echo "🔍 Troubleshooting:"
echo "• Make sure your firewall allows port 3000"
echo "• Ensure iPhone and computer are on same Wi-Fi"
echo "• Some corporate networks block device-to-device communication"
echo ""
echo "Press Ctrl+C to stop the development server"
echo ""

# Keep the script running
wait