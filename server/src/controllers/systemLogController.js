// src/controllers/systemLogController.js
const systemLogService = require('../services/systemLogService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class SystemLogController {
  // 获取系统日志
  async getLogs(req, res) {
    try {
      const { 
        startDate, 
        endDate, 
        action, 
        userId,
        page = 1,
        pageSize = 10
      } = req.query;

      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      // 验证日期格式和范围
      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(dateValidation.message, STATUS_CODES.BAD_REQUEST));
      }

      const logs = await systemLogService.getLogs({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        action,
        userId,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      res.json(successResponse(logs));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch system logs', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取日志统计
  async getLogStats(req, res) {
    try {
      const { startDate, endDate, groupBy } = req.query;

      if (!startDate || !endDate) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Start date and end date are required', STATUS_CODES.BAD_REQUEST));
      }

      // 验证日期格式和范围
      const dateValidation = this.validateDates(startDate, endDate);
      if (!dateValidation.isValid) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse(dateValidation.message, STATUS_CODES.BAD_REQUEST));
      }

      // 验证分组参数
      if (groupBy && !['action', 'user', 'date'].includes(groupBy)) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Invalid groupBy parameter', STATUS_CODES.BAD_REQUEST));
      }

      const stats = await systemLogService.getLogStats(
        new Date(startDate),
        new Date(endDate),
        groupBy
      );

      res.json(successResponse(stats));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch log statistics', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 记录系统操作
  async logAction(req, res) {
    try {
      const { action, details } = req.body;
      const userId = req.user.employeeId;

      if (!action) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Action is required', STATUS_CODES.BAD_REQUEST));
      }

      const log = await systemLogService.createLog({
        action,
        userId,
        details: details || null
      });

      res.status(STATUS_CODES.CREATED)
        .json(successResponse(log, 'Action logged successfully'));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to log action', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 清理旧日志
  async cleanupOldLogs(req, res) {
    try {
      // 验证权限
      if (req.user.position !== 'Admin') {
        return res.status(STATUS_CODES.FORBIDDEN)
          .json(errorResponse('Only administrators can clean up logs', STATUS_CODES.FORBIDDEN));
      }

      const { retentionDays } = req.body;

      if (!retentionDays || retentionDays < 30) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Retention days must be at least 30', STATUS_CODES.BAD_REQUEST));
      }

      const result = await systemLogService.cleanupOldLogs(retentionDays);
      res.json(successResponse(result, 'Old logs cleaned up successfully'));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to clean up logs', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 验证日期
  validateDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, message: 'Invalid date format' };
    }

    if (start >= end) {
      return { isValid: false, message: 'End date must be after start date' };
    }

    // 检查日期范围（不超过1年）
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYear) {
      return { isValid: false, message: 'Date range cannot exceed one year' };
    }

    return { isValid: true };
  }
}

module.exports = new SystemLogController();