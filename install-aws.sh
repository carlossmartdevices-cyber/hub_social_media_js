#!/bin/bash
echo "📦 Installing AWS SDK for S3..."
npm install --save @aws-sdk/client-s3
echo "✅ AWS SDK installed!"
echo "🔄 Building TypeScript..."
npm run build
echo "✅ Build complete!"
echo "🔄 Restarting server..."
pkill -f "node /root/hub_social_media_js/dist/index.js"
sleep 2
nohup npm start > /dev/null 2>&1 &
echo "✅ Server restarted!"
echo ""
echo "📋 Configuration steps:"
echo "1. Update .env with AWS credentials:"
echo "   AWS_ACCESS_KEY_ID=your_key"
echo "   AWS_SECRET_ACCESS_KEY=your_secret"
echo "   AWS_S3_BUCKET=your_bucket_name"
echo "   AWS_S3_ENABLED=true"
echo ""
echo "2. Update xAI API key in .env:"
echo "   XAI_API_KEY=your_xai_key"
echo "   XAI_ENABLED=true"
