// src/controllers/reportController.js
const reportService = require('../services/reportService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class ReportController {
  // 验证日期
  validateDates(startDate, endDate) {
    // 检查日期格式
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, message: 'Invalid date format' };
    }

    // 检查日期顺序
    if (start >= end) {
      return { isValid: false, message: 'End date must be after start date' };
    }

    // 检查日期范围（不超过1年）
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYear) {
      return { isValid: false, message: 'Date range cannot exceed one year' };
    }

    // 检查未来日期
    const now = new Date();
    if (end > now) {
      return { isValid: false, message: 'Cannot generate report for future dates' };
    }

    return { isValid: true };
  }

  // 验证月份和年份
  validateMonthYear(month, year) {
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum)) {
      return { isValid: false, message: 'Month and year must be numeric' };
    }

    if (monthNum < 1 || monthNum > 12) {
      return { isValid: false, message: 'Invalid month value' };
    }

    return { isValid: true };
  }

  // 获取会议室使用统计
  async getRoomUsageStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(dateValidation.message, STATUS_CODES.BAD_REQUEST));
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

      const validation = this.validateMonthYear(month, year);
      if (!validation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(validation.message, STATUS_CODES.BAD_REQUEST));
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

      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(dateValidation.message, STATUS_CODES.BAD_REQUEST));
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

      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(dateValidation.message, STATUS_CODES.BAD_REQUEST));
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
      
      // 权限检查
      if (req.user.position !== 'Admin' && req.user.departmentId !== departmentId) {
        return res.status(STATUS_CODES.FORBIDDEN)
          .json(errorResponse('Unauthorized to access this department history', STATUS_CODES.FORBIDDEN));
      }

      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(dateValidation.message, STATUS_CODES.BAD_REQUEST));
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

      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(dateValidation.message, STATUS_CODES.BAD_REQUEST));
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