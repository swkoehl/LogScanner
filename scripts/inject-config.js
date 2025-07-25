#!/usr/bin/env node

/**
 * This script injects OCR provider credentials into the build at build time
 * It reads from environment variables and writes to config files
 */

const fs = require('fs');
const path = require('path');

// Check OCR provider
const ocrProvider = process.env.NEXT_PUBLIC_OCR_PROVIDER || 'aws';

console.log('🔧 Injecting OCR configuration...');
console.log('OCR Provider:', ocrProvider);

// Azure configuration
const azureEndpoint = process.env.NEXT_PUBLIC_AZURE_COMPUTER_VISION_ENDPOINT;
const azureKey = process.env.NEXT_PUBLIC_AZURE_COMPUTER_VISION_KEY;

// AWS configuration
const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION;
const awsAccessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

console.log('Azure - Endpoint available:', !!azureEndpoint);
console.log('Azure - Key available:', !!azureKey);
console.log('AWS - Region available:', !!awsRegion);
console.log('AWS - Access Key available:', !!awsAccessKeyId);
console.log('AWS - Secret Key available:', !!awsSecretAccessKey);

// Check if at least one provider is configured
const azureConfigured = azureEndpoint && azureKey;
const awsConfigured = awsRegion && awsAccessKeyId && awsSecretAccessKey;

if (!azureConfigured && !awsConfigured) {
  console.error('❌ No OCR provider credentials found in environment variables');
  console.error('Please configure either AWS Textract or Azure Computer Vision');
  process.exit(1);
}

// Check if the selected provider is configured
if (ocrProvider === 'azure' && !azureConfigured) {
  console.error('❌ Azure OCR provider selected but credentials missing');
  console.error('NEXT_PUBLIC_AZURE_COMPUTER_VISION_ENDPOINT:', !!azureEndpoint);
  console.error('NEXT_PUBLIC_AZURE_COMPUTER_VISION_KEY:', !!azureKey);
  process.exit(1);
}

if (ocrProvider === 'aws' && !awsConfigured) {
  console.error('❌ AWS OCR provider selected but credentials missing');
  console.error('NEXT_PUBLIC_AWS_REGION:', !!awsRegion);
  console.error('NEXT_PUBLIC_AWS_ACCESS_KEY_ID:', !!awsAccessKeyId);
  console.error('NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY:', !!awsSecretAccessKey);
  process.exit(1);
}

// Create configuration objects
const config = {
  ocrProvider,
  injectedAt: new Date().toISOString(),
  source: 'build-time-injection'
};

// Add Azure config if available
if (azureConfigured) {
  config.azure = {
    endpoint: azureEndpoint,
    key: azureKey
  };
}

// Add AWS config if available
if (awsConfigured) {
  config.aws = {
    region: awsRegion,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  };
}

// Write config file (maintaining backward compatibility with azure-credentials.json)
const configPath = path.join(__dirname, '../src/lib/azure-credentials.json');
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('✅ OCR configuration injected successfully');
console.log('Active provider:', ocrProvider);
console.log('Config written to:', configPath);
