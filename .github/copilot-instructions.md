# GitHub Copilot Development Instructions for LogScanner AWS Edition

> **Context**: This project was migrated from Azure to AWS, focusing on creating a streamlined OCR solution for converting handwritten pilot logbooks to ForeFlight-compatible CSV files using AWS Textract.

## 🎯 **Primary Development Principles**

1. **Mobile-First**: All UI components must work seamlessly on mobile devices
2. **PWA-Optimized**: Progressive Web App with offline capabilities
3. **TypeScript Strict**: Type safety throughout the entire codebase
4. **AWS Textract**: Primary OCR service with enhanced table/form detection
5. **Security by Design**: Environment variables in `.env.local` (never committed)
6. **Performance**: Fast camera capture and OCR processing
7. **User Experience**: Intuitive interface for pilots

## 🔐 **Environment Security**

### Local Development
```bash
# .env.local (NEVER commit this file)
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your-access-key-id
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your-secret-access-key
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_APP_ENV=development
```

### Secure Configuration
```typescript
// lib/aws-config.ts
export const awsConfig = {
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
} as const;

// Validate at runtime
if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
  throw new Error('Missing AWS credentials');
}
```

### AWS Best Practices
- Use IAM roles in production instead of access keys
- Follow principle of least privilege for permissions
- Monitor AWS costs and usage through CloudWatch
- Rotate access keys regularly

## 🛠️ **Technology Stack Guidelines**

### Frontend Framework
- **Next.js 15** with App Router
- **TypeScript** with strict mode enabled
- **Tailwind CSS** for styling
- **Shadcn/ui** for component library
- **PWA** configuration with next-pwa

### Key Dependencies
```json
{
  "next": "15.4.3",
  "@aws-sdk/client-textract": "^3.670.0",
  "tailwindcss": "^4",
  "@radix-ui/react-*": "latest",
  "lucide-react": "latest"
}
```

### File Structure
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── api/ocr/
│   └── components/
├── components/
│   ├── ui/
│   ├── camera/
│   ├── data-review/
│   └── DebugInfo.tsx
├── lib/
│   ├── aws-textract.ts
│   ├── aws-config.ts
│   ├── csv-export.ts
│   └── utils.ts
└── types/
    └── logbook.ts
```

## 📱 **Core Components**

### 1. Camera Capture Component
```typescript
// Features:
- Mobile camera access via navigator.mediaDevices
- Image capture and compression
- Preview and retake functionality
- Optimal image quality for OCR processing
```

### 2. AWS Textract Integration
```typescript
// OCR Service features:
- AWS Textract AnalyzeDocument API
- Table and form detection capabilities
- Enhanced handwriting recognition
- Confidence scoring and bounding boxes
- Synchronous processing (no polling required)
```

### 3. Enhanced Data Extraction
```typescript
// Improved logbook recognition:
- Structural document understanding
- Column-aware parsing using bounding boxes
- Better table detection for logbook layouts
- Aircraft type normalization
- Route pattern recognition (KPAO-KSQL)
```

### 4. Data Review Interface
```typescript
// User editing capabilities:
- Field-by-field validation and editing
- Visual confidence indicators
- Real-time CSV preview
- Save/restore functionality
```

### 5. ForeFlight CSV Export
```typescript
// Export features:
- ForeFlight-compatible format
- Proper date and time formatting
- Validation before export
- Direct download functionality
```

## 🎨 **UI/UX Guidelines**

### Mobile-First Design
- Touch-friendly interface (44px minimum touch targets)
- Clear typography and high contrast
- Intuitive gesture support
- Responsive for all device sizes

### Aviation Theme
- Professional blue and white color scheme
- Airplane iconography (Lucide icons)
- Clean, pilot-friendly interface
- Clear status indicators

### Progressive Enhancement
- Works without JavaScript for basic functionality
- Enhanced features with JavaScript enabled
- Graceful degradation for older browsers

## 🔧 **AWS Textract Implementation**

### Setup and Configuration
```typescript
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

