const permissionService = require('../services/permissionService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class PermissionController {
    constructor() {
        this.getAllPermissions = this.getAllPermissions.bind(this);
        this.getPermissionsByPosition = this.getPermissionsByPosition.bind(this);
        this.updatePositionPermissions = this.updatePositionPermissions.bind(this);
        this.checkPermission = this.checkPermission.bind(this);
        this.getAvailableScreens = this.getAvailableScreens.bind(this);
        this.getUserPermissions = this.getUserPermissions.bind(this);
    }

    async getAllPermissions(req, res) {
        try {
            const permissions = await permissionService.getAllPermissions();
            res.json(successResponse(permissions));
        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_ERROR).json(errorResponse('Failed to fetch permissions', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async getPermissionsByPosition(req, res) {
        try {
            const positionId = parseInt(req.params.positionId);
            const permissions = await permissionService.getPermissionsByPosition(positionId);
            res.json(successResponse(permissions));
        } catch (error) {
            if (error.message === 'Position not found') {
                return res.status(STATUS_CODES.NOT_FOUND).json(errorResponse(error.message, STATUS_CODES.NOT_FOUND));
            }
            res.status(STATUS_CODES.INTERNAL_ERROR).json(errorResponse('Failed to fetch permissions for this position', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async updatePositionPermissions(req, res) {
        try {
            const positionId = parseInt(req.params.positionId);
            const { permissions } = req.body;
            if (!Array.isArray(permissions)) {
                return res.status(STATUS_CODES.BAD_REQUEST).json(errorResponse('Invalid permissions format', STATUS_CODES.BAD_REQUEST));
            }
            await permissionService.updatePositionPermissions(positionId, permissions);
            res.json(successResponse(null, 'Permissions updated successfully')); 
        } catch (error) {
            if (error.message === 'Position not found') {
                return res.status(STATUS_CODES.NOT_FOUND).json(errorResponse(error.message, STATUS_CODES.NOT_FOUND));
            }
            res.status(STATUS_CODES.INTERNAL_ERROR).json(errorResponse('Failed to update permissions', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async checkPermission(req, res) {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const permissionId = parseInt(req.params.permissionId);
            const hasPermission = await permissionService.checkPermission(employeeId, permissionId);
            res.json(successResponse(hasPermission));
        } catch (error) {
            if (error.message === 'Employee not found') {
                return res.status(STATUS_CODES.NOT_FOUND).json(errorResponse(error.message, STATUS_CODES.NOT_FOUND));
            }
            res.status(STATUS_CODES.INTERNAL_ERROR).json(errorResponse('Failed to check permission', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async getAvailableScreens(req, res) {
        try {
            const screens = await permissionService.getAvailableScreens();
            res.json(successResponse(screens));
        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_ERROR).json(errorResponse('Failed to fetch available screens', STATUS_CODES.INTERNAL_ERROR));
        }
    }

    async getUserPermissions(req, res) {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const permissions = await permissionService.getUserPermissions(employeeId);
            res.json(successResponse(permissions));
        } catch (error) {
            if (error.message === 'Employee not found') {
                return res.status(STATUS_CODES.NOT_FOUND).json(errorResponse(error.message, STATUS_CODES.NOT_FOUND));
            }
            res.status(STATUS_CODES.INTERNAL_ERROR).json(errorResponse('Failed to fetch permissions for this user', STATUS_CODES.INTERNAL_ERROR));
        }
    }
}

module.exports = new PermissionController();

