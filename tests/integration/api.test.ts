import request from 'supertest';
import { createApp } from '../../src/api/app';

describe('API Integration Tests', () => {
  const app = createApp();

  describe('Health Check', () => {
    it('should return 200 for health endpoint', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Auth Endpoints', () => {
    it('should return 400 for invalid registration data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 for invalid login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 when accessing posts without token', async () => {
      const response = await request(app).get('/api/posts');

      expect(response.status).toBe(401);
    });
  });
});
