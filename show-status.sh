#!/bin/bash

echo "📊 LogScanner Status Check"
echo "=========================="
echo ""

# Check if Next.js is running
NEXT_PID=$(pgrep -f "next.*dev" | head -1)
if [ -n "$NEXT_PID" ]; then
    echo "✅ Next.js Development Server: RUNNING (PID: $NEXT_PID)"
    echo "   📍 Local: http://localhost:3000"
    echo "   📍 Network: http://0.0.0.0:3000"
else
    echo "❌ Next.js Development Server: NOT RUNNING"
    echo "   💡 Run: npm run dev:mobile"
fi

echo ""

# Check if ngrok is running
NGROK_PID=$(pgrep -f "ngrok" | head -1)
if [ -n "$NGROK_PID" ]; then
    echo "✅ ngrok Tunnel: RUNNING (PID: $NGROK_PID)"
    NGROK_URL=$(curl -s localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | grep https | cut -d'"' -f4)
    if [ -n "$NGROK_URL" ]; then
        echo "   🌐 Public URL: $NGROK_URL"
    else
        echo "   ❌ No public URL available (check authentication)"
    fi
else
    echo "❌ ngrok Tunnel: NOT RUNNING"
    echo "   💡 Run: ngrok http 3000"
fi

echo ""

# Show local network information
echo "🔗 Local Network URLs:"
LOCAL_IPS=$(hostname -I | tr ' ' '\n' | grep -E '^(192\.168\.|10\.|172\.)' | head -3)
for IP in $LOCAL_IPS; do
    if [[ $IP =~ ^192\.168\. ]] || [[ $IP =~ ^10\. ]] || [[ $IP =~ ^172\. ]]; then
        echo "   📱 http://$IP:3000"
    fi
done

echo ""

# Show environment configuration
echo "⚙️  Configuration:"
if [ -f ".env.local" ]; then
    echo "   ✅ Environment file: .env.local found"
    OCR_PROVIDER=$(grep "NEXT_PUBLIC_OCR_PROVIDER" .env.local | cut -d'=' -f2)
    if [ -n "$OCR_PROVIDER" ]; then
        echo "   🤖 OCR Provider: $OCR_PROVIDER"
    else
        echo "   🤖 OCR Provider: aws (default)"
    fi
else
    echo "   ❌ Environment file: .env.local not found"
    echo "   💡 Copy and configure .env.local with your credentials"
fi

echo ""

# Show quick start commands
echo "🚀 Quick Start Commands:"
echo "   📱 Local Network Testing: ./start-local-mobile.sh"
echo "   🌐 ngrok Tunnel Testing:  ./start-mobile.sh"
echo "   💻 Desktop Development:   npm run dev"
echo "   🔧 Build for Production:  npm run build"

echo ""

# Show iPhone testing instructions
if [ -n "$NEXT_PID" ]; then
    echo "📱 iPhone Testing Ready!"
    echo "1. Connect iPhone to same Wi-Fi network"
    echo "2. Open Safari and go to one of the network URLs above"
    echo "3. Add to Home Screen for PWA experience"
    echo "4. Allow camera permissions when prompted"
    
    FIRST_IP=$(echo $LOCAL_IPS | head -1)
    if [ -n "$FIRST_IP" ]; then
        echo ""
        echo "📲 QR Code: https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://$FIRST_IP:3000"
    fi
fi

echo ""