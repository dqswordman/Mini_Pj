const employeeController = require('../../../src/controllers/employeeController');
const employeeService = require('../../../src/services/employeeService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

jest.mock('../../../src/services/employeeService');

describe('EmployeeController', () => {
    let req;
    let res;

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        jest.clearAllMocks();
    });

    describe('getAllEmployees', () => {
        it('should return all employees successfully', async () => {
            const mockEmployees = [
                {
                    employeeId: 1,
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    // ... other employee properties
                },
                // ... more mock employees
            ];
            employeeService.getAllEmployees.mockResolvedValue(mockEmployees);
            await employeeController.getAllEmployees(req, res);
            expect(employeeService.getAllEmployees).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: mockEmployees,
            });
        });

        it('should handle errors when fetching employees', async () => {
            employeeService.getAllEmployees.mockRejectedValue(new Error('Database error'));
            await employeeController.getAllEmployees(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to fetch employees',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('getEmployeeById', () => {
        it('should return an employee by ID successfully', async () => {
            const mockEmployee = {
                employeeId: 1,
                name: 'John Doe',
                email: 'john.doe@example.com',
                // ... other employee properties
            };
            req.params.id = 1;
            employeeService.getEmployeeById.mockResolvedValue(mockEmployee);
            await employeeController.getEmployeeById(req, res);
            expect(employeeService.getEmployeeById).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: mockEmployee,
            });
        });

        it('should handle employee not found error', async () => {
            req.params.id = 1;
            employeeService.getEmployeeById.mockRejectedValue(new Error('Employee not found'));
            await employeeController.getEmployeeById(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Employee not found',
                code: STATUS_CODES.NOT_FOUND,
            });
        });

        it('should handle errors when fetching employee by ID', async () => {
            req.params.id = 1;
            employeeService.getEmployeeById.mockRejectedValue(new Error('Database error'));
            await employeeController.getEmployeeById(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to fetch employee',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('createEmployee', () => {
        it('should create an employee successfully', async () => {
            const mockEmployee = {
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                // ... other employee properties
            };
            req.body = mockEmployee;
            employeeService.createEmployee.mockResolvedValue(mockEmployee);
            await employeeController.createEmployee(req, res);
            expect(employeeService.createEmployee).toHaveBeenCalledWith(mockEmployee);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Employee created successfully',
                data: mockEmployee,
            });
        });

        it('should handle unique constraint error', async () => {
            req.body = {
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                // ... other employee properties
            };
            employeeService.createEmployee.mockRejectedValue(new Error('ORA-00001: unique constraint violated'));
            await employeeController.createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email or username already exists',
                code: STATUS_CODES.BAD_REQUEST,
            });
        });

        it('should handle errors when creating an employee', async () => {
            req.body = {
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                // ... other employee properties
            };
            employeeService.createEmployee.mockRejectedValue(new Error('Database error'));
            await employeeController.createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to create employee',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('updateEmployee', () => {
        it('should update an employee successfully', async () => {
            const mockEmployee = {
                employeeId: 1,
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                // ... other employee properties
            };
            req.params.id = 1;
            req.body = mockEmployee;
            employeeService.updateEmployee.mockResolvedValue(mockEmployee);
            await employeeController.updateEmployee(req, res);
            expect(employeeService.updateEmployee).toHaveBeenCalledWith(1, mockEmployee);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Employee updated successfully',
                data: mockEmployee,
            });
        });

        it('should handle employee not found error', async () => {
            req.params.id = 1;
            req.body = {
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                // ... other employee properties
            };
            employeeService.updateEmployee.mockRejectedValue(new Error('Employee not found'));
            await employeeController.updateEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Employee not found',
                code: STATUS_CODES.NOT_FOUND,
            });
        });

        it('should handle errors when updating an employee', async () => {
            req.params.id = 1;
            req.body = {
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                // ... other employee properties
            };
            employeeService.updateEmployee.mockRejectedValue(new Error('Database error'));
            await employeeController.updateEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to update employee',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('deleteEmployee', () => {
        it('should delete an employee successfully', async () => {
            req.params.id = 1;
            employeeService.deleteEmployee.mockResolvedValue();
            await employeeController.deleteEmployee(req, res);
            expect(employeeService.deleteEmployee).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Employee deleted successfully',
                data: null,
            });
        });

        it('should handle errors when deleting an employee', async () => {
            req.params.id = 1;
            employeeService.deleteEmployee.mockRejectedValue(new Error('Database error'));
            await employeeController.deleteEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to delete employee',
                code: STATUS_CODES.INTERNAL_ERROR, // Add the code property here
            });
        });

        it('should handle "Cannot delete employee" error', async () => {
            req.params.id = 1;
            employeeService.deleteEmployee.mockRejectedValue(new Error('Cannot delete employee with ID 1 because they have associated bookings.'));
            await employeeController.deleteEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Cannot delete employee with ID 1 because they have associated bookings.',
                code: STATUS_CODES.BAD_REQUEST, // Add the code property here
            });
        });
    });
});