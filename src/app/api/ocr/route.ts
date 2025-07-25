import { NextRequest, NextResponse } from 'next/server';
import { processImageOCR } from '@/lib/azure-ocr';
import { processImageTextract } from '@/lib/aws-textract';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, provider } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Use specified provider or fall back to config default
    const ocrProvider = provider || config.app.ocrProvider;
    
    let result;
    if (ocrProvider === 'aws') {
      console.log('Using AWS Textract for OCR processing');
      result = await processImageTextract(imageData);
    } else if (ocrProvider === 'azure') {
      console.log('Using Azure Computer Vision for OCR processing');
      result = await processImageOCR(imageData);
    } else {
      return NextResponse.json(
        { error: `Invalid OCR provider: ${ocrProvider}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ ...result, provider: ocrProvider });
  } catch (error) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
