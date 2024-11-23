const departmentService = require('../services/departmentService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class DepartmentController {
  async getAllDepartments(req, res) {
    try {
      const departments = await departmentService.getAllDepartments();
      res.json(successResponse(departments));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch departments'));
    }
  }

  async getDepartmentById(req, res) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      res.json(successResponse(department));
    } catch (error) {
      if (error.message === 'Department not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Department not found'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch department'));
    }
  }

  async getDepartmentEmployees(req, res) {
    try {
      const employees = await departmentService.getDepartmentEmployees(req.params.id);
      res.json(successResponse(employees));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch department employees'));
    }
  }

  async createDepartment(req, res) {
    try {
      const { departmentName } = req.body;
      if (!departmentName) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Department name is required'));
      }

      const newDepartment = await departmentService.createDepartment({ departmentName });
      res.status(STATUS_CODES.CREATED)
        .json(successResponse(newDepartment, 'Department created successfully'));
    } catch (error) {
      if (error.message.includes('unique constraint')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Department name already exists'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to create department'));
    }
  }

  async updateDepartment(req, res) {
    try {
      const { departmentName } = req.body;
      if (!departmentName) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Department name is required'));
      }

      const updatedDepartment = await departmentService.updateDepartment(
        req.params.id,
        { departmentName }
      );
      res.json(successResponse(updatedDepartment, 'Department updated successfully'));
    } catch (error) {
      if (error.message === 'Department not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Department not found'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to update department'));
    }
  }

  async deleteDepartment(req, res) {
    try {
      await departmentService.deleteDepartment(req.params.id);
      res.json(successResponse(null, 'Department deleted successfully'));
    } catch (error) {
      if (error.message.includes('Cannot delete department')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(error.message));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to delete department'));
    }
  }
}

module.exports = new DepartmentController();