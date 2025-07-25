'use client';

import { useState } from 'react';
import { Camera, FileText, Download, Plane } from 'lucide-react';
import CameraCapture from '@/components/camera/CameraCapture';
import DataReview from '@/components/data-review/DataReview';
import MobileShare from '@/components/mobile-share/MobileShare';
import type { FlightLogEntry } from '@/types/logbook';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'capture' | 'review' | 'export'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<FlightLogEntry[]>([]);
  
  // Get the current URL for mobile sharing
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const handleImageCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setCurrentStep('review');
  };

  const handleDataConfirm = (data: FlightLogEntry[]) => {
    setExtractedData(data);
    setCurrentStep('export');
  };

  const resetFlow = () => {
    setCurrentStep('capture');
    setCapturedImage(null);
    setExtractedData([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3 text-blue-600">
          <Plane className="h-10 w-10" />
          <h1 className="text-4xl font-bold">LogScanner</h1>
        </div>
        <p className="text-gray-800 text-lg font-semibold">
          Convert handwritten logbooks to ForeFlight CSV
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center space-x-4">
        {[
          { key: 'capture', icon: Camera, label: 'Capture' },
          { key: 'review', icon: FileText, label: 'Review' },
          { key: 'export', icon: Download, label: 'Export' },
        ].map(({ key, icon: Icon, label }) => (
          <div
            key={key}
            className={`flex flex-col items-center space-y-1 ${
              currentStep === key
                ? 'text-blue-600'
                : key === 'review' && currentStep === 'export'
                ? 'text-green-600'
                : key === 'capture' && (currentStep === 'review' || currentStep === 'export')
                ? 'text-green-600'
                : 'text-gray-400'
            }`}
          >
            <div
              className={`p-3 rounded-full border-2 ${
                currentStep === key
                  ? 'border-blue-600 bg-blue-50'
                  : key === 'review' && currentStep === 'export'
                  ? 'border-green-600 bg-green-50'
                  : key === 'capture' && (currentStep === 'review' || currentStep === 'export')
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {currentStep === 'capture' && (
          <CameraCapture onImageCapture={handleImageCapture} />
        )}

        {currentStep === 'review' && capturedImage && (
          <DataReview
            imageData={capturedImage}
            onDataConfirm={handleDataConfirm}
            onBack={() => setCurrentStep('capture')}
          />
        )}

        {currentStep === 'export' && extractedData.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">Export Complete!</h2>
            <p className="text-gray-600 text-center text-sm">
              Your logbook data has been processed and is ready for download.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => {
                  // CSV download is handled in DataReview component
                  console.log('Download CSV', extractedData);
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Download CSV for ForeFlight
              </button>
              <button
                onClick={resetFlow}
                className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Scan Another Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500">
        <p>Secure processing • No data stored • Privacy first</p>
      </div>

      {/* Mobile Share Component */}
      <MobileShare appUrl={appUrl} />
    </div>
  );
}
