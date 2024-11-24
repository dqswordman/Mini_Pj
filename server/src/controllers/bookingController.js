// src/controllers/bookingController.js
const bookingService = require('../services/bookingService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class BookingController {
  // 创建预订
  async createBooking(req, res) {
    try {
      const { roomId, startTime, endTime } = req.body;
      const employeeId = req.user.employeeId;

      // 基本验证
      if (!roomId || !startTime || !endTime) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Missing required fields', STATUS_CODES.BAD_REQUEST));
      }

      // 验证时间
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (start >= end) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('End time must be after start time', STATUS_CODES.BAD_REQUEST));
      }

      if (start < new Date()) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Cannot book in the past', STATUS_CODES.BAD_REQUEST));
      }

      const booking = await bookingService.createBooking({
        employeeId,
        roomId,
        startTime: start,
        endTime: end
      });

      res.status(STATUS_CODES.CREATED)
        .json(successResponse(booking, 'Booking created successfully'));
    } catch (error) {
      if (error.message.includes('Time slot is already booked')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Selected time slot is not available', STATUS_CODES.BAD_REQUEST));
      }
      if (error.message.includes('Room is disabled')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Selected room is not available', STATUS_CODES.BAD_REQUEST));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to create booking', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取预订详情
  async getBookingById(req, res) {
    try {
      const booking = await bookingService.getBookingById(req.params.id);

      // 检查访问权限
      if (booking.EMPLOYEE_ID !== req.user.employeeId && 
          !['Admin', 'Manager'].includes(req.user.position)) {
        return res.status(STATUS_CODES.FORBIDDEN)
          .json(errorResponse('Unauthorized to view this booking', STATUS_CODES.FORBIDDEN));
      }

      res.json(successResponse(booking));
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Booking not found', STATUS_CODES.NOT_FOUND));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch booking', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取用户的预订列表
  async getUserBookings(req, res) {
    try {
      const { status } = req.query;
      const employeeId = req.params.userId || req.user.employeeId;

      // 检查访问权限
      if (employeeId !== req.user.employeeId && 
          !['Admin', 'Manager'].includes(req.user.position)) {
        return res.status(STATUS_CODES.FORBIDDEN)
          .json(errorResponse('Unauthorized to view these bookings', STATUS_CODES.FORBIDDEN));
      }

      const bookings = await bookingService.getUserBookings(employeeId, status);
      res.json(successResponse(bookings));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch user bookings', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 取消预订
  async cancelBooking(req, res) {
    try {
      const { reason } = req.body;
      const bookingId = req.params.id;
      const employeeId = req.user.employeeId;

      if (!reason) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Cancellation reason is required', STATUS_CODES.BAD_REQUEST));
      }

      const cancelledBooking = await bookingService.cancelBooking(
        bookingId,
        employeeId,
        reason
      );

      res.json(successResponse(cancelledBooking, 'Booking cancelled successfully'));
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Booking not found', STATUS_CODES.NOT_FOUND));
      }
      if (error.message === 'Unauthorized to cancel this booking') {
        return res.status(STATUS_CODES.FORBIDDEN)
          .json(errorResponse('Unauthorized to cancel this booking', STATUS_CODES.FORBIDDEN));
      }
      if (error.message === 'Cannot cancel booking in current status') {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Cannot cancel booking in current status', STATUS_CODES.BAD_REQUEST));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to cancel booking', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 审批预订
  async approveBooking(req, res) {
    try {
      const { isApproved, reason } = req.body;
      const bookingId = req.params.id;
      const approverId = req.user.employeeId;

      if (isApproved === undefined || !reason) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Approval decision and reason are required', STATUS_CODES.BAD_REQUEST));
      }

      const updatedBooking = await bookingService.approveBooking(
        bookingId,
        approverId,
        isApproved,
        reason
      );

      res.json(successResponse(updatedBooking, 
        `Booking ${isApproved ? 'approved' : 'rejected'} successfully`));
    } catch (error) {
      if (error.message === 'Booking not found') {
        return res.status(STATUS_CODES.NOT_FOUND)
          .json(errorResponse('Booking not found', STATUS_CODES.NOT_FOUND));
      }
      if (error.message === 'Booking is not in pending status') {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Can only approve pending bookings', STATUS_CODES.BAD_REQUEST));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to process approval', STATUS_CODES.INTERNAL_ERROR));
    }
  }
}

module.exports = new BookingController();