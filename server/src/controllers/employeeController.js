const employeeService = require('../services/employeeService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class EmployeeController {
    constructor() {
        this.getAllEmployees = this.getAllEmployees.bind(this);
        this.getEmployeeById = this.getEmployeeById.bind(this);
        this.createEmployee = this.createEmployee.bind(this);
        this.updateEmployee = this.updateEmployee.bind(this);
        this.deleteEmployee = this.deleteEmployee.bind(this);
    }

    async getAllEmployees(req, res) {
        try {
            const employees = await employeeService.getAllEmployees();
            res.json(successResponse(employees));
        } catch (error) {
            res
                .status(STATUS_CODES.INTERNAL_ERROR)
                .json(
                    errorResponse('Failed to fetch employees', STATUS_CODES.INTERNAL_ERROR),
                );
        }
    }

    async getEmployeeById(req, res) {
        try {
            const employeeId = parseInt(req.params.id);
            const employee = await employeeService.getEmployeeById(employeeId);
            res.json(successResponse(employee));
        } catch (error) {
            if (error.message === 'Employee not found') {
                return res
                    .status(STATUS_CODES.NOT_FOUND)
                    .json(errorResponse(error.message, STATUS_CODES.NOT_FOUND));
            }
            res
                .status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Failed to fetch employee', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async createEmployee(req, res) {
        try {
            const newEmployee = await employeeService.createEmployee(req.body);
            res.status(STATUS_CODES.CREATED).json(successResponse(newEmployee, 'Employee created successfully'));
        } catch (error) {
            if (error.message.includes('unique constraint')) {
                return res
                    .status(STATUS_CODES.BAD_REQUEST)
                    .json(
                        errorResponse('Email or username already exists', STATUS_CODES.BAD_REQUEST),
                    );
            }
            res
                .status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Failed to create employee', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async updateEmployee(req, res) {
        try {
            const employeeId = parseInt(req.params.id);
            const updatedEmployee = await employeeService.updateEmployee(employeeId, req.body);
            res.json(successResponse(updatedEmployee, 'Employee updated successfully'));
        } catch (error) {
            if (error.message === 'Employee not found') {
                return res
                    .status(STATUS_CODES.NOT_FOUND)
                    .json(errorResponse(error.message, STATUS_CODES.NOT_FOUND));
            }
            res
                .status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Failed to update employee', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async deleteEmployee(req, res) {
        try {
            const employeeId = parseInt(req.params.id);
            await employeeService.deleteEmployee(employeeId);
            res.json(successResponse(null, 'Employee deleted successfully'));
        } catch (error) {
            if (error.message.includes('Cannot delete employee')) {
                return res
                    .status(STATUS_CODES.BAD_REQUEST)
                    .json(errorResponse(error.message, STATUS_CODES.BAD_REQUEST));
            }
            res
                .status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Failed to delete employee', STATUS_CODES.INTERNAL_ERROR));
        }
    }
}

module.exports = new EmployeeController();