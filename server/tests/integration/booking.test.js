const request = require('supertest');
const app = require('../../src/app');
const { testUsers, testBooking } = require('../fixtures/testData');

describe('Booking System API', () => {
  let userToken;
  let adminToken;
  let bookingId;
  let roomId;

  beforeAll(async () => {
    // 获取用户token
    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.user.email,
        password: testUsers.user.password
      });
    userToken = userLoginRes.body.data.token;

    // 获取管理员token
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: testUsers.admin.password
      });
    adminToken = adminLoginRes.body.data.token;

    // 获取可用的会议室
    const roomRes = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${userToken}`);
    roomId = roomRes.body.data[0].room_id;
  });

  describe('POST /api/bookings', () => {
    it('should create a new booking', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          startTime: testBooking.startTime,
          endTime: testBooking.endTime
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('booking_id');
      bookingId = res.body.data.booking_id;
    });

    it('should not allow booking with time conflict', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          roomId: roomId,
          startTime: testBooking.startTime,
          endTime: testBooking.endTime
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/bookings', () => {
    it('should get user bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/my-bookings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get booking details', async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('booking_id', bookingId);
    });
  });

  describe('POST /api/bookings/:id/cancel', () => {
    it('should cancel booking', async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Test cancellation'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking_status).toBe('Cancelled');
    });
  });
});