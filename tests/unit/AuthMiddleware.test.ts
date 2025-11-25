import { authMiddleware } from '../../src/api/middlewares/auth';
import { Request, Response } from 'express';

describe('Auth Middleware', () => {
  it('should return 401 if no token provided', () => {
    const req = { headers: {} } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn();
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  // Add more token validation tests
});
