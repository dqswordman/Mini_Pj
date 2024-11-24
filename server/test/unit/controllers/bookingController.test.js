// test/unit/controllers/bookingController.test.js
const bookingController = require('../../../src/controllers/bookingController');
const bookingService = require('../../../src/services/bookingService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

// Mock console.error to suppress error outputs during tests
console.error = jest.fn();

// Mock bookingService
jest.mock('../../../src/services/bookingService');

describe('BookingController', () => {
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

  describe('createBooking', () => {
    beforeEach(() => {
      // Mock the current date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create booking successfully', async () => {
      // Arrange
      const bookingData = {
        roomId: 1,
        startTime: '2024-02-01T09:00:00',
        endTime: '2024-02-01T10:00:00'
      };
      const mockBooking = {
        booking_id: 1,
        room_id: 1,
        employee_id: 1,
        start_time: '2024-02-01T09:00:00',
        end_time: '2024-02-01T10:00:00',
        booking_status: 'Approved',
        secret_number: 'ABC123'
      };
      req.body = bookingData;
      bookingService.createBooking.mockResolvedValue(mockBooking);

      // Act
      await bookingController.createBooking(req, res);

      // Assert
      expect(bookingService.createBooking).toHaveBeenCalledWith({
        employeeId: 1,
        roomId: 1,
        startTime: expect.any(Date),
        endTime: expect.any(Date)
      });
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Booking created successfully',
        data: mockBooking
      });
    });

    it('should handle missing required fields', async () => {
      // Arrange
      req.body = {
        roomId: 1
        // missing startTime and endTime
      };

      // Act
      await bookingController.createBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle invalid time range', async () => {
      // Arrange
      req.body = {
        roomId: 1,
        startTime: '2024-02-01T10:00:00',
        endTime: '2024-02-01T09:00:00' // end before start
      };

      // Act
      await bookingController.createBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'End time must be after start time',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle time slot conflict', async () => {
      // Arrange
      req.body = {
        roomId: 1,
        startTime: '2024-02-01T09:00:00',
        endTime: '2024-02-01T10:00:00'
      };
      const error = new Error('Time slot is already booked');
      bookingService.createBooking.mockRejectedValue(error);

      // Act
      await bookingController.createBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Selected time slot is not available',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle disabled room', async () => {
      // Arrange
      req.body = {
        roomId: 1,
        startTime: '2024-02-01T09:00:00',
        endTime: '2024-02-01T10:00:00'
      };
      const error = new Error('Room is disabled');
      bookingService.createBooking.mockRejectedValue(error);

      // Act
      await bookingController.createBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Selected room is not available',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('getBookingById', () => {
    it('should return booking details for owner', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 1,
        ROOM_NAME: 'Meeting Room A',
        START_TIME: '2024-02-01T09:00:00',
        END_TIME: '2024-02-01T10:00:00',
        BOOKING_STATUS: 'Approved'
      };
      req.params = { id: '1' };
      bookingService.getBookingById.mockResolvedValue(mockBooking);

      // Act
      await bookingController.getBookingById(req, res);

      // Assert
      expect(bookingService.getBookingById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockBooking
      });
    });

    it('should handle booking not found', async () => {
      // Arrange
      req.params = { id: '999' };
      bookingService.getBookingById.mockRejectedValue(new Error('Booking not found'));

      // Act
      await bookingController.getBookingById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Booking not found',
        code: STATUS_CODES.NOT_FOUND
      });
    });

    it('should handle unauthorized access', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 2, // different employee
        ROOM_NAME: 'Meeting Room A',
        BOOKING_STATUS: 'Approved'
      };
      req.params = { id: '1' };
      bookingService.getBookingById.mockResolvedValue(mockBooking);

      // Act
      await bookingController.getBookingById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized to view this booking',
        code: STATUS_CODES.FORBIDDEN
      });
    });

    it('should allow admin to view any booking', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 2, // different employee
        ROOM_NAME: 'Meeting Room A',
        BOOKING_STATUS: 'Approved'
      };
      req.params = { id: '1' };
      req.user.position = 'Admin'; // Set as admin
      bookingService.getBookingById.mockResolvedValue(mockBooking);

      // Act
      await bookingController.getBookingById(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockBooking
      });
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 1,
        BOOKING_STATUS: 'Cancelled',
        CANCELLATION_REASON: 'Meeting cancelled'
      };
      req.params = { id: '1' };
      req.body = { reason: 'Meeting cancelled' };
      bookingService.cancelBooking.mockResolvedValue(mockBooking);

      // Act
      await bookingController.cancelBooking(req, res);

      // Assert
      expect(bookingService.cancelBooking).toHaveBeenCalledWith(
        '1',
        1,
        'Meeting cancelled'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Booking cancelled successfully',
        data: mockBooking
      });
    });

    it('should handle missing cancellation reason', async () => {
      // Arrange
      req.params = { id: '1' };
      req.body = {}; // missing reason

      // Act
      await bookingController.cancelBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cancellation reason is required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle unauthorized cancellation attempt', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 2, // different employee
        BOOKING_STATUS: 'Approved'
      };
      req.params = { id: '1' };
      req.body = { reason: 'Need to cancel' };
      bookingService.cancelBooking.mockRejectedValue(
        new Error('Unauthorized to cancel this booking')
      );

      // Act
      await bookingController.cancelBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized to cancel this booking',
        code: STATUS_CODES.FORBIDDEN
      });
    });

    it('should handle cancellation of expired booking', async () => {
      // Arrange
      req.params = { id: '1' };
      req.body = { reason: 'Need to cancel' };
      bookingService.cancelBooking.mockRejectedValue(
        new Error('Cannot cancel booking in current status')
      );

      // Act
      await bookingController.cancelBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot cancel booking in current status',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should allow admin to cancel any booking', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        EMPLOYEE_ID: 2, // different employee
        BOOKING_STATUS: 'Cancelled'
      };
      req.params = { id: '1' };
      req.body = { reason: 'Cancelled by admin' };
      req.user.position = 'Admin';
      bookingService.cancelBooking.mockResolvedValue(mockBooking);

      // Act
      await bookingController.cancelBooking(req, res);

      // Assert
      expect(bookingService.cancelBooking).toHaveBeenCalledWith(
        '1',
        1,
        'Cancelled by admin'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Booking cancelled successfully',
        data: mockBooking
      });
    });
  });

  describe('approveBooking', () => {
    it('should approve booking successfully', async () => {
      // Arrange
      const mockBooking = {
        BOOKING_ID: 1,
        BOOKING_STATUS: 'Approved',
        APPROVAL_REASON: 'Approved by manager'
      };
      req.params = { id: '1' };
      req.body = { 
        isApproved: true,
        reason: 'Approved by manager'
      };
      req.user.position = 'Manager'; // Set as manager
      bookingService.approveBooking.mockResolvedValue(mockBooking);

      // Act
      await bookingController.approveBooking(req, res);

      // Assert
      expect(bookingService.approveBooking).toHaveBeenCalledWith(
        '1',
        1,
        true,
        'Approved by manager'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Booking approved successfully',
        data: mockBooking
      });
    });

    it('should handle missing approval decision', async () => {
      // Arrange
      req.params = { id: '1' };
      req.body = { reason: 'Some reason' }; // missing isApproved

      // Act
      await bookingController.approveBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Approval decision and reason are required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle non-manager approval attempt', async () => {
      // Arrange
      req.params = { id: '1' };
      req.body = {
        isApproved: true,
        reason: 'Approved'
      };
      req.user.position = 'Employee'; // Non-manager role
      bookingService.approveBooking.mockRejectedValue(
        new Error('Unauthorized to approve bookings')
      );

      // Act
      await bookingController.approveBooking(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized to approve bookings',
        code: STATUS_CODES.FORBIDDEN
      });
    });

    it('should handle approval of non-pending booking', async () => {
        // Arrange
        req.params = { id: '1' };
        req.body = {
          isApproved: true,
          reason: 'Approved'
        };
        req.user.position = 'Manager';
        bookingService.approveBooking.mockRejectedValue(
          new Error('Booking is not in pending status')
        );
  
        // Act
        await bookingController.approveBooking(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Can only approve pending bookings',
          code: STATUS_CODES.BAD_REQUEST
        });
      });
  
      it('should handle booking rejection', async () => {
        // Arrange
        const mockBooking = {
          BOOKING_ID: 1,
          BOOKING_STATUS: 'Rejected',
          APPROVAL_REASON: 'Room not available'
        };
        req.params = { id: '1' };
        req.body = {
          isApproved: false,
          reason: 'Room not available'
        };
        req.user.position = 'Manager';
        bookingService.approveBooking.mockResolvedValue(mockBooking);
  
        // Act
        await bookingController.approveBooking(req, res);
  
        // Assert
        expect(bookingService.approveBooking).toHaveBeenCalledWith(
          '1',
          1,
          false,
          'Room not available'
        );
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Booking rejected successfully',
          data: mockBooking
        });
      });
  
      it('should handle missing approval reason', async () => {
        // Arrange
        req.params = { id: '1' };
        req.body = {
          isApproved: true
          // missing reason
        };
        req.user.position = 'Manager';
  
        // Act
        await bookingController.approveBooking(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Approval decision and reason are required',
          code: STATUS_CODES.BAD_REQUEST
        });
      });
  
      it('should handle booking not found during approval', async () => {
        // Arrange
        req.params = { id: '999' };
        req.body = {
          isApproved: true,
          reason: 'Approved'
        };
        req.user.position = 'Manager';
        bookingService.approveBooking.mockRejectedValue(new Error('Booking not found'));
  
        // Act
        await bookingController.approveBooking(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Booking not found',
          code: STATUS_CODES.NOT_FOUND
        });
      });
    });
  
    describe('getUserBookings', () => {
      it('should return user bookings successfully', async () => {
        // Arrange
        const mockBookings = [
          {
            BOOKING_ID: 1,
            ROOM_NAME: 'Meeting Room A',
            START_TIME: '2024-02-01T09:00:00',
            BOOKING_STATUS: 'Approved'
          },
          {
            BOOKING_ID: 2,
            ROOM_NAME: 'Meeting Room B',
            START_TIME: '2024-02-02T14:00:00',
            BOOKING_STATUS: 'Pending'
          }
        ];
        bookingService.getUserBookings.mockResolvedValue(mockBookings);
  
        // Act
        await bookingController.getUserBookings(req, res);
  
        // Assert
        expect(bookingService.getUserBookings).toHaveBeenCalledWith(1, null);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Success',
          data: mockBookings
        });
      });
  
      it('should return filtered bookings by status', async () => {
        // Arrange
        const mockBookings = [
          {
            BOOKING_ID: 1,
            ROOM_NAME: 'Meeting Room A',
            START_TIME: '2024-02-01T09:00:00',
            BOOKING_STATUS: 'Approved'
          }
        ];
        req.query = { status: 'Approved' };
        bookingService.getUserBookings.mockResolvedValue(mockBookings);
  
        // Act
        await bookingController.getUserBookings(req, res);
  
        // Assert
        expect(bookingService.getUserBookings).toHaveBeenCalledWith(1, 'Approved');
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Success',
          data: mockBookings
        });
      });
  
      it('should handle viewing other user bookings as admin', async () => {
        // Arrange
        const mockBookings = [
          {
            BOOKING_ID: 1,
            ROOM_NAME: 'Meeting Room A',
            START_TIME: '2024-02-01T09:00:00',
            BOOKING_STATUS: 'Approved'
          }
        ];
        req.params = { userId: '2' };
        req.user.position = 'Admin';
        bookingService.getUserBookings.mockResolvedValue(mockBookings);
  
        // Act
        await bookingController.getUserBookings(req, res);
  
        // Assert
        expect(bookingService.getUserBookings).toHaveBeenCalledWith('2', null);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Success',
          data: mockBookings
        });
      });
  
      it('should handle unauthorized attempt to view other user bookings', async () => {
        // Arrange
        req.params = { userId: '2' }; // different user
  
        // Act
        await bookingController.getUserBookings(req, res);
  
        // Assert
        expect(res.status).toHaveBeenCalledWith(STATUS_CODES.FORBIDDEN);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Unauthorized to view these bookings',
          code: STATUS_CODES.FORBIDDEN
        });
      });
    });
  });