import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { VideoProcessingJob } from '../types/upload.types';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

export const postQueue = new Queue('posts', { connection });
export const metricsQueue = new Queue('metrics', { connection });
export const videoProcessingQueue = new Queue<VideoProcessingJob>('videoProcessingQueue', { connection });

export const queueEvents = new QueueEvents('posts', { connection });
export const videoQueueEvents = new QueueEvents('videoProcessingQueue', { connection });

queueEvents.on('completed', ({ jobId }) => {
  logger.info(`Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed: ${failedReason}`);
});

videoQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Video processing job ${jobId} completed`);
});

videoQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Video processing job ${jobId} failed: ${failedReason}`);
});

export async function closeQueues() {
  await postQueue.close();
  await metricsQueue.close();
  await videoProcessingQueue.close();
  await queueEvents.close();
  await videoQueueEvents.close();
  logger.info('All queues closed');
}

export default {
  postQueue,
  metricsQueue,
  queueEvents,
  closeQueues,
};
