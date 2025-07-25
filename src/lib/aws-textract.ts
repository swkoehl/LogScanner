// AWS Textract OCR integration for LogScanner
// Replaces Azure Computer Vision with AWS Textract for document text extraction

import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand, Block } from '@aws-sdk/client-textract';
import { awsConfig, validateAwsConfig } from './aws-config';
import type { OCRResponse, OCRResult } from '@/types/logbook';

// Initialize AWS Textract client
async function initializeTextractClient() {
  validateAwsConfig();
  
  return new TextractClient({
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.accessKeyId!,
      secretAccessKey: awsConfig.secretAccessKey!,
    },
  });
}

// Process image with AWS Textract
export async function processImageOCR(imageData: string): Promise<OCRResponse> {
  try {
    const client = await initializeTextractClient();
    
    // Convert base64 to buffer
    const base64Data = imageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Use AnalyzeDocument for better table/form detection which is useful for logbooks
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: buffer,
      },
      FeatureTypes: ['TABLES', 'FORMS'], // Enhanced features for structured data
    });
    
    const response = await client.send(command);
    
    if (!response.Blocks) {
      throw new Error('No text blocks returned from Textract');
    }
    
    // Process results
    const ocrResults: OCRResult[] = [];
    let rawText = '';
    
    // Extract text lines with confidence and bounding boxes
    const textBlocks = response.Blocks.filter(block => block.BlockType === 'LINE');
    
    for (const block of textBlocks) {
      if (block.Text && block.Confidence && block.Geometry?.BoundingBox) {
        const boundingBox = convertBoundingBox(block.Geometry.BoundingBox);
        
        ocrResults.push({
          text: block.Text,
          confidence: block.Confidence / 100, // Convert to 0-1 scale
          boundingBox: boundingBox,
        });
        
        rawText += block.Text + '\n';
      }
    }
    
    // Extract structured data for enhanced parsing
    const structuredData = extractStructuredData(response.Blocks);
    
    return {
      results: ocrResults,
      rawText: rawText.trim(),
      processing: false,
      structuredData: structuredData,
    };
    
  } catch (error) {
    console.error('Textract processing error:', error);
    return {
      results: [],
      rawText: '',
      processing: false,
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
}

// Convert AWS bounding box format to our standard format
function convertBoundingBox(bbox: any): number[] {
  // AWS returns normalized coordinates (0-1), convert to pixel-like coordinates
  // Multiply by 1000 to get reasonable numbers for our parsing logic
  const width = 1000;
  const height = 1000;
  
  return [
    bbox.Left * width,      // x
    bbox.Top * height,      // y
    bbox.Width * width,     // width
    bbox.Height * height,   // height
  ];
}

// Extract structured data from Textract blocks for enhanced parsing
function extractStructuredData(blocks: Block[]) {
  const structuredData = {
    readResults: [{
      lines: [] as any[]
    }]
  };
  
  // Process LINE blocks to maintain compatibility with Azure format
  const lineBlocks = blocks.filter(block => block.BlockType === 'LINE');
  
  for (const block of lineBlocks) {
    if (block.Text && block.Geometry?.BoundingBox) {
      const boundingBox = convertBoundingBox(block.Geometry.BoundingBox);
      
      structuredData.readResults[0].lines.push({
        text: block.Text,
        boundingBox: boundingBox,
        words: extractWordsFromLine(block, blocks),
        appearance: {
          style: {
            confidence: (block.Confidence || 80) / 100
          }
        }
      });
    }
  }
  
  return structuredData;
}

// Extract word-level data from a line block
function extractWordsFromLine(lineBlock: Block, allBlocks: Block[]) {
  const words: any[] = [];
  
  // Find WORD blocks that belong to this line
  if (lineBlock.Relationships) {
    for (const relationship of lineBlock.Relationships) {
      if (relationship.Type === 'CHILD' && relationship.Ids) {
        for (const childId of relationship.Ids) {
          const wordBlock = allBlocks.find(block => block.Id === childId && block.BlockType === 'WORD');
          if (wordBlock && wordBlock.Text && wordBlock.Geometry?.BoundingBox) {
            words.push({
              text: wordBlock.Text,
              boundingBox: convertBoundingBox(wordBlock.Geometry.BoundingBox),
              confidence: (wordBlock.Confidence || 80) / 100
            });
          }
        }
      }
    }
  }
  
  return words;
}

// Parse logbook data from OCR text with improved structure understanding
export function parseLogbookData(ocrText: string, structuredData?: any): Partial<import('@/types/logbook').FlightLogEntry>[] {
  // Try structured parsing first if we have bounding box data
  if (structuredData?.readResults) {
    console.log('🎯 Using structured parsing with bounding box data');
    const structuredEntries = parseLogbookWithStructuralAwareness(structuredData);
    if (structuredEntries.length > 0) {
      return structuredEntries;
    }
  }
  
  // Fall back to text-based parsing
  console.log('📝 Using text-based parsing');
  const lines = ocrText.split('\n').filter(line => line.trim());
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  console.log('🔍 Parsing logbook data from OCR text:');
  console.log('Lines found:', lines.length);
  
  for (const line of lines) {
    console.log('📝 Processing line:', line);
    const entry = parseLogbookLineStructured(line);
    if (entry && Object.keys(entry).length > 1) {
      console.log('✅ Parsed entry:', entry);
      entries.push(entry);
    } else {
      console.log('❌ Could not parse line');
    }
  }
  
  console.log(`📊 Total entries parsed: ${entries.length}`);
  return entries;
}

// Enhanced structural parsing using bounding box data
function parseLogbookWithStructuralAwareness(ocrResult: any): Partial<import('@/types/logbook').FlightLogEntry>[] {
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  for (const page of ocrResult.readResults || []) {
    const lines = page.lines || [];
    
    // Sort lines by vertical position (top to bottom) to process rows
    const sortedLines = lines.sort((a: any, b: any) => a.boundingBox[1] - b.boundingBox[1]);
    
    // Group lines that are roughly at the same vertical level (same row)
    const rows = groupLinesByRow(sortedLines);
    
    for (const row of rows) {
      const entry = parseLogbookRow(row);
      if (entry && Object.keys(entry).length > 1) {
        entries.push(entry);
      }
    }
  }
  
  console.log(`🎯 Structured parsing found ${entries.length} entries`);
  return entries;
}

// Group lines that appear to be in the same row
function groupLinesByRow(lines: any[]): any[][] {
  const rows: any[][] = [];
  const rowThreshold = 20; // Pixels - adjust based on typical line height
  
  for (const line of lines) {
    const lineY = line.boundingBox[1]; // Top Y coordinate
    
    // Find existing row that this line belongs to
    const existingRow = rows.find(row => {
      const rowY = row[0].boundingBox[1];
      return Math.abs(lineY - rowY) < rowThreshold;
    });
    
    if (existingRow) {
      existingRow.push(line);
    } else {
      rows.push([line]);
    }
  }
  
  // Sort each row by X position (left to right)
  rows.forEach(row => {
    row.sort((a, b) => a.boundingBox[0] - b.boundingBox[0]);
  });
  
  return rows;
}

// Parse a single row of logbook data using column positions
function parseLogbookRow(rowLines: any[]): Partial<import('@/types/logbook').FlightLogEntry> | null {
  const entry: Partial<import('@/types/logbook').FlightLogEntry> = {};
  
  // Analyze each word/line in the row based on its X position
  for (const line of rowLines) {
    const x = line.boundingBox[0]; // Left X coordinate
    const text = line.text.trim();
    const words = line.words || [{ text, boundingBox: line.boundingBox }];
    
    for (const word of words) {
      const wordX = word.boundingBox[0];
      const wordText = word.text.trim();
      
      // Column detection based on typical logbook layout
      // These thresholds may need adjustment based on your specific logbook format
      
      // Column 1: Date (leftmost, typically x < 200)
      if (wordX < 200) {
        const dateMatch = wordText.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
        if (dateMatch) {
          entry.date = formatLogbookDate(wordText);
        }
      }
      
      // Column 2-3: Aircraft info (x 200-500)
      else if (wordX >= 200 && wordX < 500) {
        if (/^N\d+[A-Z]*$/i.test(wordText)) {
          entry.aircraftId = wordText.toUpperCase();
        } else if (/^(C|PA|SR|DA|BE)\w*\d+$/i.test(wordText)) {
          entry.aircraftType = normalizeAircraftType(wordText);
        }
      }
      
      // Column 4: Route (x 500-700)
      else if (wordX >= 500 && wordX < 700) {
        if (/^[A-Z]{3,4}$/i.test(wordText)) {
          if (!entry.route) {
            entry.route = wordText.toUpperCase();
          } else if (!entry.route.includes('-')) {
            entry.route = `${entry.route}-${wordText.toUpperCase()}`;
          }
        }
      }
      
      // Column 5+: Times and numbers (x > 700)
      else if (wordX >= 700) {
        const num = parseFloat(wordText);
        if (!isNaN(num)) {
          // Distinguish between flight times and landings
          if (num >= 0.1 && num <= 20.0 && wordText.includes('.')) {
            // Likely flight time (decimal hours)
            if (!entry.totalTime) {
              entry.totalTime = num;
            } else if (!entry.picTime) {
              entry.picTime = num;
            } else if (!entry.dualTime) {
              entry.dualTime = num;
            }
          } else if (Number.isInteger(num) && num >= 1 && num <= 50) {
            // Likely landings (whole number)
            if (!entry.landings) {
              entry.landings = num;
            }
          }
        }
      }
    }
  }
  
  return Object.keys(entry).length > 1 ? entry : null;
}

// Helper function to format dates consistently
function formatLogbookDate(dateText: string): string {
  const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!dateMatch) return dateText;
  
  const month = dateMatch[1].padStart(2, '0');
  const day = dateMatch[2].padStart(2, '0');
  let year = dateMatch[3];
  
  if (!year) {
    // Assume current year if no year specified
    year = new Date().getFullYear().toString();
  } else if (year.length === 2) {
    // Convert 2-digit year to 4-digit
    const yearNum = parseInt(year);
    year = (yearNum > 50 ? '19' : '20') + year;
  }
  
  return `${year}-${month}-${day}`;
}

