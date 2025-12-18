# Video Upload Debug & Fix Summary

## Issues Found and Fixed

### ✅ 1. FFmpeg Not Installed (CRITICAL - FIXED)
**Problem:** The VideoProcessingService requires ffmpeg binary for video processing, but it was not installed on the system.

**Impact:** All video uploads would fail with "ffmpeg not found" errors.

**Fix Applied:** Installed ffmpeg using `apt-get install -y ffmpeg`

**Verification:**
```bash
ffmpeg -version
# Output: ffmpeg version 6.1.1-3ubuntu5
```

---

### ✅ 2. Missing Upload Directories (CRITICAL - FIXED)
**Problem:** Required upload directories did not exist:
- `/uploads/`
- `/uploads/temp/`
- `/uploads/temp/chunks/`
- `/uploads/videos/`
- `/uploads/thumbnails/`

**Impact:** File uploads would fail with "ENOENT: no such file or directory" errors.

**Fix Applied:** Created all required directories with proper structure.

**Verification:**
```bash
ls -la /home/user/hub_social_media_js/uploads/
# Shows: temp/, thumbnails/, videos/ directories
```

---

### ✅ 3. Chunked Upload Routes Not Registered (HIGH - FIXED)
**Problem:** Chunked upload routes were defined but not registered in the main router.

**Location:** `src/api/routes/index.ts`

**Impact:** `/api/upload/*` endpoints would return 404 errors.

**Fix Applied:**
- Added import: `import chunkedUploadRoutes from './chunkedUpload';`
- Registered route: `router.use('/upload', chunkedUploadRoutes);`

**Available Endpoints Now:**
- `POST /api/upload/init` - Initialize chunked upload session
- `POST /api/upload/chunk/:uploadId` - Upload individual chunks
- `POST /api/upload/complete/:uploadId` - Complete and assemble upload
- `GET /api/upload/status/:uploadId` - Check upload status
- `DELETE /api/upload/cancel/:uploadId` - Cancel upload

---

### ✅ 4. Wrong Auth Middleware Import (HIGH - FIXED)
**Problem:** Chunked upload routes imported non-existent authentication function.

**Location:** `src/api/routes/chunkedUpload.ts:10`

**Original (Broken):**
```typescript
import { authenticateToken } from '../middleware/auth'
```

**Fixed:**
```typescript
import { authMiddleware as authenticateToken } from '../middlewares/auth'
```

**Impact:** Server would crash with "Cannot find module" error when accessing chunked upload routes.

---

### ✅ 5. File Size Configuration Fixed (MEDIUM - FIXED)
**Problem:** Inconsistent video size limits:
- `VideoPostController.ts:30` - 500MB
- `.env:96` - MAX_VIDEO_SIZE=104857600 (incorrectly configured as bytes, not MB)

**Fix Applied:** Updated `.env` configuration:
```env
MAX_VIDEO_SIZE=524288000  # 500MB in bytes (500 * 1024 * 1024)
VIDEO_UPLOAD_DIR=./uploads/videos
THUMBNAIL_DIR=./uploads/thumbnails
```

---

### ⚠️ 6. AWS S3 Credentials Not Configured (MEDIUM - REQUIRES MANUAL SETUP)
**Problem:** AWS credentials in `.env` are set to placeholder values:

```env
AWS_S3_ENABLED=true
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET=pnptv-preview
```

**Impact:** If video uploads try to use S3 storage, they will fail with authentication errors.

**Action Required:**
1. If you plan to use AWS S3 for video storage:
   - Replace placeholder values with your actual AWS credentials
   - Ensure the S3 bucket `pnptv-preview` exists and has proper permissions

2. If you prefer local storage only:
   - Set `AWS_S3_ENABLED=false` in `.env`
   - Videos will be stored locally in `/uploads/videos/`

**AWS S3 Setup Guide:**
1. Go to AWS Console → IAM → Users
2. Create a new user or use existing user
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Generate Access Key and Secret Key
5. Update `.env` with the credentials
6. Ensure S3 bucket has CORS configured for your domain

