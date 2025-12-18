# Large Video Upload System - Setup & Integration Guide

## Overview

This guide covers the implementation of a comprehensive large video handling system supporting:
- **5GB file uploads** with chunked transfers
- **Resumable uploads** with browser crash recovery
- **Parallel chunk uploads** (4 concurrent)
- **Bandwidth throttling** for network management
- **MD5 chunk validation** for data integrity
- **Background processing queue** using BullMQ
- **Upload queue management** with pause/resume

## Architecture

### Backend (Server-Side)

#### 1. **Chunked Upload Service** (`src/services/ChunkedUploadService.ts`)
- Manages upload sessions in Redis
- Validates chunks with MD5 checksums
- Assembles chunks into final files
- Auto-cleanup of expired uploads

#### 2. **Chunked Upload Controller** (`src/api/controllers/ChunkedUploadController.ts`)
- REST API endpoints for upload management
- Request validation and error handling
- Database record creation

#### 3. **API Routes** (`src/api/routes/chunkedUpload.ts`)
- `POST /api/upload/init` - Initialize upload session
- `POST /api/upload/chunk/:uploadId` - Upload chunk
- `POST /api/upload/complete/:uploadId` - Finalize upload
- `GET /api/upload/status/:uploadId` - Check progress
- `DELETE /api/upload/cancel/:uploadId` - Cancel upload

#### 4. **Video Processing Worker** (`src/jobs/workers/VideoProcessingWorker.ts`)
- BullMQ worker for background processing
- Handles compression, transcoding, thumbnail generation
- Manages S3 uploads with KMS encryption
- Database status updates

#### 5. **Database** (`src/database/migrations/007_chunked_uploads.sql`)
- `chunked_uploads` table with full tracking
- Indexes for performance
- Auto-update triggers
- Cleanup functions

### Frontend (Client-Side)

#### 1. **IndexedDB Storage** (`client-vite-backup/src/utils/uploadStorage.ts`)
- Persistent state management using IndexedDB
- Automatic recovery after browser crash
- Chunk tracking and metadata storage
- Queue state persistence

#### 2. **Resumable Upload Manager** (`client-vite-backup/src/utils/ResumableUploadManager.ts`)
- Upload queue management
- Parallel chunk uploads (4 concurrent)
- Bandwidth limiting (token bucket algorithm)
- Automatic retry with exponential backoff
- Progress tracking and statistics

#### 3. **Upload Queue Manager Component** (`client-vite-backup/src/components/UploadQueueManager.tsx`)
- Multi-file upload interface
- Drag-and-drop support
- Queue visualization
- Global controls (pause all, resume all)

#### 4. **Upload Progress Card Component** (`client-vite-backup/src/components/UploadProgressCard.tsx`)
- Individual upload progress display
- Real-time speed and ETA calculation
- Pause/Resume/Cancel/Retry controls
- Status badges and color coding

## Setup Instructions

### 1. Database Migration

Run the migration to create the chunked_uploads table:

```bash
npm run db:migrate
```

Or manually execute:

```bash
psql -h localhost -p 55432 -U postgres -d content_hub < src/database/migrations/007_chunked_uploads.sql
```

### 2. Environment Configuration

Update `.env` with the following variables:

```env
# Chunked Upload Configuration
CHUNK_SIZE_MB=5
MAX_UPLOAD_SIZE_MB=5120
MAX_CONCURRENT_CHUNKS=4
UPLOAD_SESSION_TTL_HOURS=24
TEMP_CHUNK_DIR=./uploads/temp/chunks
MAX_CONCURRENT_UPLOADS=2
MAX_QUEUED_UPLOADS=10

# Background Video Processing
VIDEO_PROCESSING_CONCURRENCY=2
VIDEO_PROCESSING_TIMEOUT_MINUTES=30

# Bandwidth Management (0 = unlimited)
MAX_UPLOAD_SPEED_MBPS=0
MIN_UPLOAD_SPEED_MBPS=1

# AWS S3 (for video storage)
AWS_S3_ENABLED=true
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=pnptv-previews
AWS_KMS_KEY_ARN=arn:aws:kms:... (optional)
CLOUDFRONT_DOMAIN=previews.pnptv.app (optional)
```

### 3. Initialize Video Processing Worker

Update `src/index.ts` or your application startup:

```typescript
import { initializeVideoProcessingWorker } from './jobs/workers/VideoProcessingWorker'

// In your startup code
const videoWorker = await initializeVideoProcessingWorker()

// On graceful shutdown
process.on('SIGTERM', async () => {
  await videoWorker.close()
})
```

