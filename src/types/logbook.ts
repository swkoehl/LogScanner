// Data types for LogScanner MVP

export interface FlightLogEntry {
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

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox: number[];
}

export interface OCRResponse {
  results: OCRResult[];
  rawText: string;
  processing: boolean;
  error?: string;
  structuredData?: unknown; // Azure/AWS OCR structured response with bounding boxes
}

export interface CameraCapture {
  imageData: string;      // Base64 encoded image
  timestamp: number;
  quality: number;        // 0-1
}
