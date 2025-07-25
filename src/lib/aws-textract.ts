// AWS Textract OCR integration for LogScanner MVP

import { TextractClient, AnalyzeDocumentCommand, Block } from '@aws-sdk/client-textract';
import type { OCRResponse, OCRResult } from '@/types/logbook';

let textractClient: TextractClient | null = null;

// Initialize AWS Textract client
function initializeTextractClient() {
  if (!textractClient) {
    textractClient = new TextractClient({
      region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return textractClient;
}

// Process image with AWS Textract
export async function processImageTextract(imageData: string): Promise<OCRResponse> {
  try {
    const client = initializeTextractClient();
    
    // Convert base64 to buffer
    const base64Data = imageData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Use AnalyzeDocument for better structure detection
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: buffer,
      },
      FeatureTypes: ['TABLES', 'FORMS'], // Enable table and form detection for logbooks
    });
    
    const result = await client.send(command);
    
    // Process results
    const ocrResults: OCRResult[] = [];
    let rawText = '';
    
    if (result.Blocks) {
      // Process LINE blocks for OCR results
      const lineBlocks = result.Blocks.filter(block => block.BlockType === 'LINE');
      
      for (const block of lineBlocks) {
        if (block.Text && block.Geometry?.BoundingBox) {
          const boundingBox = [
            block.Geometry.BoundingBox.Left || 0,
            block.Geometry.BoundingBox.Top || 0,
            (block.Geometry.BoundingBox.Left || 0) + (block.Geometry.BoundingBox.Width || 0),
            (block.Geometry.BoundingBox.Top || 0) + (block.Geometry.BoundingBox.Height || 0),
          ];
          
          ocrResults.push({
            text: block.Text,
            confidence: block.Confidence || 0.8,
            boundingBox,
          });
          rawText += block.Text + '\n';
        }
      }
    }
    
    return {
      results: ocrResults,
      rawText: rawText.trim(),
      processing: false,
      structuredData: result, // Pass structured data for enhanced parsing
    };
    
  } catch (error) {
    console.error('Textract processing error:', error);
    return {
      results: [],
      rawText: '',
      processing: false,
      error: error instanceof Error ? error.message : 'Unknown Textract error',
    };
  }
}

// Parse logbook data from Textract results with enhanced structure understanding
export function parseLogbookDataTextract(ocrText: string, structuredData?: unknown): Partial<import('@/types/logbook').FlightLogEntry>[] {
  if (structuredData && typeof structuredData === 'object' && 'Blocks' in structuredData) {
    console.log('🎯 Using Textract structured parsing');
    const structuredEntries = parseLogbookWithTextractStructure(structuredData as { Blocks?: Block[] });
    if (structuredEntries.length > 0) {
      return structuredEntries;
    }
  }
  
  // Fall back to text-based parsing (reuse existing logic)
  console.log('📝 Using text-based parsing for Textract');
  return parseLogbookFromText(ocrText);
}

// Enhanced structural parsing using Textract's block structure
function parseLogbookWithTextractStructure(textractResult: { Blocks?: Block[] }): Partial<import('@/types/logbook').FlightLogEntry>[] {
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  // Get all blocks
  const blocks = textractResult.Blocks || [];
  
  // Find table blocks first (most structured)
  const tableBlocks = blocks.filter((block) => block.BlockType === 'TABLE');
  
  for (const table of tableBlocks) {
    const tableEntries = parseLogbookTable(table, blocks);
    entries.push(...tableEntries);
  }
  
  // If no tables found, try cell-based parsing
  if (entries.length === 0) {
    const cellBlocks = blocks.filter((block) => block.BlockType === 'CELL');
    if (cellBlocks.length > 0) {
      const cellEntries = parseLogbookCells(cellBlocks, blocks);
      entries.push(...cellEntries);
    }
  }
  
  // If still no structured data, fall back to line parsing
  if (entries.length === 0) {
    const lineBlocks = blocks.filter((block) => block.BlockType === 'LINE');
    const lineEntries = parseLogbookLines(lineBlocks);
    entries.push(...lineEntries);
  }
  
  console.log(`🎯 Textract structured parsing found ${entries.length} entries`);
  return entries;
}

