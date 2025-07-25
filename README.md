# LogScanner - Pilot Logbook Converter

Convert handwritten pilot logbooks to ForeFlight-compatible CSV files using AI-powered OCR (AWS Textract or Azure Computer Vision).

## Features

- 📱 **Mobile-first PWA** - Optimized for iPhone camera capture
- 🤖 **Dual OCR Support** - AWS Textract & Azure Computer Vision
- 📊 **Smart Parsing** - Intelligent logbook structure detection
- 📄 **CSV Export** - ForeFlight-compatible format
- 🔒 **Privacy-first** - No data stored, processed locally

## Quick Start for iPhone Testing

### 1. Setup Environment

Copy `.env.local` and add your AWS credentials:

```bash
# AWS Configuration (recommended)
NEXT_PUBLIC_OCR_PROVIDER=aws
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_aws_access_key_id
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start with iPhone Testing

#### Option A: Local Network (Recommended)
```bash
./start-local-mobile.sh
```

This will:
- Start the development server on `0.0.0.0:3000`
- Display local network URLs for same-WiFi testing
- Show QR codes and setup instructions

#### Option B: ngrok Tunnel (Requires Auth)
```bash
./start-mobile.sh
```

Note: Requires ngrok account and authtoken:
1. Sign up at https://dashboard.ngrok.com/signup
2. Install authtoken: `ngrok config add-authtoken YOUR_TOKEN`

### 4. Alternative: Manual Startup

```bash
# Start development server
npm run dev:mobile

# In another terminal, create tunnel
npm run tunnel
```

## OCR Provider Setup

### AWS Textract (Recommended)
1. Create AWS account and get credentials
2. Enable Textract service in your region
3. Set environment variables as shown above

### Azure Computer Vision (Alternative)
```bash
NEXT_PUBLIC_OCR_PROVIDER=azure
NEXT_PUBLIC_AZURE_COMPUTER_VISION_ENDPOINT=your_endpoint
NEXT_PUBLIC_AZURE_COMPUTER_VISION_KEY=your_key
```

## iPhone Testing Instructions

1. **Open the ngrok URL** provided by the startup script
2. **Add to Home Screen** for best PWA experience
3. **Grant camera permissions** when prompted
4. **Take photos** of your logbook pages
5. **Review and edit** extracted data
6. **Export to CSV** for ForeFlight import

## Development Scripts

```bash
npm run dev          # Standard development server
npm run dev:mobile   # Mobile-optimized server (0.0.0.0:3000)
npm run tunnel       # Create ngrok tunnel
npm run build        # Build for production
npm run start        # Start production server
```

## Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # React components
│   ├── camera/         # Camera capture
│   ├── data-review/    # OCR data review
│   └── mobile-share/   # iPhone sharing tools
├── lib/                # Core libraries
│   ├── aws-textract.ts # AWS Textract integration
│   ├── azure-ocr.ts    # Azure Computer Vision
│   ├── config.ts       # Environment configuration
│   └── csv-export.ts   # ForeFlight CSV export
└── types/              # TypeScript definitions
```

## Troubleshooting

### Camera Issues on iPhone
- Ensure HTTPS connection (ngrok provides this)
- Grant camera permissions in Safari settings
- Try refreshing the page if camera doesn't appear

### OCR Processing Errors
- Check your AWS/Azure credentials
- Verify image quality and lighting
- Switch between AWS and Azure providers using the dropdown

### Connection Issues
- Ensure ngrok is installed: `npm install -g ngrok`
- Check firewall settings for port 3000
- Verify your network allows outbound connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test on both providers (AWS & Azure)
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
