// AWS configuration for LogScanner using Textract
// This file handles AWS credentials and region configuration

let credentials: { accessKeyId: string; secretAccessKey: string; region: string } | null = null;

// Try to load credentials from build-time injected file
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  credentials = require('./aws-credentials.json');
  console.log('✅ Loaded AWS credentials from build-time injection');
} catch (error) {
  console.warn('⚠️ Could not load build-time credentials, falling back to env vars');
  console.warn('Error:', (error as Error).message);
}

// Fallback to environment variables if injection failed
const fallbackAccessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
const fallbackSecretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
const fallbackRegion = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';

export const awsConfig = {
  accessKeyId: credentials?.accessKeyId || fallbackAccessKeyId,
  secretAccessKey: credentials?.secretAccessKey || fallbackSecretAccessKey,
  region: credentials?.region || fallbackRegion,
} as const;

// Validation function
export function validateAwsConfig() {
  console.log('AWS config check:', {
    hasAccessKeyId: !!awsConfig.accessKeyId,
    hasSecretAccessKey: !!awsConfig.secretAccessKey,
    region: awsConfig.region,
    accessKeyIdLength: awsConfig.accessKeyId?.length || 0,
    secretKeyLength: awsConfig.secretAccessKey?.length || 0,
    source: credentials ? 'build-time-injection' : 'environment-variables',
    credentialsLoaded: !!credentials,
    envVarsAvailable: {
      accessKeyId: !!fallbackAccessKeyId,
      secretAccessKey: !!fallbackSecretAccessKey,
      region: !!fallbackRegion
    }
  });

  // Return false if credentials are missing - this will prevent API calls
  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
    console.error(`Missing AWS credentials. AccessKeyId: ${!!awsConfig.accessKeyId}, SecretAccessKey: ${!!awsConfig.secretAccessKey}`);
    return false;
  }

  if (!awsConfig.region) {
    console.warn(`No AWS region specified, using default: us-east-1`);
  }

  return true;
}