import autocannon from 'autocannon';
import { describe, it } from '@jest/globals';

/**
 * 🔵 LOW: Load testing for Telegram integration
 * Tests system performance under high load
 */
describe('Telegram Load Tests', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token';

  it('should handle 100 concurrent POST requests', async () => {
    const result = await autocannon({
      url: `${BASE_URL}/api/posts`,
      connections: 100,
      duration: 30,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platforms: ['telegram'],
        content: {
          text: 'Load test message',
          hashtags: ['loadtest'],
        },
      }),
    });

    console.log('Load Test Results:');
    console.log(`Requests: ${result.requests.total}`);
    console.log(`Throughput: ${result.throughput.total} bytes`);
    console.log(`Duration: ${result.duration}s`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);

    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
  }, 60000);

  it('should handle sustained load (1000 requests)', async () => {
    const result = await autocannon({
      url: `${BASE_URL}/api/posts`,
      connections: 50,
      amount: 1000,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platforms: ['telegram'],
        content: {
          text: 'Sustained load test message',
        },
      }),
    });

    console.log('Sustained Load Test Results:');
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latency (avg): ${result.latency.mean}ms`);
    console.log(`Latency (p99): ${result.latency.p99}ms`);

    expect(result.non2xx).toBeLessThan(result.requests.total * 0.05); // Less than 5% errors
  }, 120000);
});
