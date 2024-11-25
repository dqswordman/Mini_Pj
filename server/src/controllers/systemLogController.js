const systemLogService = require('../services/systemLogService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class SystemLogController {
    constructor() {
        this.getLogs = this.getLogs.bind(this);
        this.createLog = this.createLog.bind(this);
    }

    async getLogs(req, res) {
        try {
            const { startDate, endDate, action, userId, page = 1, pageSize = 10 } = req.query;

            // 添加日期校验逻辑
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
                return res
                    .status(STATUS_CODES.BAD_REQUEST)
                    .json(
                        errorResponse(
                            'Start date and end date are required and must be in YYYY-MM-DD format',
                            STATUS_CODES.BAD_REQUEST,
                        ),
                    );
            }
            if (startDate > endDate) {
                return res
                    .status(STATUS_CODES.BAD_REQUEST)
                    .json(
                        errorResponse(
                            'End date must be after start date',
                            STATUS_CODES.BAD_REQUEST,
                        ),
                    );
            }

            const logs = await systemLogService.getLogs({
                startDate,
                endDate,
                action,
                userId,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
            });
            res.json(successResponse(logs));
        } catch (error) {
            res
                .status(STATUS_CODES.INTERNAL_ERROR)
                .json(
                    errorResponse('Failed to fetch system logs', STATUS_CODES.INTERNAL_ERROR),
                );
        }
    }

    async createLog(req, res) {
        try {
            const { action, userId, details } = req.body;
            if (!action || !userId) {
                return res
                    .status(STATUS_CODES.BAD_REQUEST)
                    .json(
                        errorResponse('Action and userId are required', STATUS_CODES.BAD_REQUEST),
                    );
            }
            const log = await systemLogService.createLog({
                action,
                userId,
                details,
            });
            res.status(STATUS_CODES.CREATED).json(successResponse(log, 'Action logged successfully'));
        } catch (error) {
            res
                .status(STATUS_CODES.INTERNAL_ERROR)
                .json(
                    errorResponse('Failed to log action', STATUS_CODES.INTERNAL_ERROR),
                );
        }
    }
}

module.exports = new SystemLogController();