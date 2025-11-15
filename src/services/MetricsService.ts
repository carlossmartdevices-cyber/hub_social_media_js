import promClient from 'prom-client';

/**
 * 🟢 MEDIUM: Prometheus metrics service
 * Provides application and business metrics
 */
export class MetricsService {
  private static instance: MetricsService;
  public register: promClient.Registry;

  // HTTP metrics
  public httpRequestDuration: promClient.Histogram;
  public httpRequestTotal: promClient.Counter;
  public httpRequestErrors: promClient.Counter;

  // Job metrics
  public jobProcessingDuration: promClient.Histogram;
  public jobProcessingTotal: promClient.Counter;
  public jobProcessingErrors: promClient.Counter;

  // Platform metrics
  public platformPublishTotal: promClient.Counter;
  public platformPublishErrors: promClient.Counter;
  public platformPublishDuration: promClient.Histogram;

  // Database metrics
  public dbQueryDuration: promClient.Histogram;
  public dbConnectionPoolSize: promClient.Gauge;
  public dbQueryErrors: promClient.Counter;

  // Cache metrics
  public cacheHits: promClient.Counter;
  public cacheMisses: promClient.Counter;

  // BullMQ/Queue metrics
  public bullmqQueueWaiting: promClient.Gauge;
  public bullmqJobFailed: promClient.Counter;
  public bullmqJobCompleted: promClient.Counter;

  // Business metrics
  public activeUsers: promClient.Gauge;
  public totalPosts: promClient.Counter;
  public scheduledPosts: promClient.Gauge;

  private constructor() {
    this.register = new promClient.Registry();

    // Set default labels
    this.register.setDefaultLabels({
      app: 'social-media-hub',
    });

    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // HTTP Request Duration
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.register],
    });

    // HTTP Request Total
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP Request Errors
    this.httpRequestErrors = new promClient.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.register],
    });

    // Job Processing Duration
    this.jobProcessingDuration = new promClient.Histogram({
      name: 'job_processing_duration_seconds',
      help: 'Duration of job processing in seconds',
      labelNames: ['job_type', 'platform', 'status'],
      buckets: [1, 3, 5, 10, 30, 60, 120, 300],
      registers: [this.register],
    });

    // Job Processing Total
    this.jobProcessingTotal = new promClient.Counter({
      name: 'job_processing_total',
      help: 'Total number of jobs processed',
      labelNames: ['job_type', 'platform', 'status'],
      registers: [this.register],
    });

    // Job Processing Errors
    this.jobProcessingErrors = new promClient.Counter({
      name: 'job_processing_errors_total',
      help: 'Total number of job processing errors',
      labelNames: ['job_type', 'platform', 'error_type'],
      registers: [this.register],
    });

    // Platform Publish Total
    this.platformPublishTotal = new promClient.Counter({
      name: 'platform_publish_total',
      help: 'Total number of platform publishes',
      labelNames: ['platform', 'status'],
      registers: [this.register],
    });

    // Platform Publish Errors
    this.platformPublishErrors = new promClient.Counter({
      name: 'platform_publish_errors_total',
      help: 'Total number of platform publish errors',
      labelNames: ['platform', 'error_type'],
      registers: [this.register],
    });

    // Platform Publish Duration
    this.platformPublishDuration = new promClient.Histogram({
      name: 'platform_publish_duration_seconds',
      help: 'Duration of platform publish in seconds',
      labelNames: ['platform', 'status'],
      buckets: [1, 2, 5, 10, 20, 30],
      registers: [this.register],
    });

    // Database Query Duration
    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    // Database Connection Pool Size
    this.dbConnectionPoolSize = new promClient.Gauge({
      name: 'db_connection_pool_size',
      help: 'Current size of database connection pool',
      labelNames: ['state'],
      registers: [this.register],
    });

    // Database Query Errors
    this.dbQueryErrors = new promClient.Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'error_type'],
      registers: [this.register],
    });

    // Cache Hits
    this.cacheHits = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key_prefix'],
      registers: [this.register],
    });

    // Cache Misses
    this.cacheMisses = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key_prefix'],
      registers: [this.register],
    });

    // Active Users
    this.activeUsers = new promClient.Gauge({
      name: 'active_users',
      help: 'Number of active users',
      registers: [this.register],
    });

    // Total Posts
    this.totalPosts = new promClient.Counter({
      name: 'posts_total',
      help: 'Total number of posts created',
      labelNames: ['platform'],
      registers: [this.register],
    });

    // Scheduled Posts
    this.scheduledPosts = new promClient.Gauge({
      name: 'scheduled_posts',
      help: 'Number of scheduled posts',
      registers: [this.register],
    });

    // BullMQ Queue Waiting
    this.bullmqQueueWaiting = new promClient.Gauge({
      name: 'bullmq_queue_waiting_total',
      help: 'Number of jobs waiting in queue',
      labelNames: ['queue'],
      registers: [this.register],
    });

    // BullMQ Job Failed
    this.bullmqJobFailed = new promClient.Counter({
      name: 'bullmq_job_failed_total',
      help: 'Total number of failed jobs',
      labelNames: ['queue', 'job_type'],
      registers: [this.register],
    });

    // BullMQ Job Completed
    this.bullmqJobCompleted = new promClient.Counter({
      name: 'bullmq_job_completed_total',
      help: 'Total number of completed jobs',
      labelNames: ['queue', 'job_type'],
      registers: [this.register],
    });
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get metrics content type
   */
  getContentType(): string {
    return this.register.contentType;
  }
}

export default MetricsService.getInstance();