// Helper function to normalize aircraft types
function normalizeAircraftType(aircraftText: string): string {
  const normalized = aircraftText.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Common aircraft type mappings
  const typeMap: { [key: string]: string } = {
    'CESSNA172': 'C172',
    'CESSNA152': 'C152',
    'CESSNA182': 'C182',
    'PIPER28': 'PA28',
    'PIPERPA28': 'PA28',
    'PIPERCHEROKEE': 'PA28',
  };
  
  return typeMap[normalized] || normalized;
}

// Enhanced parsing with better logbook structure understanding
function parseLogbookLineStructured(line: string): Partial<import('@/types/logbook').FlightLogEntry> | null {
  const entry: Partial<import('@/types/logbook').FlightLogEntry> = {};
  
  // Clean up the line - remove extra spaces and normalize
  const cleanLine = line.trim().replace(/\s+/g, ' ');
  
  // Split the line into potential columns (using multiple spaces as delimiter)
  const parts = cleanLine.split(/\s{2,}/).filter(part => part.trim());
  
  console.log('🔧 Line parts:', parts);
  
  // More aggressive date pattern matching
  // Look for MM/DD pattern (with or without year)
  const datePatterns = [
    /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,  // MM/DD or MM/DD/YY or MM/DD/YYYY
    /\b(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?\b/,    // MM-DD or MM-DD-YY or MM-DD-YYYY
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/, // YYYY/MM/DD or YYYY-MM-DD
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = cleanLine.match(pattern);
    if (dateMatch) {
      if (dateMatch[3]) {
        // Has year
        let year = dateMatch[3];
        if (year.length === 2) {
          year = (parseInt(year) > 50 ? '19' : '20') + year;
        }
        entry.date = `${year}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      } else {
        // No year, assume current year or recent
        const currentYear = new Date().getFullYear();
        entry.date = `${currentYear}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      }
      break;
    }
  }
  
  // Enhanced aircraft identification patterns
  const aircraftPatterns = [
    /\bN\d{1,5}[A-Z]{0,3}\b/i,           // Standard N-number
    /\b[A-Z]{2,3}\d{2,4}[A-Z]?\b/,       // European style
    /\b\d{4}[A-Z]{1,2}\b/,               // Alternative format
  ];
  
  for (const pattern of aircraftPatterns) {
    const aircraftMatch = cleanLine.match(pattern);
    if (aircraftMatch) {
      entry.aircraftId = aircraftMatch[0].toUpperCase();
      break;
    }
  }
  
  // Enhanced aircraft type detection
  const typePatterns = [
    /\b(C-?172|C-?152|C-?182|C-?206|C-?150|C-?177)\b/i,    // Cessna
    /\b(PA-?28|PA-?44|PA-?34|PA-?46)\b/i,                   // Piper
    /\b(SR-?20|SR-?22)\b/i,                                 // Cirrus
    /\b(DA-?40|DA-?42|DA-?20)\b/i,                          // Diamond
    /\b(BE-?35|BE-?36|A-?36)\b/i,                           // Beechcraft
    /\bCESSNA\s+172\b/i,                                    // Full name format
    /\bPIPER\s+CHEROKEE\b/i,                                // Full name format
  ];
  
  for (const pattern of typePatterns) {
    const typeMatch = cleanLine.match(pattern);
    if (typeMatch) {
      entry.aircraftType = typeMatch[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      break;
    }
  }
  
  // Enhanced route detection (From/To airports)
  const routePatterns = [
    /\b([A-Z]{3,4})\s*[-\/]\s*([A-Z]{3,4})\b/,             // KPAO-KSQL
    /\b([A-Z]{3,4})\s+([A-Z]{3,4})\b/,                     // KPAO KSQL (space separated)
    /\b(K[A-Z]{3})\s*[-\/]\s*(K[A-Z]{3})\b/,               // Specifically K-prefixed airports
  ];
  
  for (const pattern of routePatterns) {
    const routeMatch = cleanLine.match(pattern);
    if (routeMatch) {
      entry.route = `${routeMatch[1]}-${routeMatch[2]}`.toUpperCase();
      break;
    }
  }
  
  // Enhanced time parsing - look for decimal numbers that could be flight times
  const timePattern = /\b(\d{1,2}\.\d{1,2})\b/g;
  const timeMatches = [...cleanLine.matchAll(timePattern)];
  
  if (timeMatches.length > 0) {
    // First decimal number is likely total time
    entry.totalTime = parseFloat(timeMatches[0][1]);
    
    // Additional times might be PIC, dual, etc.
    if (timeMatches.length > 1) {
      entry.picTime = parseFloat(timeMatches[1][1]);
    }
    if (timeMatches.length > 2) {
      entry.dualTime = parseFloat(timeMatches[2][1]);
    }
  }
  
  // Landing detection - look for numbers that could be landings (typically 1-20)
  const landingPatterns = [
    /\b(\d{1,2})\s*(?:landing|ldg|land)/i,                  // Explicit landing mention
    /(?:landing|ldg|land)\s*[:=]?\s*(\d{1,2})/i,            // Landing followed by number
  ];
  
  for (const pattern of landingPatterns) {
    const landingMatch = cleanLine.match(pattern);
    if (landingMatch) {
      const landingCount = parseInt(landingMatch[1]);
      if (landingCount >= 1 && landingCount <= 50) {  // Reasonable landing range
        entry.landings = landingCount;
        break;
      }
    }
  }
  
  // If no explicit landing found, look for standalone reasonable numbers
  if (!entry.landings) {
    const numberPattern = /\b(\d{1,2})\b/g;
    const numbers = [...cleanLine.matchAll(numberPattern)];
    
    for (const numberMatch of numbers) {
      const num = parseInt(numberMatch[1]);
      // Look for numbers that could be landings (1-20 range, not time-like)
      if (num >= 1 && num <= 20 && !cleanLine.includes(`${num}.`)) {
        entry.landings = num;
        break;
      }
    }
  }
  
  return Object.keys(entry).length > 0 ? entry : null;
}