// Parse logbook table structure
function parseLogbookTable(table: Block, allBlocks: Block[]): Partial<import('@/types/logbook').FlightLogEntry>[] {
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  if (!table.Relationships) return entries;
  
  // Get all cells in this table
  const cellIds = table.Relationships
    .filter((rel) => rel.Type === 'CHILD')
    .flatMap((rel) => rel.Ids || []);
  
  const cells = allBlocks.filter((block) => 
    block.Id && cellIds.includes(block.Id) && block.BlockType === 'CELL'
  );
  
  // Group cells by row
  const rowMap = new Map<number, Block[]>();
  
  for (const cell of cells) {
    const rowIndex = cell.RowIndex || 0;
    if (!rowMap.has(rowIndex)) {
      rowMap.set(rowIndex, []);
    }
    rowMap.get(rowIndex)!.push(cell);
  }
  
  // Sort rows and process each
  const sortedRows = Array.from(rowMap.entries()).sort(([a], [b]) => a - b);
  
  for (const [rowIndex, rowCells] of sortedRows) {
    // Skip header row (assuming first row is header)
    if (rowIndex <= 1) continue;
    
    // Sort cells by column
    const sortedCells = rowCells.sort((a, b) => (a.ColumnIndex || 0) - (b.ColumnIndex || 0));
    
    const entry = parseLogbookTableRow(sortedCells, allBlocks);
    if (entry && Object.keys(entry).length > 1) {
      entries.push(entry);
    }
  }
  
  return entries;
}

// Parse a single table row into logbook entry
function parseLogbookTableRow(cells: Block[], allBlocks: Block[]): Partial<import('@/types/logbook').FlightLogEntry> | null {
  const entry: Partial<import('@/types/logbook').FlightLogEntry> = {};
  
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const cellText = getCellText(cell, allBlocks).trim();
    
    if (!cellText) continue;
    
    // Map columns to logbook fields based on typical logbook structure
    switch (i) {
      case 0: // Date column
        const dateMatch = cellText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
        if (dateMatch) {
          entry.date = formatDate(cellText);
        }
        break;
        
      case 1: // Aircraft ID
        if (/^N\d+[A-Z]*$/i.test(cellText)) {
          entry.aircraftId = cellText.toUpperCase();
        }
        break;
        
      case 2: // Aircraft Type
        if (/^(C|PA|SR|DA|BE)\w*\d+$/i.test(cellText)) {
          entry.aircraftType = cellText.toUpperCase();
        }
        break;
        
      case 3: // Route
        if (/^[A-Z]{3,4}[-\/][A-Z]{3,4}$/i.test(cellText)) {
          entry.route = cellText.toUpperCase();
        }
        break;
        
      case 4: // Total Time
      case 5: // PIC Time
      case 6: // Dual Time
        const time = parseFloat(cellText);
        if (!isNaN(time) && time > 0 && time <= 20) {
          if (i === 4) entry.totalTime = time;
          else if (i === 5) entry.picTime = time;
          else if (i === 6) entry.dualTime = time;
        }
        break;
        
      case 7: // Landings
        const landings = parseInt(cellText);
        if (!isNaN(landings) && landings > 0 && landings <= 50) {
          entry.landings = landings;
        }
        break;
    }
  }
  
  return Object.keys(entry).length > 1 ? entry : null;
}

// Get text content from a cell
function getCellText(cell: Block, allBlocks: Block[]): string {
  if (!cell.Relationships) return '';
  
  const childIds = cell.Relationships
    .filter((rel) => rel.Type === 'CHILD')
    .flatMap((rel) => rel.Ids || []);
  
  const childBlocks = allBlocks.filter((block) => block.Id && childIds.includes(block.Id));
  
  return childBlocks
    .filter((block) => block.BlockType === 'WORD')
    .map((block) => block.Text || '')
    .join(' ');
}

// Parse logbook cells when no table structure is detected
function parseLogbookCells(cells: Block[], allBlocks: Block[]): Partial<import('@/types/logbook').FlightLogEntry>[] {
  // Group cells by approximate row (similar Y coordinates)
  const rowGroups = groupCellsByRow(cells);
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  for (const row of rowGroups) {
    const entry = parseLogbookTableRow(row, allBlocks);
    if (entry && Object.keys(entry).length > 1) {
      entries.push(entry);
    }
  }
  
  return entries;
}

// Group cells by row based on Y coordinate
function groupCellsByRow(cells: Block[]): Block[][] {
  const threshold = 0.02; // 2% of page height tolerance
  const rows: Block[][] = [];
  
  for (const cell of cells) {
    const cellY = cell.Geometry?.BoundingBox?.Top || 0;
    
    const existingRow = rows.find(row => {
      const rowY = row[0].Geometry?.BoundingBox?.Top || 0;
      return Math.abs(cellY - rowY) < threshold;
    });
    
    if (existingRow) {
      existingRow.push(cell);
    } else {
      rows.push([cell]);
    }
  }
  
  // Sort each row by X coordinate
  rows.forEach(row => {
    row.sort((a, b) => {
      const aX = a.Geometry?.BoundingBox?.Left || 0;
      const bX = b.Geometry?.BoundingBox?.Left || 0;
      return aX - bX;
    });
  });
  
  return rows;
}

