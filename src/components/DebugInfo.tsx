'use client';

import { awsConfig, validateAwsConfig } from '@/lib/aws-config';

export default function DebugInfo() {
  // Force validation check
  const isConfigured = validateAwsConfig();
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg text-sm">
      <h3 className="font-bold mb-2">Debug Information</h3>
      
      <div className="space-y-1">
        <div>AWS Config Valid: {isConfigured ? 'YES' : 'NO'}</div>
        <div>Access Key Available: {awsConfig.accessKeyId ? 'YES' : 'NO'}</div>  
        <div>Secret Key Available: {awsConfig.secretAccessKey ? 'YES' : 'NO'}</div>
        <div>Region: {awsConfig.region}</div>
        
        {/* Show actual values (first few chars only for security) */}
        <div className="text-xs text-gray-600 mt-2">
          <div>Access Key: {awsConfig.accessKeyId ? `${awsConfig.accessKeyId.substring(0, 8)}...` : 'undefined'}</div>
          <div>Secret Key: {awsConfig.secretAccessKey ? `${awsConfig.secretAccessKey.substring(0, 8)}...` : 'undefined'}</div>
          <div>Region: {awsConfig.region}</div>
        </div>
        
        {/* Show all environment variables starting with NEXT_PUBLIC_ */}
        <div className="mt-4">
          <div className="font-semibold">All NEXT_PUBLIC_ Environment Variables:</div>
          <div className="text-xs">
            {Object.entries(process.env)
              .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
              .map(([key, value]) => (
                <div key={key}>{key}: {value ? 'SET' : 'NOT SET'}</div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
