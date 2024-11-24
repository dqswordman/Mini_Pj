// test/unit/controllers/departmentController.test.js
const departmentController = require('../../../src/controllers/departmentController');
const departmentService = require('../../../src/services/departmentService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

// Mock departmentService
jest.mock('../../../src/services/departmentService');

describe('DepartmentController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('getAllDepartments', () => {
    it('should return all departments successfully', async () => {
      // Arrange
      const mockDepartments = [
        { department_id: 1, department_name: 'IT', employee_count: 5 },
        { department_id: 2, department_name: 'HR', employee_count: 3 }
      ];
      departmentService.getAllDepartments.mockResolvedValue(mockDepartments);

      // Act
      await departmentController.getAllDepartments(req, res);

      // Assert
      expect(departmentService.getAllDepartments).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockDepartments
      });
    });

    it('should handle errors when fetching departments', async () => {
      // Arrange
      departmentService.getAllDepartments.mockRejectedValue(new Error('Database error'));

      // Act
      await departmentController.getAllDepartments(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        code: STATUS_CODES.INTERNAL_ERROR
      });
    });
  });

  describe('getDepartmentById', () => {
    it('should return a department successfully', async () => {
      // Arrange
      const mockDepartment = {
        department_id: 1,
        department_name: 'IT',
        employee_count: 5
      };
      req.params = { id: '1' };
      departmentService.getDepartmentById.mockResolvedValue(mockDepartment);

      // Act
      await departmentController.getDepartmentById(req, res);

      // Assert
      expect(departmentService.getDepartmentById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: mockDepartment
      });
    });

    it('should handle department not found', async () => {
      // Arrange
      req.params = { id: '999' };
      departmentService.getDepartmentById.mockRejectedValue(new Error('Department not found'));

      // Act
      await departmentController.getDepartmentById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Department not found',
        code: STATUS_CODES.NOT_FOUND
      });
    });
  });

  describe('createDepartment', () => {
    it('should create department successfully', async () => {
      // Arrange
      const mockNewDepartment = {
        department_id: 3,
        department_name: 'Finance',
        employee_count: 0
      };
      req.body = { departmentName: 'Finance' };
      departmentService.createDepartment.mockResolvedValue(mockNewDepartment);

      // Act
      await departmentController.createDepartment(req, res);

      // Assert
      expect(departmentService.createDepartment).toHaveBeenCalledWith({ 
        departmentName: 'Finance' 
      });
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Department created successfully',
        data: mockNewDepartment
      });
    });

    it('should handle missing department name', async () => {
      // Arrange
      req.body = {};

      // Act
      await departmentController.createDepartment(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Department name is required',
        code: STATUS_CODES.BAD_REQUEST
      });
      expect(departmentService.createDepartment).not.toHaveBeenCalled();
    });

    it('should handle duplicate department name', async () => {
      // Arrange
      req.body = { departmentName: 'IT' };
      const error = new Error('unique constraint');
      departmentService.createDepartment.mockRejectedValue(error);

      // Act
      await departmentController.createDepartment(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Department name already exists',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });

  describe('updateDepartment', () => {
    it('should update department successfully', async () => {
      // Arrange
      const mockUpdatedDepartment = {
        department_id: 1,
        department_name: 'Updated IT',
        employee_count: 5
      };
      req.params = { id: '1' };
      req.body = { departmentName: 'Updated IT' };
      departmentService.updateDepartment.mockResolvedValue(mockUpdatedDepartment);

      // Act
      await departmentController.updateDepartment(req, res);

      // Assert
      expect(departmentService.updateDepartment).toHaveBeenCalledWith(
        '1',
        { departmentName: 'Updated IT' }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Department updated successfully',
        data: mockUpdatedDepartment
      });
    });

    it('should handle department not found during update', async () => {
      // Arrange
      req.params = { id: '999' };
      req.body = { departmentName: 'Updated Name' };
      departmentService.updateDepartment.mockRejectedValue(new Error('Department not found'));

      // Act
      await departmentController.updateDepartment(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Department not found',
        code: STATUS_CODES.NOT_FOUND
      });
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department successfully', async () => {
      // Arrange
      req.params = { id: '1' };
      departmentService.deleteDepartment.mockResolvedValue({ 
        message: 'Department deleted successfully' 
      });

      // Act
      await departmentController.deleteDepartment(req, res);

      // Assert
      expect(departmentService.deleteDepartment).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Department deleted successfully',
        data: null
      });
    });

    it('should handle delete of department with existing employees', async () => {
      // Arrange
      req.params = { id: '1' };
      departmentService.deleteDepartment.mockRejectedValue(
        new Error('Cannot delete department with existing employees')
      );

      // Act
      await departmentController.deleteDepartment(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete department with existing employees',
        code: STATUS_CODES.BAD_REQUEST
      });
    });
  });
});