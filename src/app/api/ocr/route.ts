import { NextRequest, NextResponse } from 'next/server';
import { processImageOCR } from '@/lib/aws-textract';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    const result = await processImageOCR(imageData);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
