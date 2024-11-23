const request = require('supertest');
const app = require('../../src/app');
const { testUsers } = require('../fixtures/testData');

describe('Report System API', () => {
  let adminToken;
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前
  const endDate = new Date(); // 现在

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: testUsers.admin.password,
      });
  
    // 校验响应结果
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data).toHaveProperty('token');
  
    // 提取 token
    adminToken = loginRes.body.data.token;
  });
  

  describe('GET /api/reports/room-usage', () => {
    it('should get room usage statistics', async () => {
      const res = await request(app)
        .get('/api/reports/room-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/reports/booking-usage', () => {
    it('should get booking usage statistics', async () => {
      const res = await request(app)
        .get('/api/reports/booking-usage')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/reports/lock-stats', () => {
    it('should get lock statistics', async () => {
      const res = await request(app)
        .get('/api/reports/lock-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});