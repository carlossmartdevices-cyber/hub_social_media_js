import { Queue, QueueEvents } from 'bullmq';
import config from '../config';
import { logger } from '../utils/logger';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

export const postQueue = new Queue('posts', { connection });
export const metricsQueue = new Queue('metrics', { connection });

export const queueEvents = new QueueEvents('posts', { connection });

queueEvents.on('completed', ({ jobId }) => {
  logger.info(`Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed: ${failedReason}`);
});

export async function closeQueues() {
  await postQueue.close();
  await metricsQueue.close();
  await queueEvents.close();
  logger.info('All queues closed');
}

export default {
  postQueue,
  metricsQueue,
  queueEvents,
  closeQueues,
};
