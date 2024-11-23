const request = require('supertest');
const app = require('../../src/app');
const { testUsers } = require('../fixtures/testData');

describe('Employee Management API', () => {
  let adminToken;
  let employeeId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: testUsers.admin.password
      });
    adminToken = loginRes.body.data.token;
  });

  describe('POST /api/employees', () => {
    it('should create a new employee', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Employee',
          email: 'new@test.com',
          phone: '1234567890',
          departmentId: 1,
          positionId: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('employee_id');
      employeeId = res.body.data.employee_id;
    });

    it('should fail with duplicate email', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Employee',
          email: 'new@test.com',
          phone: '1234567890',
          departmentId: 1,
          positionId: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/employees', () => {
    it('should get all employees', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get employee by id', async () => {
      const res = await request(app)
        .get(`/api/employees/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('employee_id', employeeId);
    });
  });
});