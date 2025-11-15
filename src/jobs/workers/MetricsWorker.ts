import { Worker, Job } from 'bullmq';
import { Platform } from '../../core/content/types';
import { PlatformFactory } from '../../platforms';
import { logger } from '../../utils/logger';
import config from '../../config';
import database from '../../database/connection';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
};

interface MetricsJobData {
  platformPostId: string;
  platform: Platform;
  platformSpecificPostId: string;
  credentials: Record<string, string>;
}

export class MetricsWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('metrics', this.processJob.bind(this), {
      connection,
      concurrency: 10,
    });

    this.worker.on('completed', job => {
      logger.info(`Metrics job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Metrics job ${job?.id} failed:`, err);
    });
  }

  private async processJob(job: Job<MetricsJobData>) {
    const { platformPostId, platform, platformSpecificPostId, credentials } = job.data;

    try {
      logger.info(`Fetching metrics for ${platform} post ${platformSpecificPostId}`);

      const adapter = PlatformFactory.createAdapter(platform);
      await adapter.initialize(credentials);

      const metrics = await adapter.getMetrics(platformSpecificPostId);

      // Store metrics in database
      await database.query(
        `INSERT INTO platform_metrics
         (platform_post_id, platform, post_id, likes, shares, comments, views, engagement, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          platformPostId,
          metrics.platform,
          metrics.postId,
          metrics.likes,
          metrics.shares,
          metrics.comments,
          metrics.views,
          metrics.engagement,
          metrics.timestamp,
        ]
      );

      return metrics;
    } catch (error: any) {
      logger.error(`Failed to fetch metrics for ${platform}:`, error);
      throw error;
    }
  }

  async close() {
    await this.worker.close();
    logger.info('Metrics worker closed');
  }
}

export default MetricsWorker;
