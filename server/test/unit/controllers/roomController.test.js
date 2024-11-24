// test/unit/controllers/roomController.test.js
const roomController = require('../../../src/controllers/roomController');
const roomService = require('../../../src/services/roomService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

// Mock console.error to suppress error outputs during tests
console.error = jest.fn();

// Mock roomService
jest.mock('../../../src/services/roomService');

describe('RoomController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('getAllRooms', () => {
    it('should return all rooms successfully', async () => {
      // Arrange
      const mockRooms = [
        {
          room_id: 1,
          room_name: 'Meeting Room A',
          building_id: 1,
          floor_number: 1,
          capacity: 10,
          is_disabled: 0,
          upcoming_bookings: 2
        },
        {
          room_id: 2,
          room_name: 'Conference Room B',
          building_id: 1,
          floor_number: 2,
          capacity: 20,
          is_disabled: 0,
          upcoming_bookings: 0
        }
      ];
      roomService.getAllRooms.mockResolvedValue(mockRooms);

      // Act
      await roomController.getAllRooms(req, res);

      // Assert
      expect(roomService.getAllRooms).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockRooms
      });
    });

    it('should handle errors when fetching rooms', async () => {
      // Arrange
      roomService.getAllRooms.mockRejectedValue(new Error('Database error'));

      // Act
      await roomController.getAllRooms(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch rooms',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('getRoomById', () => {
    it('should return room by id successfully', async () => {
      // Arrange
      const mockRoom = {
        room_id: 1,
        room_name: 'Meeting Room A',
        building_id: 1,
        floor_number: 1,
        capacity: 10,
        is_disabled: 0,
        amenities: ['Projector', 'Whiteboard']
      };
      req.params = { id: '1' };
      roomService.getRoomById.mockResolvedValue(mockRoom);

      // Act
      await roomController.getRoomById(req, res);

      // Assert
      expect(roomService.getRoomById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockRoom
      });
    });

    it('should handle room not found', async () => {
      // Arrange
      req.params = { id: '999' };
      roomService.getRoomById.mockRejectedValue(new Error('Room not found'));

      // Act
      await roomController.getRoomById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Room not found',
        code: STATUS_CODES.NOT_FOUND
      });
    });
  });

  describe('createRoom', () => {
    it('should create room successfully', async () => {
      // Arrange
      const roomData = {
        roomName: 'New Meeting Room',
        buildingId: 1,
        floorNumber: 3,
        capacity: 15,
        amenities: ['TV', 'Whiteboard']
      };
      const mockNewRoom = {
        room_id: 3,
        room_name: 'New Meeting Room',
        building_id: 1,
        floor_number: 3,
        capacity: 15,
        is_disabled: 0,
        amenities: ['TV', 'Whiteboard']
      };
      req.body = roomData;
      roomService.createRoom.mockResolvedValue(mockNewRoom);

      // Act
      await roomController.createRoom(req, res);

      // Assert
      expect(roomService.createRoom).toHaveBeenCalledWith({
        ...roomData,
        isDisabled: 0
      });
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Room created successfully',
        data: mockNewRoom
      });
    });

    it('should handle missing required fields', async () => {
      // Arrange
      req.body = {
        roomName: 'New Meeting Room'
        // missing required fields
      };

      // Act
      await roomController.createRoom(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('getRoomAvailability', () => {
    it('should return room availability successfully', async () => {
      // Arrange
      const mockAvailability = [
        {
          booking_id: 1,
          start_time: '2024-01-01T09:00:00',
          end_time: '2024-01-01T10:00:00',
          booked_by: 'John Doe'
        }
      ];
      req.params = { id: '1' };
      req.query = { date: '2024-01-01' };
      roomService.getRoomAvailability.mockResolvedValue(mockAvailability);

      // Act
      await roomController.getRoomAvailability(req, res);

      // Assert
      expect(roomService.getRoomAvailability).toHaveBeenCalledWith('1', expect.any(Date));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockAvailability
      });
    });

    it('should handle missing date parameter', async () => {
      // Arrange
      req.params = { id: '1' };
      req.query = {}; // missing date

      // Act
      await roomController.getRoomAvailability(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Date is required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('searchRooms', () => {
    it('should search rooms with criteria successfully', async () => {
      // Arrange
      const searchCriteria = {
        buildingId: '1',
        floorNumber: '2',
        minCapacity: '10',
        startTime: '2024-01-01T09:00:00',
        endTime: '2024-01-01T10:00:00'
      };
      const mockRooms = [
        {
          room_id: 2,
          room_name: 'Meeting Room B',
          building_id: 1,
          floor_number: 2,
          capacity: 15,
          is_disabled: 0
        }
      ];
      req.query = searchCriteria;
      roomService.searchRooms.mockResolvedValue(mockRooms);

      // Act
      await roomController.searchRooms(req, res);

      // Assert
      expect(roomService.searchRooms).toHaveBeenCalledWith({
        buildingId: 1,
        floorNumber: 2,
        minCapacity: 10,
        startTime: expect.any(Date),
        endTime: expect.any(Date)
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockRooms
      });
    });

    it('should handle search with no criteria', async () => {
      // Arrange
      const mockRooms = [
        {
          room_id: 1,
          room_name: 'Meeting Room A',
          building_id: 1,
          floor_number: 1,
          capacity: 10,
          is_disabled: 0
        }
      ];
      req.query = {};
      roomService.searchRooms.mockResolvedValue(mockRooms);

      // Act
      await roomController.searchRooms(req, res);

      // Assert
      expect(roomService.searchRooms).toHaveBeenCalledWith({
        buildingId: null,
        floorNumber: null,
        minCapacity: null,
        startTime: null,
        endTime: null
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockRooms
      });
    });
  });
});