/*
 * AWS Credentials Injection Script for LogScanner
 * This script injects AWS credentials into the build at build time
 * for static deployment (e.g., AWS S3 + CloudFront)
 */

const fs = require('fs');
const path = require('path');

const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

console.log('🔧 Injecting AWS configuration...');
console.log('Access Key ID:', !!accessKeyId);
console.log('Secret Access Key:', !!secretAccessKey);
console.log('Region:', region);

if (!accessKeyId || !secretAccessKey) {
  console.error('❌ Missing AWS credentials in environment variables');
  console.error('NEXT_PUBLIC_AWS_ACCESS_KEY_ID:', !!accessKeyId);
  console.error('NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY:', !!secretAccessKey);
  console.error('NEXT_PUBLIC_AWS_REGION:', !!region);
  console.error('');
  console.error('Please set the following environment variables:');
  console.error('  NEXT_PUBLIC_AWS_ACCESS_KEY_ID');
  console.error('  NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY');
  console.error('  NEXT_PUBLIC_AWS_REGION (optional, defaults to us-east-1)');
  process.exit(1);
}

// Create credentials object
const credentials = {
  accessKeyId,
  secretAccessKey,
  region
};

// Write to aws-credentials.json
const configPath = path.join(__dirname, '../src/lib/aws-credentials.json');
fs.writeFileSync(configPath, JSON.stringify(credentials, null, 2));

console.log('✅ AWS configuration injected successfully');
console.log('📁 Config written to:', configPath);
