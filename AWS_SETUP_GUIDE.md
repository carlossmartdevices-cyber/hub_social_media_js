# AWS Configuration Guide for pnptv.app

## 📋 Overview

This guide explains what AWS resources you need and how to configure them for the adult content video hosting system.

---

## ✅ Confirmed AWS Resources

Based on your AWS account:

- **Region:** `us-east-2` (US East - Ohio)
- **S3 Bucket:** `pnptv-previews` (ARN: `arn:aws:s3:::pnptv-previews`)
- **KMS Key:** Already created (alias: `media-x`)

---

## 🔐 Step 1: Get Your AWS Credentials

You need to create an IAM user with programmatic access:

### **Create IAM User:**

1. Go to **AWS Console** → **IAM** → **Users** → **Create User**
2. User name: `pnptv-api-user` (or any name you prefer)
3. Select: **Programmatic access** (for Access Key ID and Secret)
4. Click **Next: Permissions**

### **Attach Policies:**

Attach these policies to the user:

1. **AmazonS3FullAccess** (for S3 uploads)
   - OR create a custom policy limited to your bucket only (more secure)

2. **Custom KMS Policy** - Create inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "kms:Encrypt",
           "kms:Decrypt",
           "kms:GenerateDataKey",
           "kms:DescribeKey"
         ],
         "Resource": "arn:aws:kms:us-east-2:YOUR_ACCOUNT_ID:key/*"
       }
     ]
   }
   ```

### **Get Credentials:**

After creating the user:
1. Download the **Access Key ID** and **Secret Access Key**
2. **IMPORTANT:** This is the ONLY time you can see the Secret Key
3. Save them securely (we'll add them to `.env` later)

---

## 📦 Step 2: Configure S3 Bucket

Your bucket `pnptv-previews` already exists. Configure it:

### **Bucket Settings:**

1. **Region:** `us-east-2` ✅ (already correct)
2. **Public Access:**
   - Go to **Permissions** → **Block public access** → **Edit**
   - Uncheck "Block all public access" (we need public read for CDN)
   - Confirm the warning

3. **Bucket Policy:**
   - Go to **Permissions** → **Bucket Policy**
   - Paste this policy (replace YOUR_ACCOUNT_ID):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::pnptv-previews/*"
       }
     ]
   }
   ```

4. **CORS Configuration:**
   - Go to **Permissions** → **CORS**
   - Paste this configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://pnptv.app", "http://localhost:*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

5. **Default Encryption:**
   - Go to **Properties** → **Default encryption**
   - Enable: **Server-side encryption with AWS KMS**
   - Select your KMS key: `media-x`
   - Save changes

---

## 🔑 Step 3: Get KMS Key ARN

1. Go to **AWS Console** → **KMS** (Key Management Service)
2. Find your key with alias: `media-x`
3. Click on the key
4. Copy the **ARN** (format: `arn:aws:kms:us-east-2:ACCOUNT_ID:key/KEY_ID`)
5. Save this ARN - you'll need it for `.env`

---

## 🌐 Step 4: CloudFront Setup (Optional but Recommended)

CloudFront provides fast CDN distribution for your videos.

### **Create CloudFront Distribution:**

1. Go to **CloudFront** → **Create Distribution**
2. **Origin Domain:** Select `pnptv-previews.s3.us-east-2.amazonaws.com`
3. **Origin Path:** Leave empty
4. **Viewer Protocol Policy:** Redirect HTTP to HTTPS
5. **Allowed HTTP Methods:** GET, HEAD, OPTIONS
6. **Cache Policy:** CachingOptimized
7. **Alternate Domain Names (CNAMEs):** `previews.pnptv.app`
8. **SSL Certificate:**
   - Request certificate in AWS Certificate Manager (ACM)
   - OR use CloudFront default certificate
9. **Default Root Object:** Leave empty
10. Click **Create Distribution**

### **Get CloudFront Domain:**

After creation, you'll get a domain like: `d1234abcd5678.cloudfront.net`

### **Update DNS:**

In your DNS provider (where pnptv.app domain is hosted):
1. Create CNAME record:
   - Name: `previews`
   - Value: `d1234abcd5678.cloudfront.net` (your CloudFront domain)
   - TTL: 300

---

## ⚙️ Step 5: Configure Your `.env` File

