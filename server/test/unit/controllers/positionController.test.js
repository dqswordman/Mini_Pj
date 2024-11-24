// test/unit/controllers/positionController.test.js
const positionController = require('../../../src/controllers/positionController');
const positionService = require('../../../src/services/positionService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

// Mock console.error to suppress error outputs during tests
console.error = jest.fn();

// Mock positionService
jest.mock('../../../src/services/positionService');

describe('PositionController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('getAllPositions', () => {
    it('should return all positions successfully', async () => {
      // Arrange
      const mockPositions = [
        { 
          position_id: 1, 
          position_name: 'Manager', 
          employee_count: 5,
          permission_count: 3
        },
        { 
          position_id: 2, 
          position_name: 'Developer', 
          employee_count: 10,
          permission_count: 2
        }
      ];
      positionService.getAllPositions.mockResolvedValue(mockPositions);

      // Act
      await positionController.getAllPositions(req, res);

      // Assert
      expect(positionService.getAllPositions).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockPositions
      });
    });

    it('should handle errors when fetching positions', async () => {
      // Arrange
      positionService.getAllPositions.mockRejectedValue(new Error('Database error'));

      // Act
      await positionController.getAllPositions(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch positions',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('getPositionById', () => {
    it('should return position by id successfully', async () => {
      // Arrange
      const mockPosition = {
        position_id: 1,
        position_name: 'Manager',
        employee_count: 5,
        permission_count: 3
      };
      req.params = { id: '1' };
      positionService.getPositionById.mockResolvedValue(mockPosition);

      // Act
      await positionController.getPositionById(req, res);

      // Assert
      expect(positionService.getPositionById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockPosition
      });
    });

    it('should handle position not found', async () => {
      // Arrange
      req.params = { id: '999' };
      positionService.getPositionById.mockRejectedValue(new Error('Position not found'));

      // Act
      await positionController.getPositionById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Position not found',
        code: STATUS_CODES.NOT_FOUND
      });
    });
  });

  describe('getPositionEmployees', () => {
    it('should return position employees successfully', async () => {
      // Arrange
      const mockEmployees = [
        { 
          employee_id: 1, 
          name: 'John Doe',
          email: 'john@example.com',
          department_name: 'IT'
        }
      ];
      req.params = { id: '1' };
      positionService.getPositionEmployees.mockResolvedValue(mockEmployees);

      // Act
      await positionController.getPositionEmployees(req, res);

      // Assert
      expect(positionService.getPositionEmployees).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockEmployees
      });
    });
  });

  describe('getPositionPermissions', () => {
    it('should return position permissions successfully', async () => {
      // Arrange
      const mockPermissions = [
        {
          permission_id: 1,
          screen_name: 'UserManagement',
          access_level: 'Write'
        }
      ];
      req.params = { id: '1' };
      positionService.getPositionPermissions.mockResolvedValue(mockPermissions);

      // Act
      await positionController.getPositionPermissions(req, res);

      // Assert
      expect(positionService.getPositionPermissions).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockPermissions
      });
    });
  });

  describe('createPosition', () => {
    it('should create position successfully', async () => {
      // Arrange
      const positionData = {
        positionName: 'New Position',
        permissions: [
          { screenName: 'Dashboard', accessLevel: 'Read' }
        ]
      };
      const mockNewPosition = {
        position_id: 3,
        position_name: 'New Position',
        employee_count: 0,
        permission_count: 1
      };
      req.body = positionData;
      positionService.createPosition.mockResolvedValue(mockNewPosition);

      // Act
      await positionController.createPosition(req, res);

      // Assert
      expect(positionService.createPosition).toHaveBeenCalledWith(positionData);
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Position created successfully',
        data: mockNewPosition
      });
    });

    it('should handle duplicate position name', async () => {
      // Arrange
      req.body = { positionName: 'Existing Position' };
      positionService.createPosition.mockRejectedValue(new Error('unique constraint'));

      // Act
      await positionController.createPosition(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Position name already exists',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('updatePosition', () => {
    it('should update position successfully', async () => {
      // Arrange
      const updateData = {
        positionName: 'Updated Position',
        permissions: [
          { screenName: 'Dashboard', accessLevel: 'Write' }
        ]
      };
      const mockUpdatedPosition = {
        position_id: 1,
        position_name: 'Updated Position',
        employee_count: 5,
        permission_count: 1
      };
      req.params = { id: '1' };
      req.body = updateData;
      positionService.updatePosition.mockResolvedValue(mockUpdatedPosition);

      // Act
      await positionController.updatePosition(req, res);

      // Assert
      expect(positionService.updatePosition).toHaveBeenCalledWith('1', updateData);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Position updated successfully',
        data: mockUpdatedPosition
      });
    });
  });

  describe('deletePosition', () => {
    it('should delete position successfully', async () => {
      // Arrange
      req.params = { id: '1' };
      positionService.deletePosition.mockResolvedValue({ 
        message: 'Position deleted successfully' 
      });

      // Act
      await positionController.deletePosition(req, res);

      // Assert
      expect(positionService.deletePosition).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Position deleted successfully',
        data: null
      });
    });

    it('should handle delete of position with existing employees', async () => {
      // Arrange
      req.params = { id: '1' };
      positionService.deletePosition.mockRejectedValue(
        new Error('Cannot delete position with existing employees')
      );

      // Act
      await positionController.deletePosition(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete position with existing employees',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });
});