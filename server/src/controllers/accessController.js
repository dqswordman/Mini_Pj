// src/controllers/accessController.js
const accessService = require('../services/accessService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class AccessController {
  // 记录访问
  async recordAccess(req, res) {
    try {
      const { bookingId, secretNumber } = req.body;

      if (!bookingId || !secretNumber) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Booking ID and secret number are required', STATUS_CODES.BAD_REQUEST));
      }

      // 验证SECRET NUMBER
      const isValid = await accessService.verifySecretNumber(bookingId, secretNumber);
      if (!isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Invalid secret number', STATUS_CODES.BAD_REQUEST));
      }

      const accessLog = await accessService.createAccessLog(bookingId);
      res.status(STATUS_CODES.CREATED)
        .json(successResponse(accessLog, 'Access recorded successfully'));
    } catch (error) {
      if (error.message.includes('outside booking time')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Access attempt outside booking time window', STATUS_CODES.BAD_REQUEST));
      }
      if (error.message.includes('not approved')) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Booking is not approved', STATUS_CODES.BAD_REQUEST));
      }
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to record access', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 生成QR码
  async generateQRCode(req, res) {
    try {
      const { bookingId } = req.params;
      
      // 验证预订是否属于当前用户
      const booking = await accessService.getBookingById(bookingId);
      if (booking.EMPLOYEE_ID !== req.user.employeeId) {
        return res.status(STATUS_CODES.FORBIDDEN)
          .json(errorResponse('Unauthorized to access this booking', STATUS_CODES.FORBIDDEN));
      }

      const qrCode = await accessService.generateQRCode(bookingId, booking.SECRET_NUMBER);

      res.json(successResponse({ qrCode }));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to generate QR code', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取访问记录
  async getAccessLogs(req, res) {
    try {
      const { bookingId } = req.params;
      const logs = await accessService.getAccessLogs(bookingId);
      res.json(successResponse(logs));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch access logs', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 检查未使用的预订
  async checkUnusedBookings(req, res) {
    try {
      const unusedBookings = await accessService.checkUnusedBookings();
      res.json(successResponse(unusedBookings));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to check unused bookings', STATUS_CODES.INTERNAL_ERROR));
    }
  }
}

module.exports = new AccessController();