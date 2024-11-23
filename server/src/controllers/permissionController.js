const permissionService = require('../services/permissionService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class PermissionController {
  async getAllPermissions(req, res) {
    try {
      const permissions = await permissionService.getAllPermissions();
      res.json(successResponse(permissions));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch permissions'));
    }
  }

  async getPermissionsByPosition(req, res) {
    try {
      const permissions = await permissionService.getPermissionsByPosition(req.params.positionId);
      res.json(successResponse(permissions));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch position permissions'));
    }
  }

  async updatePositionPermissions(req, res) {
    try {
      const { positionId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Permissions must be an array'));
      }

      const updatedPermissions = await permissionService.updatePositionPermissions(
        positionId,
        permissions
      );
      res.json(successResponse(updatedPermissions, 'Permissions updated successfully'));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to update permissions'));
    }
  }

  async checkPermission(req, res) {
    try {
      const { employeeId, screenName, requiredLevel } = req.body;
      const hasPermission = await permissionService.checkPermission(
        employeeId,
        screenName,
        requiredLevel
      );
      res.json(successResponse({ hasPermission }));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to check permission'));
    }
  }

  async getAvailableScreens(req, res) {
    try {
      const screens = await permissionService.getAvailableScreens();
      res.json(successResponse(screens));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch available screens'));
    }
  }

  async getUserPermissions(req, res) {
    try {
      const permissions = await permissionService.getUserPermissions(req.params.employeeId);
      res.json(successResponse(permissions));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch user permissions'));
    }
  }
}

module.exports = new PermissionController();