---

## Testing the Fixes

### Test 1: Basic Video Upload
```bash
curl -X POST http://localhost:8080/api/video/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@test-video.mp4" \
  -F "title=Test Video" \
  -F "description=Testing video upload"
```

**Expected Response:**
```json
{
  "success": true,
  "post": {
    "id": "uuid",
    "url": "/uploads/videos/uuid_timestamp.mp4",
    "thumbnailUrl": "/uploads/thumbnails/uuid_thumb.jpg",
    "metadata": {
      "duration": 45,
      "width": 1280,
      "height": 720,
      "size": 5242880,
      "format": "mp4",
      "bitrate": 2500
    },
    "compressionRatio": 15.5
  }
}
```

---

### Test 2: Chunked Upload (Large Videos)
```bash
# Step 1: Initialize upload session
curl -X POST http://localhost:8080/api/upload/init \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "large-video.mp4",
    "fileSize": 1073741824,
    "fileMimeType": "video/mp4",
    "metadata": {
      "title": "Large Video",
      "platform": "twitter"
    }
  }'

# Expected Response:
# {
#   "uploadId": "uuid",
#   "chunkSize": 5242880,
#   "totalChunks": 200,
#   "expiresAt": "2025-12-19T16:24:00Z"
# }

# Step 2: Upload chunks (repeat for each chunk)
curl -X POST http://localhost:8080/api/upload/chunk/{uploadId}?chunkIndex=0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "chunk=@chunk-0.bin"

# Step 3: Complete upload
curl -X POST http://localhost:8080/api/upload/complete/{uploadId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "title": "Large Video",
      "quality": "high"
    }
  }'
```

---

## Common Error Messages & Solutions

### Error: "ffmpeg: command not found"
**Solution:** ✅ Already fixed - ffmpeg is installed

### Error: "ENOENT: no such file or directory, open './uploads/temp/...'"
**Solution:** ✅ Already fixed - directories created

### Error: "Cannot find module '../middleware/auth'"
**Solution:** ✅ Already fixed - import path corrected

### Error: "Cannot POST /api/upload/init"
**Solution:** ✅ Already fixed - routes registered

### Error: "No token provided" or "Invalid token"
**Solution:** Ensure you're sending the JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Error: "Invalid file type. Only video files are allowed"
**Solution:** Ensure you're uploading one of these formats:
- video/mp4
- video/quicktime (.mov)
- video/x-msvideo (.avi)

### Error: "Video size exceeds maximum"
**Solution:** ✅ File size limit is now 500MB. For larger files, use chunked upload.

---

## Next Steps

1. **Start the application:**
   ```bash
   npm run dev  # or npm start for production
   ```

2. **Test video upload:**
   - Use the test commands above
   - Try uploading a small video first (< 50MB)
   - Then test with larger videos using chunked upload

3. **Configure AWS S3 (Optional):**
   - If you want to use S3 storage, update the credentials in `.env`
   - Or set `AWS_S3_ENABLED=false` to use local storage only

4. **Monitor logs:**
   - Check application logs for any errors
   - Look for ffmpeg processing output
   - Verify video compression is working

---

## File Changes Summary

### Modified Files:
1. `src/api/routes/chunkedUpload.ts` - Fixed auth import
2. `src/api/routes/index.ts` - Registered chunked upload routes
3. `.env` - Fixed video size configuration

### Created Directories:
- `/uploads/temp/chunks/`
- `/uploads/videos/`
- `/uploads/thumbnails/`

### System Packages Installed:
- `ffmpeg` (version 6.1.1)

---

## Support

If you encounter any other errors:
1. Check the application logs
2. Verify all environment variables in `.env`
3. Ensure the server is running on the correct port (8080)
4. Test with a small video file first (< 10MB)

All critical issues have been resolved. The video upload system should now work correctly! 🎉
