const request = require('supertest');
const app = require('../../src/app');
const { testUsers, testRoom } = require('../fixtures/testData');

describe('Room Management API', () => {
  let adminToken;
  let roomId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.admin.email,
        password: testUsers.admin.password
      });
    adminToken = loginRes.body.data.token;
  });

  describe('POST /api/rooms', () => {
    it('should create a new room', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roomName: testRoom.name,
          buildingId: testRoom.buildingId,
          floorNumber: testRoom.floorNumber,
          capacity: testRoom.capacity
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('room_id');
      roomId = res.body.data.room_id;
    });
  });

  describe('GET /api/rooms', () => {
    it('should get all rooms', async () => {
      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get room by id', async () => {
      const res = await request(app)
        .get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('room_id', roomId);
    });

    it('should search rooms by criteria', async () => {
      const res = await request(app)
        .get('/api/rooms/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          buildingId: testRoom.buildingId,
          minCapacity: testRoom.capacity - 1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});