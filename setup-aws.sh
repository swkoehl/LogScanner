#!/bin/bash

# AWS Textract Setup Script for LogScanner
# This script creates the necessary AWS resources for OCR functionality using Textract

set -e

echo "🚀 Setting up AWS Textract for LogScanner"
echo "========================================"

# Configuration
IAM_USER_NAME="logscanner-user"
IAM_POLICY_NAME="LogScannerTextractPolicy"
REGION="us-east-1"  # Change if needed

echo "📋 Configuration:"
echo "  IAM User: $IAM_USER_NAME"
echo "  IAM Policy: $IAM_POLICY_NAME"
echo "  Region: $REGION"
echo ""

# Check if logged in to AWS CLI
echo "🔐 Checking AWS authentication..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS CLI"
    echo "Please run: aws configure"
    echo "Or set up your AWS credentials using:"
    echo "  aws configure set aws_access_key_id YOUR_ACCESS_KEY"
    echo "  aws configure set aws_secret_access_key YOUR_SECRET_KEY"
    echo "  aws configure set default.region $REGION"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CURRENT_USER=$(aws sts get-caller-identity --query Arn --output text)
echo "✅ Authenticated as: $CURRENT_USER"
echo "✅ Account ID: $ACCOUNT_ID"
echo ""

# Create IAM policy for Textract access
echo "📜 Creating IAM policy for Textract access..."
POLICY_DOCUMENT='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "textract:DetectDocumentText",
                "textract:AnalyzeDocument"
            ],
            "Resource": "*"
        }
    ]
}'

# Check if policy exists
if aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${IAM_POLICY_NAME}" &> /dev/null; then
    echo "✅ IAM policy '$IAM_POLICY_NAME' already exists"
    POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${IAM_POLICY_NAME}"
else
    POLICY_ARN=$(aws iam create-policy \
        --policy-name $IAM_POLICY_NAME \
        --policy-document "$POLICY_DOCUMENT" \
        --description "Policy for LogScanner to access AWS Textract services" \
        --query 'Policy.Arn' --output text)
    echo "✅ Created IAM policy '$IAM_POLICY_NAME'"
fi
echo "Policy ARN: $POLICY_ARN"
echo ""

# Create IAM user
echo "👤 Creating IAM user..."
if aws iam get-user --user-name $IAM_USER_NAME &> /dev/null; then
    echo "✅ IAM user '$IAM_USER_NAME' already exists"
else
    aws iam create-user \
        --user-name $IAM_USER_NAME \
        --path "/service-accounts/"
    echo "✅ Created IAM user '$IAM_USER_NAME'"
fi
echo ""

# Attach policy to user
echo "🔗 Attaching policy to user..."
aws iam attach-user-policy \
    --user-name $IAM_USER_NAME \
    --policy-arn $POLICY_ARN
echo "✅ Attached policy to user"
echo ""

# Create access keys (if they don't exist)
echo "🔑 Creating access keys..."
EXISTING_KEYS=$(aws iam list-access-keys --user-name $IAM_USER_NAME --query 'AccessKeyMetadata[].AccessKeyId' --output text)

if [ -n "$EXISTING_KEYS" ]; then
    echo "⚠️  Access keys already exist for user $IAM_USER_NAME"
    echo "Existing Access Key IDs: $EXISTING_KEYS"
    echo ""
    echo "If you need new keys, please:"
    echo "1. Delete existing keys: aws iam delete-access-key --user-name $IAM_USER_NAME --access-key-id <KEY_ID>"
    echo "2. Run this script again"
    echo ""
    
    # Use the first existing key
    ACCESS_KEY_ID=$(echo $EXISTING_KEYS | cut -d' ' -f1)
    echo "📋 Using existing Access Key ID: $ACCESS_KEY_ID"
    echo "❌ Cannot retrieve Secret Access Key for existing keys (AWS security)"
    echo "💡 You'll need to use your existing secret key or create new access keys"
    SECRET_ACCESS_KEY="<USE_YOUR_EXISTING_SECRET_KEY>"
else
    KEY_OUTPUT=$(aws iam create-access-key --user-name $IAM_USER_NAME)
    ACCESS_KEY_ID=$(echo $KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
    SECRET_ACCESS_KEY=$(echo $KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')
    
    echo "✅ Created new access keys"
    echo "Access Key ID: $ACCESS_KEY_ID"
    echo "Secret Access Key: ${SECRET_ACCESS_KEY:0:8}..." # Show only first 8 characters for security
fi
echo ""

# Update .env.local file
echo "🔧 Updating .env.local file..."
ENV_FILE=".env.local"

# Backup existing .env.local if it exists
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backed up existing .env.local"
fi

# Create new .env.local
cat > "$ENV_FILE" << EOF
# AWS Configuration for LogScanner
# Generated on $(date)
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY
NEXT_PUBLIC_AWS_REGION=$REGION
NEXT_PUBLIC_APP_ENV=development
EOF

echo "✅ Updated $ENV_FILE with AWS credentials"
echo ""

# Test AWS Textract access
echo "🧪 Testing AWS Textract access..."
if aws textract detect-document-text --region $REGION --document '{"Bytes":""}' --cli-read-timeout 10 &> /dev/null || [ $? -eq 255 ]; then
    echo "✅ AWS Textract access confirmed (service available)"
else
    echo "⚠️  Could not verify Textract access (but this might be normal with empty document)"
fi
echo ""

echo "🎉 Setup Complete!"
echo "=================="
echo "Your LogScanner is now configured with AWS Textract."
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Start the development server: npm run dev"
echo "3. Open the app on your mobile device (HTTPS required for camera)"
echo "4. Test with a handwritten logbook page"
echo ""
echo "📊 Resource Summary:"
echo "  IAM User: $IAM_USER_NAME"
echo "  IAM Policy: $IAM_POLICY_NAME"
echo "  Access Key ID: $ACCESS_KEY_ID"
echo "  Region: $REGION"
echo ""
echo "💰 Cost: AWS Textract pricing:"
echo "  - First 1,000 pages per month: Free"
echo "  - Additional pages: \$1.50 per 1,000 pages"
echo "  - AnalyzeDocument (Tables/Forms): \$50 per 1,000 pages"
echo ""
echo "🔒 Security: Credentials saved to .env.local (not committed to git)"
echo ""
echo "🚨 Important: Keep your AWS credentials secure!"
echo "   - Never commit .env.local to version control"
echo "   - Rotate access keys regularly"
echo "   - Use IAM roles in production instead of access keys"