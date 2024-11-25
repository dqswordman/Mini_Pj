// test/unit/controllers/lockController.test.js
const lockController = require('../../../src/controllers/lockController');
const lockService = require('../../../src/services/lockService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

// Mock console.error to suppress error outputs during tests
console.error = jest.fn();

// Mock lockService with all required methods
jest.mock('../../../src/services/lockService', () => ({
  lockEmployee: jest.fn(),
  unlockEmployee: jest.fn(),
  getLockHistory: jest.fn(),
  getPendingUnlockRequests: jest.fn(),
  autoCheckAndLock: jest.fn()
}));

describe('LockController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
    // 模拟已认证用户
    req.user = {
      employeeId: 1,
      position: 'Manager'
    };
  });

  describe('lockEmployee', () => {
    it('should lock employee successfully', async () => {
      // Arrange
      req.params = { employeeId: '2' };
      req.body = { reason: 'Multiple unused bookings' };
      lockService.lockEmployee.mockResolvedValue({ success: true });

      // Act
      await lockController.lockEmployee(req, res);

      // Assert
      expect(lockService.lockEmployee).toHaveBeenCalledWith('2', 'Multiple unused bookings');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee locked successfully',
        data: null
      });
    });

    it('should handle missing lock reason', async () => {
      // Arrange
      req.params = { employeeId: '2' };
      req.body = {}; // missing reason

      // Act
      await lockController.lockEmployee(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Lock reason is required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle lock employee error', async () => {
      // Arrange
      req.params = { employeeId: '2' };
      req.body = { reason: 'Multiple unused bookings' };
      lockService.lockEmployee.mockRejectedValue(new Error('Database error'));

      // Act
      await lockController.lockEmployee(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to lock employee',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('unlockEmployee', () => {
    it('should unlock employee successfully', async () => {
      // Arrange
      req.params = { employeeId: '2' };
      req.body = { reason: 'Approval granted' };
      lockService.unlockEmployee.mockResolvedValue({ success: true });

      // Act
      await lockController.unlockEmployee(req, res);

      // Assert
      expect(lockService.unlockEmployee).toHaveBeenCalledWith('2', 1, 'Approval granted');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Employee unlocked successfully',
        data: null
      });
    });

    it('should handle missing unlock reason', async () => {
      // Arrange
      req.params = { employeeId: '2' };
      req.body = {}; // missing reason

      // Act
      await lockController.unlockEmployee(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unlock reason is required',
        code: STATUS_CODES.BAD_REQUEST
      });
    });

    it('should handle unlock error', async () => {
      // Arrange
      req.params = { employeeId: '2' };
      req.body = { reason: 'Approval granted' };
      lockService.unlockEmployee.mockRejectedValue(new Error('Database error'));

      // Act
      await lockController.unlockEmployee(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to unlock employee',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('getLockHistory', () => {
    it('should return lock history successfully', async () => {
      // Arrange
      const mockHistory = [
        {
          employee_id: 2,
          employee_name: 'John Doe',
          request_time: new Date(),
          approval_status: 'Pending',
          approval_reason: 'Multiple unused bookings'
        }
      ];
      req.params = { employeeId: '2' };
      lockService.getLockHistory.mockResolvedValue(mockHistory);

      // Act
      await lockController.getLockHistory(req, res);

      // Assert
      expect(lockService.getLockHistory).toHaveBeenCalledWith('2');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockHistory
      });
    });

    it('should handle error when fetching lock history', async () => {
      // Arrange
      req.params = { employeeId: '2' };
      lockService.getLockHistory.mockRejectedValue(new Error('Database error'));

      // Act
      await lockController.getLockHistory(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch lock history',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('getPendingUnlockRequests', () => {
    it('should return pending requests successfully', async () => {
      // Arrange
      const mockRequests = [
        {
          employee_id: 2,
          employee_name: 'John Doe',
          email: 'john@example.com',
          department_name: 'IT',
          request_time: new Date(),
          approval_reason: 'Multiple unused bookings'
        }
      ];
      lockService.getPendingUnlockRequests.mockResolvedValue(mockRequests);

      // Act
      await lockController.getPendingUnlockRequests(req, res);

      // Assert
      expect(lockService.getPendingUnlockRequests).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockRequests
      });
    });

    it('should handle error when fetching pending requests', async () => {
      // Arrange
      lockService.getPendingUnlockRequests.mockRejectedValue(new Error('Database error'));

      // Act
      await lockController.getPendingUnlockRequests(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch unlock requests',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('autoCheckAndLock', () => {
    it('should perform auto lock check successfully', async () => {
      // Arrange
      const mockLockedEmployees = [
        {
          employee_id: 2,
          employee_name: 'John Doe',
          unused_count: 3
        }
      ];
      lockService.autoCheckAndLock.mockResolvedValue(mockLockedEmployees);

      // Act
      await lockController.autoCheckAndLock(req, res);

      // Assert
      expect(lockService.autoCheckAndLock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '1 employees have been locked',
        data: mockLockedEmployees
      });
    });

    it('should handle error during auto lock check', async () => {
      // Arrange
      lockService.autoCheckAndLock.mockRejectedValue(new Error('Database error'));

      // Act
      await lockController.autoCheckAndLock(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to run auto lock check',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });

    it('should handle no employees to lock', async () => {
      // Arrange
      const mockLockedEmployees = [];
      lockService.autoCheckAndLock.mockResolvedValue(mockLockedEmployees);

      // Act
      await lockController.autoCheckAndLock(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '0 employees have been locked',
        data: mockLockedEmployees
      });
    });
  });
});