const employeeService = require('../services/employeeService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class EmployeeController {
  async getAllEmployees(req, res) {
    try {
      const employees = await employeeService.getAllEmployees();
      res.json(successResponse(employees));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch employees'));
    }
  }

  async getEmployeeById(req, res) {
    try {
      const employee = await employeeService.getEmployeeById(req.params.id);
      res.json(successResponse(employee));
    } catch (error) {
      if (error.message === 'Employee not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Employee not found'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch employee'));
    }
  }

  async createEmployee(req, res) {
    try {
      const newEmployee = await employeeService.createEmployee(req.body);
      res.status(STATUS_CODES.CREATED)
        .json(successResponse(newEmployee, 'Employee created successfully'));
    } catch (error) {
      if (error.message.includes('unique constraint')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Email or username already exists'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to create employee'));
    }
  }

  async updateEmployee(req, res) {
    try {
      const updatedEmployee = await employeeService.updateEmployee(req.params.id, req.body);
      res.json(successResponse(updatedEmployee, 'Employee updated successfully'));
    } catch (error) {
      if (error.message === 'Employee not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Employee not found'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to update employee'));
    }
  }

  async deleteEmployee(req, res) {
    try {
      await employeeService.deleteEmployee(req.params.id);
      res.json(successResponse(null, 'Employee deleted successfully'));
    } catch (error) {
      if (error.message.includes('Cannot delete employee')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(error.message));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to delete employee'));
    }
  }
}

module.exports = new EmployeeController();