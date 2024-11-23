const request = require('supertest');
const app = require('../../src/app');
const { initialize, closePoolAndExit } = require('../../src/config/database');

describe('Basic API Tests', () => {
  beforeAll(async () => {
    try {
      console.log('Initializing database...');
      await initialize(); // 初始化数据库连接池
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      console.log('Closing database connection pool...');
      await closePoolAndExit(); // 关闭连接池
    } catch (error) {
      console.error('Failed to close database connection:', error);
    }
  });

  describe('GET /api/health', () => {
    it('should return 200 and server status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 when accessing protected route without token', async () => {
      const res = await request(app).get('/api/employees');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
