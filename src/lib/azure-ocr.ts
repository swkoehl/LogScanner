// Azure Computer Vision OCR integration for LogScanner MVP

import { azureConfig, validateAzureConfig } from './azure-config';
import type { OCRResponse, OCRResult } from '@/types/logbook';

// Initialize Azure Computer Vision client
async function initializeOCRClient() {
  validateAzureConfig();
  
  // Use REST API approach for better browser compatibility
  return {
    endpoint: azureConfig.endpoint,
    key: azureConfig.key,
  };
}

// Process image with Azure Computer Vision Read API
export async function processImageOCR(imageData: string): Promise<OCRResponse> {
  try {
    const client = await initializeOCRClient();
    
    // Convert base64 to blob
    const base64Data = imageData.split(',')[1];
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    // Submit image for analysis
    const submitResponse = await fetch(`${client.endpoint}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': client.key,
        'Content-Type': 'application/octet-stream',
      } as HeadersInit,
      body: bytes,
    });
    
    if (!submitResponse.ok) {
      throw new Error(`OCR submission failed: ${submitResponse.statusText}`);
    }
    
    // Get operation location for polling
    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No operation location returned from OCR service');
    }
    
    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const resultResponse = await fetch(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': client.key,
        } as HeadersInit,
      });
      
      if (!resultResponse.ok) {
        throw new Error(`OCR result fetch failed: ${resultResponse.statusText}`);
      }
      
      result = await resultResponse.json();
      attempts++;
    } while (result.status === 'running' && attempts < maxAttempts);
    
    if (result.status !== 'succeeded') {
      throw new Error(`OCR processing failed with status: ${result.status}`);
    }
    
    // Process results
    const ocrResults: OCRResult[] = [];
    let rawText = '';
    
    if (result.analyzeResult?.readResults) {
      for (const page of result.analyzeResult.readResults) {
        for (const line of page.lines || []) {
          ocrResults.push({
            text: line.text,
            confidence: line.appearance?.style?.confidence || 0.8,
            boundingBox: line.boundingBox || [],
          });
          rawText += line.text + '\n';
        }
      }
    }
    
    return {
      results: ocrResults,
      rawText: rawText.trim(),
      processing: false,
      structuredData: result.analyzeResult, // Pass structured data for enhanced parsing
    };
    
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      results: [],
      rawText: '',
      processing: false,
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
}

// Parse logbook data from OCR text with improved structure understanding
export function parseLogbookData(ocrText: string, structuredData?: unknown): Partial<import('@/types/logbook').FlightLogEntry>[] {
  // Try structured parsing first if we have bounding box data
  if (structuredData && typeof structuredData === 'object' && 'readResults' in structuredData) {
    console.log('🎯 Using structured parsing with bounding box data');
    const structuredEntries = parseLogbookWithStructuralAwareness(structuredData as { readResults?: unknown[] });
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
function parseLogbookWithStructuralAwareness(ocrResult: { readResults?: unknown[] }): Partial<import('@/types/logbook').FlightLogEntry>[] {
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  for (const page of ocrResult.readResults || []) {
    const pageData = page as { lines?: unknown[] };
    const lines = pageData.lines || [];
    
    // Sort lines by vertical position (top to bottom) to process rows
    const sortedLines = lines.sort((a: unknown, b: unknown) => {
      const aBox = (a as { boundingBox?: number[] }).boundingBox?.[1] || 0;
      const bBox = (b as { boundingBox?: number[] }).boundingBox?.[1] || 0;
      return aBox - bBox;
    });
    
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
function groupLinesByRow(lines: unknown[]): unknown[][] {
  const rows: unknown[][] = [];
  const rowThreshold = 20; // Pixels - adjust based on typical line height
  
  for (const line of lines) {
    const lineData = line as { boundingBox?: number[] };
    const lineY = lineData.boundingBox?.[1] || 0; // Top Y coordinate
    
    // Find existing row that this line belongs to
    const existingRow = rows.find(row => {
      const rowData = row[0] as { boundingBox?: number[] };
      const rowY = rowData.boundingBox?.[1] || 0;
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
    row.sort((a, b) => {
      const aData = a as { boundingBox?: number[] };
      const bData = b as { boundingBox?: number[] };
      const aX = aData.boundingBox?.[0] || 0;
      const bX = bData.boundingBox?.[0] || 0;
      return aX - bX;
    });
  });
  
  return rows;
}

// Parse a single row of logbook data using column positions
function parseLogbookRow(rowLines: unknown[]): Partial<import('@/types/logbook').FlightLogEntry> | null {
  const entry: Partial<import('@/types/logbook').FlightLogEntry> = {};
  
  // Analyze each word/line in the row based on its X position
  for (const line of rowLines) {
    const lineData = line as { boundingBox?: number[]; text?: string; words?: unknown[] };
    const text = lineData.text?.trim() || '';
    const words = lineData.words || [{ text, boundingBox: lineData.boundingBox }];
    
    for (const word of words) {
      const wordData = word as { boundingBox?: number[]; text?: string };
      const wordX = wordData.boundingBox?.[0] || 0;
      const wordText = wordData.text?.trim() || '';
      
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
