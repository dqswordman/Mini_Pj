const request = require('supertest');
const app = require('../../src/app');
const { initialize, closePoolAndExit } = require('../../src/config/database');

describe('Auth API Tests', () => {
  beforeAll(async () => {
    console.log('Initializing database for Auth tests...');
    await initialize();
  });

  afterAll(async () => {
    console.log('Closing database connection pool for Auth tests...');
    await closePoolAndExit();
  });

  const testUser = {
    email: 'test_user@example.com',
    password: 'Test123!@#',
    name: 'Test User',
    phoneNumber: '1234567890',
    departmentId: 1,
    positionId: 1,
  };

  let authToken;

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', testUser.email);
    });

    it('should fail when registering with an existing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400); // 重复注册应返回 400 错误
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      authToken = res.body.data.token;
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', testUser.email);
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
