'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Download, Loader2 } from 'lucide-react';
import { processImageOCR, parseLogbookData } from '@/lib/aws-textract';
import { generateCSV, downloadCSV, validateLogbookEntries } from '@/lib/csv-export';
import type { FlightLogEntry } from '@/types/logbook';

interface DataReviewProps {
  imageData: string;
  onDataConfirm: (data: FlightLogEntry[]) => void;
  onBack: () => void;
}

export default function DataReview({ imageData, onDataConfirm, onBack }: DataReviewProps) {
  const [extractedData, setExtractedData] = useState<FlightLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const ocrResult = await processImageOCR(imageData);
      
      if (ocrResult.error) {
        setError(ocrResult.error);
        return;
      }

      const parsedData = parseLogbookData(ocrResult.rawText, ocrResult.structuredData);
      const entriesWithIds = parsedData.map((entry, index) => ({
        id: `entry-${index}`,
        date: entry.date || '',
        aircraftId: entry.aircraftId || '',
        aircraftType: entry.aircraftType || '',
        route: entry.route || '',
        totalTime: entry.totalTime || 0,
        picTime: entry.picTime || 0,
        dualTime: entry.dualTime || 0,
        landings: entry.landings || 0,
        confidence: 0.8,
        ...entry,
      })) as FlightLogEntry[];

      setExtractedData(entriesWithIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [imageData]);

  useEffect(() => {
    processImage();
  }, [processImage]);

  const updateEntry = (index: number, field: keyof FlightLogEntry, value: string | number) => {
    const updatedData = [...extractedData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    setExtractedData(updatedData);
  };

  const removeEntry = (index: number) => {
    const updatedData = extractedData.filter((_, i) => i !== index);
    setExtractedData(updatedData);
  };

  const handleConfirm = () => {
    const validation = validateLogbookEntries(extractedData);
    if (!validation.valid) {
      setError(`Validation errors: ${validation.errors.join(', ')}`);
      return;
    }
    onDataConfirm(extractedData);
  };

  const handleDownload = () => {
    try {
      const csv = generateCSV(extractedData);
      downloadCSV(csv, `logbook-export-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  if (isProcessing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">Processing Image</h2>
        </div>
        
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Extracting text from your logbook page...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">Processing Error</h2>
        </div>
        
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">Processing Failed</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={onBack}
            className="mt-4 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack} 
            className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Review Extracted Data</h2>
            <p className="text-lg font-semibold text-gray-800">Edit any incorrect information before exporting</p>
          </div>
        </div>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          {extractedData.length} entries found
        </div>
      </div>

      {extractedData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No flight entries detected</h3>
          <p className="text-gray-600 mb-6">Try taking a clearer photo with better lighting, or ensure the logbook entries are clearly visible.</p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
          >
            Try Different Image
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {extractedData.map((entry, index) => (
              <div key={entry.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-800 text-lg">Flight Entry {index + 1}</h3>
                  <button
                    onClick={() => removeEntry(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-gray-900 font-bold text-xl mb-3">Date</label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(index, 'date', e.target.value)}
                      className="w-full p-5 border-3 border-gray-600 rounded-xl text-2xl text-gray-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-colors bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-900 font-bold text-xl mb-3">Aircraft ID</label>
                    <input
                      type="text"
                      value={entry.aircraftId}
                      onChange={(e) => updateEntry(index, 'aircraftId', e.target.value)}
                      className="w-full p-5 border-3 border-gray-600 rounded-xl text-2xl text-gray-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-colors bg-white"
                      placeholder="N12345"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-900 font-bold text-xl mb-3">Aircraft Type</label>
                    <input
                      type="text"
                      value={entry.aircraftType}
                      onChange={(e) => updateEntry(index, 'aircraftType', e.target.value)}
                      className="w-full p-5 border-3 border-gray-600 rounded-xl text-2xl text-gray-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-colors bg-white"
                      placeholder="C172, PA28, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-900 font-bold text-xl mb-3">Route</label>
                    <input
                      type="text"
                      value={entry.route}
                      onChange={(e) => updateEntry(index, 'route', e.target.value)}
                      className="w-full p-5 border-3 border-gray-600 rounded-xl text-2xl text-gray-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-colors bg-white"
                      placeholder="KPAO-KSQL"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-900 font-bold text-xl mb-3">Total Time (hours)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={entry.totalTime}
                      onChange={(e) => updateEntry(index, 'totalTime', parseFloat(e.target.value) || 0)}
                      className="w-full p-5 border-3 border-gray-600 rounded-xl text-2xl text-gray-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-colors bg-white"
                      placeholder="1.5"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-900 font-bold text-xl mb-3">Landings</label>
                    <input
                      type="number"
                      min="0"
                      value={entry.landings}
                      onChange={(e) => updateEntry(index, 'landings', parseInt(e.target.value) || 0)}
                      className="w-full p-5 border-3 border-gray-600 rounded-xl text-2xl text-gray-900 font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-colors bg-white"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={handleDownload}
              className="flex-1 bg-green-600 text-white py-4 px-6 rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Download className="h-5 w-5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              Confirm & Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}
