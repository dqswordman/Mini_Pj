// src/controllers/reportController.js
const reportService = require('../services/reportService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class ReportController {
  
  // 获取会议室使用统计
  async getRoomUsageStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      const stats = await reportService.getRoomUsageStats(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(successResponse(stats));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch room usage statistics', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取每日使用统计
  async getDailyUsageStats(req, res) {
    try {
      const { roomId } = req.params;
      const { month, year } = req.query;

      if (!month || !year) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Month and year are required', STATUS_CODES.BAD_REQUEST));
      }

      const stats = await reportService.getDailyUsageStats(
        roomId,
        parseInt(month),
        parseInt(year)
      );
      res.json(successResponse(stats));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch daily usage statistics', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取预订使用对比
  async getBookingUsageStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      const stats = await reportService.getBookingUsageStats(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(successResponse(stats));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch booking usage statistics', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取锁定统计
  async getLockStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      const stats = await reportService.getLockStats(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(successResponse(stats));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch lock statistics', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取锁定历史
  async getLockHistory(req, res) {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      const history = await reportService.getLockHistory(
        departmentId,
        new Date(startDate),
        new Date(endDate)
      );
      res.json(successResponse(history));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch lock history', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取系统日志统计
  async getSystemLogsStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      const stats = await reportService.getSystemLogsStats(
        new Date(startDate),
        new Date(endDate)
      );
      res.json(successResponse(stats));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch system logs statistics', STATUS_CODES.INTERNAL_ERROR));
    }
  }
}

module.exports = new ReportController();