# AWS Migration Guide 🔄

## LogScanner: Azure → AWS Migration Complete

This document outlines the complete migration from Microsoft Azure Computer Vision to AWS Textract for the LogScanner application.

## 🎯 Migration Overview

### What Changed
- **OCR Service**: Azure Computer Vision → AWS Textract
- **Authentication**: Azure API Keys → AWS Access Keys + Secret Keys
- **Configuration**: Azure endpoints → AWS regions
- **Enhanced Features**: Added table/form detection capabilities

### Why AWS?
1. **Better Table Detection**: AWS Textract excels at structured document analysis
2. **Cost Efficiency**: More generous free tier (1K pages vs Azure's limits)
3. **Ecosystem Integration**: Better integration with other AWS services
4. **Deployment Options**: Native support for S3 + CloudFront hosting

## 📦 Key Changes Made

### Dependencies
```diff
- "@azure/cognitiveservices-computervision": "^8.2.0"
+ "@aws-sdk/client-textract": "^3.670.0"
```

### Configuration Files
- `src/lib/azure-config.ts` → `src/lib/aws-config.ts`
- `src/lib/azure-ocr.ts` → `src/lib/aws-textract.ts`
- `setup-azure.sh` → `setup-aws.sh`

### Environment Variables
```diff
- AZURE_COMPUTER_VISION_ENDPOINT
- AZURE_COMPUTER_VISION_KEY
+ AWS_ACCESS_KEY_ID / NEXT_PUBLIC_AWS_ACCESS_KEY_ID
+ AWS_SECRET_ACCESS_KEY / NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY
+ AWS_REGION / NEXT_PUBLIC_AWS_REGION
```

## 🚀 Quick Start (AWS Edition)

### Prerequisites
1. **AWS Account** with Textract access
2. **AWS CLI** installed and configured
3. **Node.js** v18+

### Setup Steps

1. **Install dependencies:**
```bash
npm install
```

2. **Run AWS setup (automated):**
```bash
./setup-aws.sh
```

3. **Start development server:**
```bash
npm run dev
```

### Manual Setup Alternative

If you prefer manual setup:

1. **Create IAM user** with Textract permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:DetectDocumentText",
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    }
  ]
}
```

2. **Generate access keys** for the IAM user

3. **Create `.env.local`:**
```bash
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_access_key_id
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret_access_key  
NEXT_PUBLIC_AWS_REGION=us-east-1
```

## 🔧 Technical Improvements

### Enhanced OCR Capabilities
- **Table Detection**: Better column recognition for logbook layouts
- **Form Detection**: Improved field extraction from structured documents
- **Confidence Scores**: More accurate confidence metrics
- **Bounding Boxes**: Enhanced coordinate mapping for precise text location

### Performance Optimizations
- **Single API Call**: No polling required (unlike Azure's async model)
- **Better Error Handling**: More descriptive error messages
- **Regional Processing**: Data processed in specified AWS region

### Cost Benefits
- **Free Tier**: 1,000 pages/month free (vs Azure's 20K transactions)
- **Predictable Pricing**: $1.50 per 1,000 pages after free tier
- **No Surprise Costs**: Clear pricing structure

## 🏗️ Deployment Options

### AWS Native (Recommended)
```bash
# Build static site
npm run build

# Deploy to S3
aws s3 sync out/ s3://your-bucket-name

# Configure CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### Other Platforms
- **Vercel**: Works out of the box
- **Netlify**: Compatible with static export
- **Any CDN**: Upload `out/` directory

## 🔒 Security Considerations

### Production Best Practices
1. **Use IAM Roles** instead of access keys when possible
2. **Rotate credentials** regularly
3. **Principle of least privilege** - only grant necessary permissions
4. **Environment separation** - different credentials for dev/staging/prod

### Development Security
- Never commit `.env.local` to git
- Use different AWS accounts for development and production
- Monitor AWS usage for unexpected charges

## 📊 Monitoring & Troubleshooting

### AWS Console Monitoring
- **CloudWatch**: Monitor Textract API calls and errors
- **AWS Billing**: Track Textract usage and costs
- **CloudTrail**: Audit API calls for security

### Common Issues
1. **Credentials Error**: Check AWS credentials and permissions
2. **Region Mismatch**: Ensure consistent region configuration
3. **Rate Limiting**: AWS Textract has default throttling limits

## 🎉 Migration Complete!

The LogScanner app is now fully migrated to AWS Textract with enhanced capabilities:

- ✅ **Better OCR accuracy** for structured documents
- ✅ **Cost-effective pricing** with generous free tier  
- ✅ **Enhanced table detection** for logbook parsing
- ✅ **Simplified deployment** with AWS ecosystem
- ✅ **Improved error handling** and debugging

Ready to scan those pilot logbooks! 🛩️✈️