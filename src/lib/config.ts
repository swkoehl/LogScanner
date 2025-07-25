// Configuration for LogScanner using AWS Textract
// Validates environment variables at runtime

export const config = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  },
  app: {
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  }
} as const;

// Runtime validation
export function validateConfig() {
  console.log('Environment check:', {
    serverAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT_SET',
    publicAccessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ? 'SET' : 'NOT_SET',
    serverSecretKey: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT_SET',
    publicSecretKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT_SET',
    finalAccessKeyId: config.aws.accessKeyId ? 'SET' : 'NOT_SET',
    finalSecretKey: config.aws.secretAccessKey ? 'SET' : 'NOT_SET',
    region: config.aws.region,
    allEnvKeys: typeof window === 'undefined' ? Object.keys(process.env).filter(k => k.includes('AWS')) : 'CLIENT_SIDE'
  });

  if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
    console.error('AWS credentials missing:', {
      accessKeyId: !!config.aws.accessKeyId,
      secretAccessKey: !!config.aws.secretAccessKey,
      region: config.aws.region
    });
    throw new Error('Missing AWS credentials. Please check your environment variables.');
  }
  
  if (!config.aws.region) {
    console.warn('AWS region not specified, using default: us-east-1');
  }
  
  return true;
}

// Export for client-side usage (without sensitive data)
export const clientConfig = {
  app: config.app,
} as const;
