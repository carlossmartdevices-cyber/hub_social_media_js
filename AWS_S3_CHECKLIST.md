# ✅ AWS S3 Setup Checklist

## Phase 1: AWS Account Setup

- [ ] Go to [aws.amazon.com](https://aws.amazon.com)
- [ ] Click "Create AWS Account"
- [ ] Enter email address
- [ ] Create password
- [ ] Verify email
- [ ] Add payment method
- [ ] Complete account setup

**Time**: 10 minutes

---

## Phase 2: Get AWS Credentials

- [ ] Go to AWS Console
- [ ] Navigate to **IAM** service
- [ ] Click **Users** in left menu
- [ ] Click **Create User**
- [ ] Enter username: `clickera-s3-user`
- [ ] Click **Next**
- [ ] Click **Attach policies directly**
- [ ] Search for `AmazonS3FullAccess`
- [ ] Check the box
- [ ] Click **Next** → **Create user**
- [ ] Click on the new user
- [ ] Go to **Security credentials** tab
- [ ] Click **Create access key**
- [ ] Select **Application running outside AWS**
- [ ] Click **Next**
- [ ] Click **Create access key**
- [ ] **Copy Access Key ID** (save it!)
- [ ] **Copy Secret Access Key** (save it!)
- [ ] Click **Done**

**Time**: 5 minutes

---

## Phase 3: Create S3 Bucket

- [ ] Go to **S3** service in AWS Console
- [ ] Click **Create Bucket**
- [ ] Enter bucket name: `clickera-media`
- [ ] Select region: `us-east-1`
- [ ] Click **Create Bucket**
- [ ] Bucket created! ✅

**Time**: 2 minutes

---

## Phase 4: Update Configuration

- [ ] Open `.env` file in project
- [ ] Find AWS S3 section
- [ ] Set `AWS_S3_ENABLED=true`
- [ ] Set `AWS_REGION=us-east-1`
- [ ] Paste `AWS_ACCESS_KEY_ID=AKIA...`
- [ ] Paste `AWS_SECRET_ACCESS_KEY=wJal...`
- [ ] Set `AWS_S3_BUCKET=clickera-media`
- [ ] Save `.env` file

**Time**: 2 minutes

---

## Phase 5: Restart Application

- [ ] Open terminal
- [ ] Navigate to project: `cd /root/hub_social_media_js`
- [ ] Stop containers: `docker-compose down`
- [ ] Wait 5 seconds
- [ ] Start containers: `docker-compose up -d`
- [ ] Wait 30 seconds for startup

**Time**: 1 minute

---

## Phase 6: Verify Setup

- [ ] Check logs: `docker logs content-hub-app | grep -i "storage\|s3"`
- [ ] Should see: "StorageService initialized with AWS S3"
- [ ] Go to http://localhost:3002
- [ ] Login to app
- [ ] Upload a test video
- [ ] Check if upload succeeds
- [ ] Video should be in S3 bucket

**Time**: 5 minutes

---

## Phase 7: Test Features

- [ ] Upload public video
- [ ] Upload private video
- [ ] Generate signed URL
- [ ] Delete a video
- [ ] Check S3 bucket in AWS Console
- [ ] Verify files are there

**Time**: 10 minutes

---

## Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | AWS Account | 10 min | ⬜ |
| 2 | Get Credentials | 5 min | ⬜ |
| 3 | Create Bucket | 2 min | ⬜ |
| 4 | Update Config | 2 min | ⬜ |
| 5 | Restart App | 1 min | ⬜ |
| 6 | Verify Setup | 5 min | ⬜ |
| 7 | Test Features | 10 min | ⬜ |
| **TOTAL** | | **35 min** | |

---

## Troubleshooting

### Stuck on Phase 1?
- Check email for AWS verification link
- Try different browser
- Clear browser cache

### Stuck on Phase 2?
- Make sure you're in IAM service
- Check that user was created
- Verify access keys were generated

### Stuck on Phase 3?
- Bucket name must be unique globally
- Try different name if taken
- Check region is us-east-1

### Stuck on Phase 4?
- Make sure `.env` file is saved
- Check for typos in credentials
- Verify bucket name matches

### Stuck on Phase 5?
- Wait 30 seconds for containers to start
- Check: `docker ps` to see running containers
- Check logs: `docker logs content-hub-app`

### Stuck on Phase 6?
- Check credentials are correct
- Verify bucket exists in AWS
- Check IAM permissions

### Stuck on Phase 7?
- Check S3 bucket in AWS Console
- Verify files are being uploaded
- Check application logs

---

## ✅ All Done!

Once all phases are complete:
- ✅ AWS S3 is configured
- ✅ Videos upload to cloud
- ✅ Automatic fallback to local storage
- ✅ Signed URLs for private files
- ✅ Ready for production!

---

**Estimated Total Time**: 35 minutes  
**Difficulty**: Easy  
**Support**: See documentation files

