'use client';

import { useState } from 'react';
import { Smartphone, Share, Copy, Check } from 'lucide-react';

interface MobileShareProps {
  appUrl: string;
}

export default function MobileShare({ appUrl }: MobileShareProps) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = appUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareToPhone = () => {
    const message = `Check out LogScanner on your iPhone: ${appUrl}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LogScanner - Pilot Logbook Converter',
          text: 'Convert handwritten pilot logbooks to digital format',
          url: appUrl,
        });
      } catch {
        console.log('Share cancelled or failed');
      }
    } else {
      handleCopyUrl();
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`;

  if (!showShare) {
    return (
      <button
        onClick={() => setShowShare(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Share for iPhone testing"
      >
        <Smartphone className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Test on iPhone</h3>
          <button
            onClick={() => setShowShare(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* QR Code */}
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="QR Code for LogScanner"
              className="mx-auto border rounded"
              width={200}
              height={200}
            />
            <p className="text-sm text-gray-600 mt-2">
              Scan with iPhone camera
            </p>
          </div>

          {/* URL Display */}
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-600 mb-2">App URL:</p>
            <p className="text-xs font-mono break-all">{appUrl}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleCopyUrl}
              className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : 'Copy URL'}</span>
            </button>

            <button
              onClick={handleShareToPhone}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
            >
              <Smartphone className="h-4 w-4" />
              <span>Send SMS</span>
            </button>

            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              <Share className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Open the URL on your iPhone</p>
            <p>• Add to Home Screen for best experience</p>
            <p>• Enable camera permissions when prompted</p>
          </div>
        </div>
      </div>
    </div>
  );
}