Now that you have all the information, update your `.env` file:

```env
# ============================================
# AWS S3 CONFIGURATION
# ============================================

# AWS Region (Ohio)
AWS_REGION=us-east-2

# AWS Credentials (from IAM user you created)
AWS_ACCESS_KEY_ID=AKIA...your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# S3 Bucket
AWS_S3_BUCKET=pnptv-previews

# CloudFront Domain (if you set it up)
# Option 1: CloudFront domain
CLOUDFRONT_DOMAIN=d1234abcd5678.cloudfront.net
# Option 2: Custom domain (after DNS is configured)
# CLOUDFRONT_DOMAIN=previews.pnptv.app

# KMS Encryption (from Step 3)
AWS_KMS_KEY_ARN=arn:aws:kms:us-east-2:YOUR_ACCOUNT:key/YOUR_KEY_ID

# Video Directories (local storage before S3 upload)
VIDEO_UPLOAD_DIR=./uploads/videos
THUMBNAIL_DIR=./uploads/thumbnails
```

---

## ✅ Step 6: Verify Configuration

Test that everything works:

```bash
# Start your application
npm run dev

# Test S3 upload (from another terminal)
curl -X POST http://localhost:33010/api/video/upload \
  -F "video=@test_video.mp4"
```

Check AWS Console:
1. Go to S3 → `pnptv-previews` → Should see uploaded video
2. Click on video → **Properties** → **Encryption** → Should show "AWS-KMS"
3. Access the video URL in browser → Should load

---

## 🔒 Security Best Practices

### **DO:**
- ✅ Use IAM users with limited permissions (least privilege)
- ✅ Enable MFA on your AWS account
- ✅ Rotate access keys regularly (every 90 days)
- ✅ Use KMS encryption for adult content
- ✅ Monitor S3 access logs
- ✅ Use CloudFront with HTTPS only

### **DON'T:**
- ❌ Never commit AWS credentials to Git
- ❌ Never share your Secret Access Key
- ❌ Never use root AWS account credentials
- ❌ Never disable KMS encryption for adult content
- ❌ Never allow public write access to S3 bucket

---

## 📊 Cost Estimate

Approximate monthly costs for 1000 videos (15-45s each, ~50MB average):

- **S3 Storage:** ~$1.15/month (50GB at $0.023/GB)
- **S3 Requests:** ~$0.50/month (10,000 PUT requests)
- **KMS:** ~$1.00/month (1 key) + $0.03 per 10,000 requests
- **CloudFront:** ~$8.50/month (100GB transfer)
- **Total:** ~$11-15/month

For higher traffic, costs scale accordingly.

---

## 🆘 Troubleshooting

### **Error: Access Denied**
- Check IAM user has correct S3 and KMS permissions
- Verify bucket policy allows public read
- Confirm KMS key policy allows your IAM user to use it

### **Error: Invalid KMS Key**
- Ensure KMS key is in same region as S3 bucket (us-east-2)
- Verify KMS key ARN is correct in `.env`
- Check IAM user has `kms:Encrypt` permission

### **Videos not loading from CloudFront**
- Wait 15-30 minutes for CloudFront distribution to deploy
- Check CNAME is correctly configured in DNS
- Verify SSL certificate is validated

### **CORS errors**
- Add your domain to S3 CORS configuration
- Ensure CloudFront is forwarding OPTIONS requests

---

## 📞 Need Help?

- **AWS Documentation:** https://docs.aws.amazon.com/s3/
- **CloudFront Guide:** https://docs.aws.amazon.com/cloudfront/
- **KMS Documentation:** https://docs.aws.amazon.com/kms/
- **Check application logs:** `tail -f logs/application.log`

---

## ✨ Summary

**What you need to configure:**

1. ✅ Create IAM user with S3 and KMS permissions
2. ✅ Configure S3 bucket `pnptv-previews` (public read, CORS, encryption)
3. ✅ Get KMS key ARN for `media-x`
4. ⏳ (Optional) Set up CloudFront for `previews.pnptv.app`
5. ✅ Update `.env` with all credentials

**After configuration:**
- Videos will automatically upload to S3 with KMS encryption
- Accessible at: `https://previews.pnptv.app/videos/filename.mp4`
- Secure, fast, and scalable for adult content hosting

**Security:** All credentials stay in your `.env` file (never committed to Git).
