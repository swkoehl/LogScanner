This is a [Next.js](https://nextjs.org) project for converting handwritten pilot logbooks to digital ForeFlight-compatible CSV files using AWS Textract.

## LogScanner - AWS Edition

Transform handwritten pilot logbooks into digital ForeFlight-compatible CSV files using AI-powered OCR technology from AWS Textract.

## Getting Started

### Prerequisites

1. **Node.js** (v18 or later)
2. **AWS Account** with Textract access
3. **AWS CLI** configured (for setup script)

### Quick Setup

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up AWS Textract (automated):**
```bash
chmod +x setup-aws.sh
./setup-aws.sh
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open your browser:**
Open [http://localhost:3000](http://localhost:3000) to see the result.

### Manual AWS Setup

If you prefer to set up AWS manually:

1. Create an IAM user with Textract permissions
2. Generate access keys
3. Create `.env.local` with:
```bash
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_access_key_id
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret_access_key
NEXT_PUBLIC_AWS_REGION=us-east-1
```

## Features

- 📱 **Mobile-first PWA** with camera capture
- 🤖 **AWS Textract OCR** with handwriting recognition
- ✏️ **Interactive review** and editing interface  
- 📊 **ForeFlight CSV export** functionality
- 📱 **Responsive design** optimized for mobile devices

## How It Works

1. **Capture** - Take photos of handwritten logbook pages
2. **Process** - AWS Textract extracts text using AI
3. **Review** - Edit and verify extracted flight data
4. **Export** - Download CSV files for ForeFlight import

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [AWS Textract](https://aws.amazon.com/textract/) - learn about AWS OCR services
- [ForeFlight](https://foreflight.com/) - electronic flight bag for pilots

## Deployment

### AWS S3 + CloudFront

The easiest way to deploy is using AWS S3 with CloudFront:

1. Build the static site:
```bash
npm run build
```

2. Upload the `out/` directory to S3
3. Configure CloudFront for distribution
4. Set up custom domain (optional)

### Other Platforms

This app can also be deployed to:
- Vercel
- Netlify  
- Any static hosting service

## Cost Estimation

AWS Textract pricing (as of 2024):
- **First 1,000 pages/month**: Free
- **Additional pages**: $1.50 per 1,000 pages
- **AnalyzeDocument (Tables/Forms)**: $50 per 1,000 pages

For typical pilot usage (scanning a few logbook pages monthly), costs should remain within the free tier.