// Parse logbook lines when no structured data is available
function parseLogbookLines(lines: Block[]): Partial<import('@/types/logbook').FlightLogEntry>[] {
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  for (const line of lines) {
    const text = line.Text || '';
    const entry = parseLogbookLineStructured(text);
    if (entry && Object.keys(entry).length > 1) {
      entries.push(entry);
    }
  }
  
  return entries;
}

// Reuse existing text parsing logic
function parseLogbookFromText(ocrText: string): Partial<import('@/types/logbook').FlightLogEntry>[] {
  const lines = ocrText.split('\n').filter(line => line.trim());
  const entries: Partial<import('@/types/logbook').FlightLogEntry>[] = [];
  
  for (const line of lines) {
    const entry = parseLogbookLineStructured(line);
    if (entry && Object.keys(entry).length > 1) {
      entries.push(entry);
    }
  }
  
  return entries;
}

// Helper function to format dates consistently
function formatDate(dateText: string): string {
  const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!dateMatch) return dateText;
  
  const month = dateMatch[1].padStart(2, '0');
  const day = dateMatch[2].padStart(2, '0');
  let year = dateMatch[3];
  
  if (!year) {
    year = new Date().getFullYear().toString();
  } else if (year.length === 2) {
    const yearNum = parseInt(year);
    year = (yearNum > 50 ? '19' : '20') + year;
  }
  
  return `${year}-${month}-${day}`;
}

// Enhanced parsing with better logbook structure understanding (reused from azure-ocr.ts)
function parseLogbookLineStructured(line: string): Partial<import('@/types/logbook').FlightLogEntry> | null {
  const entry: Partial<import('@/types/logbook').FlightLogEntry> = {};
  
  // Clean up the line - remove extra spaces and normalize
  const cleanLine = line.trim().replace(/\s+/g, ' ');
  
  // More aggressive date pattern matching
  const datePatterns = [
    /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
    /\b(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?\b/,
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = cleanLine.match(pattern);
    if (dateMatch) {
      entry.date = formatDate(dateMatch[0]);
      break;
    }
  }
  
  // Enhanced aircraft identification patterns
  const aircraftPatterns = [
    /\bN\d{1,5}[A-Z]{0,3}\b/i,
    /\b[A-Z]{2,3}\d{2,4}[A-Z]?\b/,
    /\b\d{4}[A-Z]{1,2}\b/,
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
    /\b(C-?172|C-?152|C-?182|C-?206|C-?150|C-?177)\b/i,
    /\b(PA-?28|PA-?44|PA-?34|PA-?46)\b/i,
    /\b(SR-?20|SR-?22)\b/i,
    /\b(DA-?40|DA-?42|DA-?20)\b/i,
    /\b(BE-?35|BE-?36|A-?36)\b/i,
  ];
  
  for (const pattern of typePatterns) {
    const typeMatch = cleanLine.match(pattern);
    if (typeMatch) {
      entry.aircraftType = typeMatch[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      break;
    }
  }
  
  // Enhanced route detection
  const routePatterns = [
    /\b([A-Z]{3,4})\s*[-\/]\s*([A-Z]{3,4})\b/,
    /\b([A-Z]{3,4})\s+([A-Z]{3,4})\b/,
    /\b(K[A-Z]{3})\s*[-\/]\s*(K[A-Z]{3})\b/,
  ];
  
  for (const pattern of routePatterns) {
    const routeMatch = cleanLine.match(pattern);
    if (routeMatch) {
      entry.route = `${routeMatch[1]}-${routeMatch[2]}`.toUpperCase();
      break;
    }
  }
  
  // Enhanced time parsing
  const timePattern = /\b(\d{1,2}\.\d{1,2})\b/g;
  const timeMatches = [...cleanLine.matchAll(timePattern)];
  
  if (timeMatches.length > 0) {
    entry.totalTime = parseFloat(timeMatches[0][1]);
    if (timeMatches.length > 1) {
      entry.picTime = parseFloat(timeMatches[1][1]);
    }
    if (timeMatches.length > 2) {
      entry.dualTime = parseFloat(timeMatches[2][1]);
    }
  }
  
  // Landing detection
  const landingPatterns = [
    /\b(\d{1,2})\s*(?:landing|ldg|land)/i,
    /(?:landing|ldg|land)\s*[:=]?\s*(\d{1,2})/i,
  ];
  
  for (const pattern of landingPatterns) {
    const landingMatch = cleanLine.match(pattern);
    if (landingMatch) {
      const landingCount = parseInt(landingMatch[1]);
      if (landingCount >= 1 && landingCount <= 50) {
        entry.landings = landingCount;
        break;
      }
    }
  }
  
  return Object.keys(entry).length > 0 ? entry : null;
}