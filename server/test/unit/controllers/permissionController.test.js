const permissionController = require('../../../src/controllers/permissionController');
const permissionService = require('../../../src/services/permissionService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

jest.mock('../../../src/services/permissionService');

describe('PermissionController', () => {
    let req;
    let res;

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        jest.clearAllMocks();
    });

    describe('getAllPermissions', () => {
        it('should return all permissions successfully', async () => {
            const mockPermissions = [
                { permissionId: 1, name: 'Create User' },
                { permissionId: 2, name: 'Edit User' },
                // ... more mock permissions
            ];
            permissionService.getAllPermissions.mockResolvedValue(mockPermissions);
            await permissionController.getAllPermissions(req, res);
            expect(permissionService.getAllPermissions).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: mockPermissions,
            });
        });

        it('should handle errors when fetching permissions', async () => {
            permissionService.getAllPermissions.mockRejectedValue(new Error('Database error'));
            await permissionController.getAllPermissions(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to fetch permissions',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('getPermissionsByPosition', () => {
        it('should return permissions by position ID successfully', async () => {
            const mockPermissions = [
                { permissionId: 1, name: 'Create User' },
                { permissionId: 2, name: 'Edit User' },
            ];
            req.params.positionId = 1;
            permissionService.getPermissionsByPosition.mockResolvedValue(mockPermissions);
            await permissionController.getPermissionsByPosition(req, res);
            expect(permissionService.getPermissionsByPosition).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: mockPermissions,
            });
        });

        it('should handle position not found error', async () => {
            req.params.positionId = 1;
            permissionService.getPermissionsByPosition.mockRejectedValue(new Error('Position not found'));
            await permissionController.getPermissionsByPosition(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Position not found',
                code: STATUS_CODES.NOT_FOUND,
            });
        });

        it('should handle errors when fetching permissions by position ID', async () => {
            req.params.positionId = 1;
            permissionService.getPermissionsByPosition.mockRejectedValue(new Error('Database error'));
            await permissionController.getPermissionsByPosition(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to fetch permissions for this position',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('updatePositionPermissions', () => {
        it('should update position permissions successfully', async () => {
            req.params.positionId = 1;
            req.body = { permissions: [1, 2] };
            permissionService.updatePositionPermissions.mockResolvedValue();
            await permissionController.updatePositionPermissions(req, res);
            expect(permissionService.updatePositionPermissions).toHaveBeenCalledWith(1, [1, 2]);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Permissions updated successfully',
                data: null,  // 接受 data: null
            });
        });

        it('should handle position not found error', async () => {
            req.params.positionId = 1;
            req.body = { permissions: [1, 2] };
            permissionService.updatePositionPermissions.mockRejectedValue(new Error('Position not found'));
            await permissionController.updatePositionPermissions(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Position not found',
                code: STATUS_CODES.NOT_FOUND,
            });
        });

        it('should handle invalid permissions format error', async () => {
            req.params.positionId = 1;
            req.body = { permissions: 'invalid format' };
            await permissionController.updatePositionPermissions(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid permissions format',
                code: STATUS_CODES.BAD_REQUEST,
            });
        });

        it('should handle errors when updating position permissions', async () => {
            req.params.positionId = 1;
            req.body = { permissions: [1, 2] };
            permissionService.updatePositionPermissions.mockRejectedValue(new Error('Database error'));
            await permissionController.updatePositionPermissions(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to update permissions',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('checkPermission', () => {
        it('should return true if employee has permission', async () => {
            req.params.employeeId = 1;
            req.params.permissionId = 1;
            permissionService.checkPermission.mockResolvedValue(true);
            await permissionController.checkPermission(req, res);
            expect(permissionService.checkPermission).toHaveBeenCalledWith(1, 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: true,
            });
        });

        it('should return false if employee does not have permission', async () => {
            req.params.employeeId = 1;
            req.params.permissionId = 1;
            permissionService.checkPermission.mockResolvedValue(false);
            await permissionController.checkPermission(req, res);
            expect(permissionService.checkPermission).toHaveBeenCalledWith(1, 1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: false,
            });
        });

        it('should handle employee not found error', async () => {
            req.params.employeeId = 1;
            req.params.permissionId = 1;
            permissionService.checkPermission.mockRejectedValue(new Error('Employee not found'));
            await permissionController.checkPermission(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Employee not found',
                code: STATUS_CODES.NOT_FOUND,
            });
        });

        it('should handle errors when checking permission', async () => {
            req.params.employeeId = 1;
            req.params.permissionId = 1;
            permissionService.checkPermission.mockRejectedValue(new Error('Database error'));
            await permissionController.checkPermission(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to check permission',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('getAvailableScreens', () => {
        it('should return available screens successfully', async () => {
            const mockScreens = ['Screen 1', 'Screen 2'];
            permissionService.getAvailableScreens.mockResolvedValue(mockScreens);
            await permissionController.getAvailableScreens(req, res);
            expect(permissionService.getAvailableScreens).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: mockScreens,
            });
        });

        it('should handle errors when fetching available screens', async () => {
            permissionService.getAvailableScreens.mockRejectedValue(new Error('Database error'));
            await permissionController.getAvailableScreens(req, res);
            expect( res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to fetch available screens',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('getUserPermissions', () => {
        it('should return user permissions successfully', async () => {
            const mockPermissions = [
                { screenName: 'Screen 1', accessLevel: 'Read' },
                { screenName: 'Screen 2', accessLevel: 'Write' },
            ];
            req.params.employeeId = 1;
            permissionService.getUserPermissions.mockResolvedValue(mockPermissions);
            await permissionController.getUserPermissions(req, res);
            expect(permissionService.getUserPermissions).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: mockPermissions,
            });
        });

        it('should handle employee not found error', async () => {
            req.params.employeeId = 1;
            permissionService.getUserPermissions.mockRejectedValue(new Error('Employee not found'));
            await permissionController.getUserPermissions(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Employee not found',
                code: STATUS_CODES.NOT_FOUND,
            });
        });

        it('should handle errors when fetching user permissions', async () => {
            req.params.employeeId = 1;
            permissionService.getUserPermissions.mockRejectedValue(new Error('Database error'));
            await permissionController.getUserPermissions(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to fetch permissions for this user',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });
});