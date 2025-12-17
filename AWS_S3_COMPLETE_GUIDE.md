# 🪣 AWS S3 Complete Setup & Usage Guide

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [AWS Setup](#aws-setup)
3. [Configuration](#configuration)
4. [Usage Examples](#usage-examples)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Get AWS Credentials

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Click **IAM** → **Users** → **Create User**
3. Name: `clickera-s3-user`
4. Attach policy: **AmazonS3FullAccess**
5. Create **Access Keys**
6. Copy: **Access Key ID** and **Secret Access Key**

### Step 2: Create S3 Bucket

1. Go to **S3** in AWS Console
2. Click **Create Bucket**
3. Name: `clickera-media` (must be unique)
4. Region: `us-east-1`
5. Click **Create**

### Step 3: Configure .env

Edit `.env` file:

```env
AWS_S3_ENABLED=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=clickera-media
```

### Step 4: Restart Application

```bash
docker-compose down
docker-compose up -d
```

---

## 🔧 AWS Setup Details

### Create IAM User

```bash
# AWS CLI (optional)
aws iam create-user --user-name clickera-s3-user
aws iam attach-user-policy --user-name clickera-s3-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam create-access-key --user-name clickera-s3-user
```

### S3 Bucket Policy (Optional)

For public access to videos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::clickera-media/videos/*"
    }
  ]
}
```

---

## ⚙️ Configuration

| Variable | Value | Example |
|----------|-------|---------|
| `AWS_S3_ENABLED` | true/false | `true` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Your access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Your secret key | `wJal...` |
| `AWS_S3_BUCKET` | Bucket name | `clickera-media` |

---

## 💻 Usage Examples

### Upload Video via API

```bash
curl -X POST http://localhost:3000/api/video/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@video.mp4" \
  -F "title=My Video" \
  -F "quality=high"
```

### Upload via Code

```typescript
import storageService from './services/StorageService';

const result = await storageService.upload(buffer, {
  folder: 'videos',
  filename: 'my-video.mp4',
  contentType: 'video/mp4',
  isPublic: true
});

console.log(result.url);  // S3 URL
```

### Get Signed URL (Private Files)

```typescript
const signedUrl = await storageService.getSignedUrl(
  'videos/private-video.mp4',
  3600  // 1 hour
);
```

### Delete File

```typescript
await storageService.delete('videos/my-video.mp4');
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload fails | Check AWS credentials in `.env` |
| Access denied | Verify IAM user has S3 permissions |
| Bucket not found | Check bucket name and region |
| Signed URL expires | Default: 1 hour, customize as needed |

---

## 📊 Monitoring

Check logs:

```bash
docker logs content-hub-app | grep -i "s3\|storage"
```

---

**Status**: ✅ Ready to configure  
**Last Updated**: 2025-11-29

