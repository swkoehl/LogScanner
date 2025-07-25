// Configuration for LogScanner MVP
// Validates environment variables at runtime

export const config = {
  azure: {
    endpoint: process.env.AZURE_COMPUTER_VISION_ENDPOINT || process.env.NEXT_PUBLIC_AZURE_COMPUTER_VISION_ENDPOINT,
    key: process.env.AZURE_COMPUTER_VISION_KEY || process.env.NEXT_PUBLIC_AZURE_COMPUTER_VISION_KEY,
  },
  aws: {
    region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
  app: {
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    ocrProvider: process.env.NEXT_PUBLIC_OCR_PROVIDER || 'aws', // Default to AWS
  }
} as const;

// Runtime validation
export function validateConfig() {
  const ocrProvider = config.app.ocrProvider;
  
  console.log('Environment check:', {
    ocrProvider,
    azure: {
      serverEndpoint: process.env.AZURE_COMPUTER_VISION_ENDPOINT,
      publicEndpoint: process.env.NEXT_PUBLIC_AZURE_COMPUTER_VISION_ENDPOINT,
      serverKey: process.env.AZURE_COMPUTER_VISION_KEY ? 'SET' : 'NOT_SET',
      publicKey: process.env.NEXT_PUBLIC_AZURE_COMPUTER_VISION_KEY ? 'SET' : 'NOT_SET',
      finalEndpoint: config.azure.endpoint,
      finalKey: config.azure.key ? 'SET' : 'NOT_SET',
    },
    aws: {
      region: config.aws.region,
      accessKeyId: config.aws.accessKeyId ? 'SET' : 'NOT_SET',
      secretAccessKey: config.aws.secretAccessKey ? 'SET' : 'NOT_SET',
    }
  });

  if (ocrProvider === 'azure') {
    if (!config.azure.endpoint || !config.azure.key) {
      console.error('Azure credentials missing:', {
        endpoint: !!config.azure.endpoint,
        key: !!config.azure.key
      });
      throw new Error('Missing Azure Computer Vision credentials. Please check your environment variables.');
    }
    
    if (!config.azure.endpoint.includes('api.cognitive.microsoft.com')) {
      console.error('Invalid endpoint format:', config.azure.endpoint);
      throw new Error('Invalid Azure Computer Vision endpoint format.');
    }
  } else if (ocrProvider === 'aws') {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      console.error('AWS credentials missing:', {
        accessKeyId: !!config.aws.accessKeyId,
        secretAccessKey: !!config.aws.secretAccessKey,
        region: config.aws.region
      });
      throw new Error('Missing AWS credentials. Please check your environment variables.');
    }
  } else {
    throw new Error(`Invalid OCR provider: ${ocrProvider}. Must be 'azure' or 'aws'.`);
  }
  
  return true;
}

// Export for client-side usage (without sensitive data)
export const clientConfig = {
  app: config.app,
} as const;
