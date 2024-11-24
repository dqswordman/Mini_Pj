// src/controllers/roomController.js
const roomService = require('../services/roomService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class RoomController {
  async getAllRooms(req, res) {
    try {
      const rooms = await roomService.getAllRooms();
      res.json(successResponse(rooms));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch rooms', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  async getRoomById(req, res) {
    try {
      const room = await roomService.getRoomById(req.params.id);
      res.json(successResponse(room));
    } catch (error) {
      if (error.message === 'Room not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Room not found', STATUS_CODES.NOT_FOUND));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch room', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  async createRoom(req, res) {
    try {
      const { 
        roomName, 
        buildingId, 
        floorNumber, 
        capacity, 
        isDisabled,
        amenities 
      } = req.body;

      if (!roomName || !buildingId || !floorNumber || !capacity) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Missing required fields', STATUS_CODES.BAD_REQUEST));
      }

      const newRoom = await roomService.createRoom({
        roomName,
        buildingId,
        floorNumber,
        capacity,
        isDisabled: isDisabled || 0,
        amenities: amenities || []
      });

      res.status(STATUS_CODES.CREATED)
        .json(successResponse(newRoom, 'Room created successfully'));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to create room', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  async updateRoom(req, res) {
    try {
      const { 
        roomName, 
        buildingId, 
        floorNumber, 
        capacity, 
        isDisabled,
        amenities 
      } = req.body;

      if (!roomName || !buildingId || !floorNumber || !capacity) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Missing required fields', STATUS_CODES.BAD_REQUEST));
      }

      const updatedRoom = await roomService.updateRoom(req.params.id, {
        roomName,
        buildingId,
        floorNumber,
        capacity,
        isDisabled,
        amenities
      });

      res.json(successResponse(updatedRoom, 'Room updated successfully'));
    } catch (error) {
      if (error.message === 'Room not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Room not found', STATUS_CODES.NOT_FOUND));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to update room', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  async deleteRoom(req, res) {
    try {
      await roomService.deleteRoom(req.params.id);
      res.json(successResponse(null, 'Room deleted successfully'));
    } catch (error) {
      if (error.message.includes('Cannot delete room')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(error.message, STATUS_CODES.BAD_REQUEST));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to delete room', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  async getRoomAvailability(req, res) {
    try {
      const { id } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Date is required', STATUS_CODES.BAD_REQUEST));
      }

      const availability = await roomService.getRoomAvailability(id, new Date(date));
      res.json(successResponse(availability));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch room availability', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  async searchRooms(req, res) {
    try {
      const { 
        buildingId, 
        floorNumber, 
        minCapacity, 
        startTime, 
        endTime 
      } = req.query;

      const rooms = await roomService.searchRooms({
        buildingId: buildingId ? parseInt(buildingId) : null,
        floorNumber: floorNumber ? parseInt(floorNumber) : null,
        minCapacity: minCapacity ? parseInt(minCapacity) : null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null
      });

      res.json(successResponse(rooms));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to search rooms', STATUS_CODES.INTERNAL_ERROR));
    }
  }
}

module.exports = new RoomController();