### 4. Register API Routes

Update `src/api/index.ts`:

```typescript
import chunkedUploadRoutes from './routes/chunkedUpload'

app.use('/api', chunkedUploadRoutes)
```

### 5. Client Integration

#### Using Upload Queue Manager in React:

```typescript
import { UploadQueueManager } from './components/UploadQueueManager'

function VideoUploadPage() {
  return (
    <UploadQueueManager
      onUploadComplete={(uploadId, videoUrl) => {
        console.log('Upload complete:', videoUrl)
      }}
      onUploadFailed={(uploadId, error) => {
        console.error('Upload failed:', error)
      }}
    />
  )
}
```

#### Manual Upload Manager Usage:

```typescript
import { ResumableUploadManager } from './utils/ResumableUploadManager'

const uploadManager = new ResumableUploadManager(
  {
    maxConcurrentUploads: 2,
    maxQueuedUploads: 10,
    chunkSize: 5 * 1024 * 1024,
    maxUploadSpeedMbps: 0,
    maxRetries: 3,
  },
  {
    onProgress: (uploadId, progress) => {
      console.log(`${progress.progress}%`, progress)
    },
    onUploadComplete: (uploadId, videoUrl) => {
      console.log('Done:', videoUrl)
    },
  }
)

// Add to queue
const uploadId = await uploadManager.addToQueue(file, { title: 'My Video' })

// Control uploads
await uploadManager.pauseUpload(uploadId)
await uploadManager.resumeUpload(uploadId)
await uploadManager.cancelUpload(uploadId)

// Recover unfinished uploads after browser crash
const recovered = await uploadManager.recoverUnfinishedUploads()
```

## API Documentation

### 1. Initialize Upload

```
POST /api/upload/init

Request:
{
  "fileName": "video.mp4",
  "fileSize": 1073741824,
  "fileMimeType": "video/mp4",
  "metadata": {
    "title": "My Video",
    "description": "Description",
    "platform": "twitter"
  }
}

Response:
{
  "uploadId": "uuid-xxxx",
  "chunkSize": 5242880,
  "totalChunks": 200,
  "expiresAt": "2025-12-19T12:00:00Z"
}
```

### 2. Upload Chunk

```
POST /api/upload/chunk/:uploadId

Headers:
Content-Type: multipart/form-data

Body:
- chunk: binary data (up to 6MB)
- chunkIndex: number (0-based)
- checksum: string (MD5 hex hash)

Response:
{
  "uploadId": "uuid-xxxx",
  "chunkIndex": 0,
  "uploadedChunks": 1,
  "totalChunks": 200,
  "progress": 0.5
}
```

### 3. Complete Upload

```
POST /api/upload/complete/:uploadId

Request:
{
  "metadata": {
    "title": "My Video",
    "quality": "high",
    "platform": "twitter"
  }
}

Response:
{
  "uploadId": "uuid-xxxx",
  "postId": "uuid-yyyy",
  "videoUrl": "/uploads/videos/...",
  "status": "processing",
  "processingJobId": "job-123"
}
```

### 4. Get Upload Status

```
GET /api/upload/status/:uploadId

Response:
{
  "uploadId": "uuid-xxxx",
  "status": "uploading",
  "fileName": "video.mp4",
  "fileSize": 1073741824,
  "uploadedBytes": 536870912,
  "uploadedChunks": 100,
  "totalChunks": 200,
  "progress": 50,
  "uploadedAt": "2025-12-18T12:00:00Z",
  "expiresAt": "2025-12-19T12:00:00Z"
}
```

### 5. Cancel Upload

```
DELETE /api/upload/cancel/:uploadId

Response:
{
  "message": "Upload cancelled successfully"
}
```

## Performance Tuning

### For Faster Uploads

1. **Increase chunk size** (if network is stable):
   ```env
   CHUNK_SIZE_MB=10  # Default: 5
   ```

2. **Increase parallel chunks**:
   ```env
   MAX_CONCURRENT_CHUNKS=8  # Default: 4
   ```

3. **Increase concurrent uploads**:
   ```env
   MAX_CONCURRENT_UPLOADS=4  # Default: 2
   ```

### For Slower Networks

1. **Decrease chunk size**:
   ```env
   CHUNK_SIZE_MB=2  # Default: 5
   ```

2. **Decrease concurrent chunks**:
   ```env
   MAX_CONCURRENT_CHUNKS=2  # Default: 4
   ```