const client = new TextractClient({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  },
});
```

### Document Analysis
```typescript
// Enhanced OCR with table detection
const command = new AnalyzeDocumentCommand({
  Document: { Bytes: imageBuffer },
  FeatureTypes: ['TABLES', 'FORMS'], // Key improvement over Azure
});
```

### Data Processing
```typescript
// Process Textract blocks for structured extraction
- LINE blocks for text content
- WORD blocks for precise positioning
- TABLE blocks for structured data
- Bounding box coordinates for column detection
```

## 📊 **Enhanced Data Models**

### Core Types (Updated)
```typescript
interface FlightLogEntry {
  id?: string;
  date: string;           // YYYY-MM-DD format
  aircraftId: string;     // Registration number (N-number)
  aircraftType: string;   // C172, PA28, etc.
  route: string;          // KPAO-KSQL format
  totalTime: number;      // Decimal hours
  picTime?: number;       // Pilot in Command time
  dualTime?: number;      // Dual instruction time
  landings: number;       // Number of landings
  confidence?: number;    // OCR confidence (0-1)
}

interface OCRResponse {
  results: OCRResult[];
  rawText: string;
  processing: boolean;
  error?: string;
  structuredData?: any; // AWS Textract structured response
}
```

## 🚀 **Migration Benefits**

### Technical Improvements
- **Better Table Detection**: Enhanced logbook column recognition
- **Single API Call**: No polling required (vs Azure's async model)
- **Form Detection**: Better structured document understanding
- **Cost Efficiency**: 1K pages free monthly vs Azure's transaction limits

### Development Benefits
- **Simplified Authentication**: Standard AWS credentials
- **Better Documentation**: Comprehensive AWS SDK docs
- **Ecosystem Integration**: Easy integration with other AWS services
- **Regional Processing**: Data stays in specified AWS region

## ⚠️ **Security & Best Practices**

### AWS Security
1. **IAM Permissions**: Only grant `textract:AnalyzeDocument` and `textract:DetectDocumentText`
2. **Access Key Rotation**: Regular rotation of credentials
3. **Environment Separation**: Different AWS accounts for dev/staging/prod
4. **Cost Monitoring**: Set up billing alerts for unexpected charges

### Development Guidelines
1. **Never commit credentials** - Always use environment variables
2. **Test with real data** - Use actual handwritten logbook samples
3. **Mobile-first testing** - Always test on actual mobile devices
4. **Cost awareness** - Monitor AWS Textract usage during development

## 🧪 **Testing Strategy**

### OCR Testing
- Various handwriting styles and quality
- Different logbook formats and layouts
- Edge cases (poor lighting, skewed images)
- Table detection accuracy

### Integration Testing
- Camera functionality across browsers
- AWS credential validation
- Error handling for network issues
- CSV export format validation

## 📝 **Development Workflow**

### Local Development
1. Run AWS setup script: `./setup-aws.sh`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Test on mobile devices via ngrok/tunnel

### Deployment Options
1. **AWS S3 + CloudFront** (recommended)
2. **Vercel** (works out of the box)
3. **Netlify** (static export compatible)

## 🎯 **Current Feature Status**

### ✅ Completed (v2.0 AWS Edition)
- AWS Textract integration with table/form detection
- Mobile camera capture and image processing
- Interactive data review and editing
- ForeFlight CSV export functionality
- Enhanced bounding box-aware parsing
- Cost-efficient AWS implementation

### 🔄 In Progress
- Advanced table structure recognition
- Custom Textract queries for aviation data
- Enhanced error handling and user feedback

### 📋 Planned
- Amazon A2I integration for human review
- Custom model training for logbook layouts
- Progressive Web App enhancements
- Offline functionality improvements

---

**Remember**: Focus on the pilot user experience, prioritize mobile performance, and leverage AWS Textract's superior table detection capabilities for better logbook parsing accuracy! ✈️