const positionService = require('../services/positionService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class PositionController {
  async getAllPositions(req, res) {
    try {
      const positions = await positionService.getAllPositions();
      res.json(successResponse(positions));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch positions'));
    }
  }

  async getPositionById(req, res) {
    try {
      const position = await positionService.getPositionById(req.params.id);
      res.json(successResponse(position));
    } catch (error) {
      if (error.message === 'Position not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Position not found'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch position'));
    }
  }

  async getPositionEmployees(req, res) {
    try {
      const employees = await positionService.getPositionEmployees(req.params.id);
      res.json(successResponse(employees));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch position employees'));
    }
  }

  async getPositionPermissions(req, res) {
    try {
      const permissions = await positionService.getPositionPermissions(req.params.id);
      res.json(successResponse(permissions));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch position permissions'));
    }
  }

  async createPosition(req, res) {
    try {
      const newPosition = await positionService.createPosition(req.body);
      res.status(STATUS_CODES.CREATED)
        .json(successResponse(newPosition, 'Position created successfully'));
    } catch (error) {
      if (error.message.includes('unique constraint')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Position name already exists'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to create position'));
    }
  }

  async updatePosition(req, res) {
    try {
      const updatedPosition = await positionService.updatePosition(req.params.id, req.body);
      res.json(successResponse(updatedPosition, 'Position updated successfully'));
    } catch (error) {
      if (error.message === 'Position not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Position not found'));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to update position'));
    }
  }

  async deletePosition(req, res) {
    try {
      await positionService.deletePosition(req.params.id);
      res.json(successResponse(null, 'Position deleted successfully'));
    } catch (error) {
      if (error.message.includes('Cannot delete position')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(error.message));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to delete position'));
    }
  }
}

module.exports = new PositionController();