// test/unit/controllers/accessController.test.js
const accessController = require('../../../src/controllers/accessController');
const accessService = require('../../../src/services/accessService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

// Mock console.error to suppress error outputs during tests
console.error = jest.fn();

// Mock accessService with all required methods
jest.mock('../../../src/services/accessService', () => ({
  verifySecretNumber: jest.fn(),
  createAccessLog: jest.fn(),
  getBookingById: jest.fn(),
  generateQRCode: jest.fn(),
  getAccessLogs: jest.fn(),
  checkUnusedBookings: jest.fn()
}));

describe('AccessController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
    // 模拟已认证用户
    req.user = {
      employeeId: 1,
      position: 'Employee'
    };
  });

  describe('recordAccess', () => {
    it('should record access successfully', async () => {
      // Arrange
      const mockAccessLog = {
        accessLogId: 1,
        bookingId: 1,
        accessTime: new Date(),
        roomName: 'Meeting Room A',
        employeeName: 'John Doe'
      };
      req.body = {
        bookingId: '1',
        secretNumber: 'ABC123'
      };
      
      accessService.verifySecretNumber.mockResolvedValue(true);
      accessService.createAccessLog.mockResolvedValue(mockAccessLog);

      // Act
      await accessController.recordAccess(req, res);

      // Assert
      expect(accessService.verifySecretNumber).toHaveBeenCalledWith('1', 'ABC123');
      expect(accessService.createAccessLog).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Access recorded successfully',
        data: mockAccessLog
      });
    });

    it('should handle missing required fields', async () => {
      // Arrange
      req.body = {
        bookingId: '1'
        // missing secretNumber
      };

      // Act
      await accessController.recordAccess(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking ID and secret number are required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle invalid secret number', async () => {
      // Arrange
      req.body = {
        bookingId: '1',
        secretNumber: 'WRONG123'
      };
      accessService.verifySecretNumber.mockResolvedValue(false);

      // Act
      await accessController.recordAccess(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid secret number',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle access outside booking time', async () => {
      // Arrange
      req.body = {
        bookingId: '1',
        secretNumber: 'ABC123'
      };
      accessService.verifySecretNumber.mockRejectedValue(
        new Error('Access attempt outside booking time window')
      );

      // Act
      await accessController.recordAccess(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access attempt outside booking time window',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle non-approved booking', async () => {
      // Arrange
      req.body = {
        bookingId: '1',
        secretNumber: 'ABC123'
      };
      accessService.verifySecretNumber.mockRejectedValue(
        new Error('Booking is not approved')
      );

      // Act
      await accessController.recordAccess(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking is not approved',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 1,
        SECRET_NUMBER: 'ABC123'
      };
      const mockQRCode = 'data:image/png;base64,...';
      req.params = { bookingId: '1' };
      
      accessService.getBookingById.mockResolvedValue(mockBooking);
      accessService.generateQRCode.mockResolvedValue(mockQRCode);

      // Act
      await accessController.generateQRCode(req, res);

      // Assert
      expect(accessService.generateQRCode).toHaveBeenCalledWith('1', 'ABC123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: { qrCode: mockQRCode }
      });
    });

    it('should handle unauthorized access to booking', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 2, // different employee
        SECRET_NUMBER: 'ABC123'
      };
      req.params = { bookingId: '1' };
      
      accessService.getBookingById.mockResolvedValue(mockBooking);

      // Act
      await accessController.generateQRCode(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized to access this booking',
        code: STATUS_CODES.FORBIDDEN
      });
    });

    it('should handle error when generating QR code', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 1,
        SECRET_NUMBER: 'ABC123'
      };
      req.params = { bookingId: '1' };
      
      accessService.getBookingById.mockResolvedValue(mockBooking);
      accessService.generateQRCode.mockRejectedValue(new Error('QR code generation failed'));

      // Act
      await accessController.generateQRCode(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to generate QR code',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('getAccessLogs', () => {
    it('should return access logs successfully', async () => {
      // Arrange
      const mockLogs = [
        {
          access_log_id: 1,
          booking_id: 1,
          access_time: new Date(),
          room_name: 'Meeting Room A',
          employee_name: 'John Doe'
        }
      ];
      req.params = { bookingId: '1' };
      accessService.getAccessLogs.mockResolvedValue(mockLogs);

      // Act
      await accessController.getAccessLogs(req, res);

      // Assert
      expect(accessService.getAccessLogs).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockLogs
      });
    });

    it('should handle error when fetching logs', async () => {
      // Arrange
      req.params = { bookingId: '1' };
      accessService.getAccessLogs.mockRejectedValue(new Error('Database error'));

      // Act
      await accessController.getAccessLogs(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch access logs',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('checkUnusedBookings', () => {
    it('should return unused bookings successfully', async () => {
      // Arrange
      const mockUnusedBookings = [
        {
          booking_id: 1,
          employee_name: 'John Doe',
          room_name: 'Meeting Room A',
          start_time: new Date(),
          end_time: new Date()
        }
      ];
      accessService.checkUnusedBookings.mockResolvedValue(mockUnusedBookings);

      // Act
      await accessController.checkUnusedBookings(req, res);

      // Assert
      expect(accessService.checkUnusedBookings).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockUnusedBookings
      });
    });

    it('should handle error when checking unused bookings', async () => {
      // Arrange
      accessService.checkUnusedBookings.mockRejectedValue(new Error('Database error'));

      // Act
      await accessController.checkUnusedBookings(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to check unused bookings',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });
});