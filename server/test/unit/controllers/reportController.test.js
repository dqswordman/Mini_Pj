// test/unit/controllers/reportController.test.js
const reportController = require('../../../src/controllers/reportController');
const reportService = require('../../../src/services/reportService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

// Mock console.error to suppress error outputs during tests
console.error = jest.fn();

// Mock reportService
jest.mock('../../../src/services/reportService', () => ({
  getRoomUsageStats: jest.fn(),
  getDailyUsageStats: jest.fn(),
  getBookingUsageStats: jest.fn(),
  getLockStats: jest.fn(),
  getLockHistory: jest.fn(),
  getSystemLogsStats: jest.fn()
}));

describe('ReportController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
    // 设置默认用户
    req.user = {
      employeeId: 1,
      departmentId: 1,
      position: 'Employee'
    };
  });

  describe('getRoomUsageStats', () => {
    it('should return room usage statistics successfully', async () => {
      // Arrange
      const mockStats = [
        {
          room_id: 1,
          room_name: 'Meeting Room A',
          total_bookings: 10,
          actual_uses: 8,
          usage_rate: 80.00,
          cancelled_bookings: 1,
          total_hours_booked: 15.5
        }
      ];
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      reportService.getRoomUsageStats.mockResolvedValue(mockStats);

      // Act
      await reportController.getRoomUsageStats(req, res);

      // Assert
      expect(reportService.getRoomUsageStats).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockStats
      });
    });

    it('should handle missing date parameters', async () => {
      // Arrange
      req.query = { startDate: '2024-01-01' }; // missing endDate

      // Act
      await reportController.getRoomUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start date and end date are required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle invalid date format', async () => {
      // Arrange
      req.query = {
        startDate: 'invalid-date',
        endDate: '2024-01-31'
      };

      // Act
      await reportController.getRoomUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle end date before start date', async () => {
      // Arrange
      req.query = {
        startDate: '2024-02-01',
        endDate: '2024-01-01'
      };

      // Act
      await reportController.getRoomUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'End date must be after start date',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle service error', async () => {
      // Arrange
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      reportService.getRoomUsageStats.mockRejectedValue(new Error('Database error'));

      // Act
      await reportController.getRoomUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch room usage statistics',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('getDailyUsageStats', () => {
    it('should return daily usage statistics successfully', async () => {
      // Arrange
      const mockStats = [
        {
          date_day: '2024-01-01',
          total_bookings: 5,
          actual_uses: 4,
          usage_rate: 80.00
        }
      ];
      req.params = { roomId: '1' };
      req.query = {
        month: '1',
        year: '2024'
      };
      reportService.getDailyUsageStats.mockResolvedValue(mockStats);

      // Act
      await reportController.getDailyUsageStats(req, res);

      // Assert
      expect(reportService.getDailyUsageStats).toHaveBeenCalledWith('1', 1, 2024);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockStats
      });
    });

    it('should handle missing month or year', async () => {
      // Arrange
      req.params = { roomId: '1' };
      req.query = { month: '1' }; // missing year

      // Act
      await reportController.getDailyUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Month and year are required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle non-numeric month or year', async () => {
      // Arrange
      req.params = { roomId: '1' };
      req.query = {
        month: 'abc',  // 非数字
        year: '2024'
      };

      // Act
      await reportController.getDailyUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Month and year must be numeric',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle invalid month value', async () => {
      // Arrange
      req.params = { roomId: '1' };
      req.query = {
        month: '13',  // 无效的月份
        year: '2024'
      };

      // Act
      await reportController.getDailyUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid month value',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('getBookingUsageStats', () => {
    it('should return booking usage statistics successfully', async () => {
      // Arrange
      const mockStats = [
        {
          employee_id: 1,
          employee_name: 'John Doe',
          total_bookings: 10,
          actual_uses: 8,
          cancelled_bookings: 1,
          unused_bookings: 1,
          usage_rate: 88.89
        }
      ];
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      reportService.getBookingUsageStats.mockResolvedValue(mockStats);

      // Act
      await reportController.getBookingUsageStats(req, res);

      // Assert
      expect(reportService.getBookingUsageStats).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockStats
      });
    });

    it('should handle date range exceeding maximum allowed period', async () => {
      // Arrange
      req.query = {
        startDate: '2024-01-01',
        endDate: '2025-01-01'  // 超过一年
      };

      // Act
      await reportController.getBookingUsageStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Date range cannot exceed one year',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('getLockHistory', () => {
    it('should return department lock history successfully', async () => {
      // Arrange
      const mockHistory = [
        {
          employee_id: 1,
          employee_name: 'John Doe',
          request_time: '2024-01-01T10:00:00',
          approval_status: 'Approved',
          approver_name: 'Admin User',
          approval_time: '2024-01-01T11:00:00'
        }
      ];
      req.params = { departmentId: '1' };
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      reportService.getLockHistory.mockResolvedValue(mockHistory);

      // Act
      await reportController.getLockHistory(req, res);

      // Assert
      expect(reportService.getLockHistory).toHaveBeenCalledWith(
        '1',
        expect.any(Date),
        expect.any(Date)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockHistory
      });
    });

    it('should handle unauthorized access to department history', async () => {
      // Arrange
      req.params = { departmentId: '2' };  // 不同部门
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      req.user = {
        employeeId: 1,
        departmentId: 1,
        position: 'Employee'  // 非管理员
      };

      // Act
      await reportController.getLockHistory(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.FORBIDDEN);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized to access this department history',
        code: STATUS_CODES.FORBIDDEN
      });
    });

    it('should allow admin to access any department history', async () => {
      // Arrange
      const mockHistory = [{
        employee_id: 1,
        employee_name: 'John Doe',
        request_time: '2024-01-01'
      }];
      req.params = { departmentId: '2' };
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      req.user = {
        employeeId: 1,
        departmentId: 1,
        position: 'Admin'
      };
      reportService.getLockHistory.mockResolvedValue(mockHistory);

      // Act
      await reportController.getLockHistory(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockHistory
      });
    });
  });

  describe('getSystemLogsStats', () => {
    it('should return system logs statistics successfully', async () => {
      // Arrange
      const mockStats = [
        {
          action: 'Login',
          action_count: 100,
          unique_users: 20,
          first_occurrence: '2024-01-01T00:00:00',
          last_occurrence: '2024-01-31T23:59:59'
        }
      ];
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      reportService.getSystemLogsStats.mockResolvedValue(mockStats);

      // Act
      await reportController.getSystemLogsStats(req, res);

      // Assert
      expect(reportService.getSystemLogsStats).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockStats
      });
    });

    it('should handle future dates in historical reports', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      req.query = {
        startDate: futureDate.toISOString().split('T')[0],
        endDate: futureDate.toISOString().split('T')[0]
      };

      // Act
      await reportController.getSystemLogsStats(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot generate report for future dates',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });
});