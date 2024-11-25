// src/controllers/lockController.js
const lockService = require('../services/lockService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class LockController {
  // 锁定员工
  async lockEmployee(req, res) {
    try {
      const { employeeId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Lock reason is required', STATUS_CODES.BAD_REQUEST));
      }

      await lockService.lockEmployee(employeeId, reason);
      res.json(successResponse(null, 'Employee locked successfully'));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to lock employee', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 解锁员工
  async unlockEmployee(req, res) {
    try {
      const { employeeId } = req.params;
      const { reason } = req.body;
      const approverId = req.user.employeeId;

      if (!reason) {
        return res.status(STATUS_CODES.BAD_REQUEST)
          .json(errorResponse('Unlock reason is required', STATUS_CODES.BAD_REQUEST));
      }

      await lockService.unlockEmployee(employeeId, approverId, reason);
      res.json(successResponse(null, 'Employee unlocked successfully'));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to unlock employee', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取锁定历史
  async getLockHistory(req, res) {
    try {
      const { employeeId } = req.params;
      const history = await lockService.getLockHistory(employeeId);
      res.json(successResponse(history));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch lock history', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 获取待处理的解锁请求
  async getPendingUnlockRequests(req, res) {
    try {
      const requests = await lockService.getPendingUnlockRequests();
      res.json(successResponse(requests));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to fetch unlock requests', STATUS_CODES.INTERNAL_ERROR));
    }
  }

  // 自动检查和锁定
  async autoCheckAndLock(req, res) {
    try {
      const lockedEmployees = await lockService.autoCheckAndLock();
      res.json(successResponse(lockedEmployees, 
        `${lockedEmployees.length} employees have been locked`));
    } catch (error) {
      res.status(STATUS_CODES.INTERNAL_ERROR)
        .json(errorResponse('Failed to run auto lock check', STATUS_CODES.INTERNAL_ERROR));
    }
  }
}

module.exports = new LockController();