3. **Enable bandwidth throttling**:
   ```env
   MAX_UPLOAD_SPEED_MBPS=5  # Limit to 5 Mbps
   ```

### For Resource-Constrained Servers

1. **Limit concurrent video processing**:
   ```env
   VIDEO_PROCESSING_CONCURRENCY=1  # Default: 2
   ```

2. **Reduce video processing timeout**:
   ```env
   VIDEO_PROCESSING_TIMEOUT_MINUTES=15  # Default: 30
   ```

## Monitoring & Logging

### Database Monitoring

Check active uploads:

```sql
SELECT * FROM active_uploads;
```

Check expired uploads:

```sql
SELECT * FROM chunked_uploads
WHERE expires_at < NOW() AND status != 'completed';
```

Clean up expired uploads:

```sql
SELECT cleanup_expired_uploads();
```

### Redis Monitoring

Check upload sessions:

```bash
redis-cli
> KEYS upload:*:session
> GET upload:{uploadId}:session
> SMEMBERS upload:{uploadId}:chunks
```

### Job Queue Monitoring

Check processing queue:

```bash
npm run dev  # See queue status in logs
```

Monitor jobs:

```typescript
const queue = videoProcessingQueue
const completedCount = await queue.getCompletedCount()
const failedCount = await queue.getFailedCount()
const waitingCount = await queue.getWaitingCount()
```

## Troubleshooting

### Issue: "Upload session not found"

**Cause**: Session expired (24 hours by default)

**Solution**: Increase TTL or create new upload session

```env
UPLOAD_SESSION_TTL_HOURS=48
```

### Issue: "Checksum mismatch"

**Cause**: Network corruption or MD5 calculation error

**Solution**: Automatic retry will handle this (3 attempts by default)

### Issue: "Chunk upload fails with 413"

**Cause**: Chunk size exceeds server limit

**Solution**: Verify multer limits in controller or reduce chunk size

```env
CHUNK_SIZE_MB=3
```

### Issue: "Out of disk space"

**Cause**: Too many temp chunks not cleaned up

**Solution**: Run cleanup job

```sql
SELECT cleanup_expired_uploads();
```

Or increase cleanup frequency in production cron.

### Issue: "Video processing never completes"

**Cause**: Worker not running or FFmpeg issues

**Solution**:
1. Verify worker is initialized
2. Check FFmpeg installed: `ffmpeg -version`
3. Increase timeout if processing large files

```env
VIDEO_PROCESSING_TIMEOUT_MINUTES=60
```

## Security Considerations

1. **File Type Validation**: Only video MIME types accepted
   - `video/mp4`
   - `video/quicktime`
   - `video/x-msvideo`

2. **File Size Limits**: Enforced at multiple levels
   - Multer: 6MB per chunk
   - ChunkedUploadService: 5GB total

3. **MD5 Validation**: Each chunk validated for integrity

4. **AWS KMS Encryption**: Recommended for S3 storage
   ```env
   AWS_KMS_KEY_ARN=arn:aws:kms:region:account:key/key-id
   ```

5. **Rate Limiting**: Implement at API level (recommended)

6. **Upload Session TTL**: Automatic cleanup of orphaned sessions

## Files Created/Modified

### New Files (7)
- `src/types/upload.types.ts`
- `src/services/ChunkedUploadService.ts`
- `src/api/controllers/ChunkedUploadController.ts`
- `src/api/routes/chunkedUpload.ts`
- `src/database/migrations/007_chunked_uploads.sql`
- `src/jobs/workers/VideoProcessingWorker.ts`
- `client-vite-backup/src/utils/uploadStorage.ts`
- `client-vite-backup/src/utils/ResumableUploadManager.ts`
- `client-vite-backup/src/components/UploadQueueManager.tsx`
- `client-vite-backup/src/components/UploadProgressCard.tsx`

### Modified Files (4)
- `src/jobs/queue.ts` - Added videoProcessingQueue
- `src/config/index.ts` - Added upload/processing config
- `.env.example` - Added environment variables

## Next Steps

1. **Run database migration**: `npm run db:migrate`
2. **Initialize worker**: Update application startup
3. **Register routes**: Add to API router
4. **Test uploads**: Use UploadQueueManager component
5. **Monitor**: Check logs and database
6. **Optimize**: Tune settings based on your infrastructure

## Support

For issues or questions:
1. Check database for upload records
2. Review Redis for session data
3. Check BullMQ queue status
4. Review application logs
5. Check FFmpeg output for processing errors

---

**Last Updated**: 2025-12-18
**Version**: 1.0.0
