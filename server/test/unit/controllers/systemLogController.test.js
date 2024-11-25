const systemLogController = require('../../../src/controllers/systemLogController');
const systemLogService = require('../../../src/services/systemLogService');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');
const { STATUS_CODES } = require('../../../src/utils/responseUtils');

jest.mock('../../../src/services/systemLogService');

describe('SystemLogController', () => {
    let req;
    let res;

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        jest.clearAllMocks();
    });

    describe('getLogs', () => {
        it('should return logs successfully', async () => {
            const mockLogs = {
                logs: [
                    {
                        LOGID: 1,
                        ACTION: 'Login',
                        USER_ID: 1,
                        TIMESTAMP: '2024-02-01T09:00:00',
                        DETAILS: 'User logged in successfully',
                    },
                ],
                pagination: {
                    currentPage: 1,
                    pageSize: 10,
                    totalCount: 1,
                    totalPages: 1,
                },
            };
            req.query = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
            };
            systemLogService.getLogs.mockResolvedValue(mockLogs);
            await systemLogController.getLogs(req, res);
            expect(systemLogService.getLogs).toHaveBeenCalledWith({
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                action: undefined,
                userId: undefined,
                page: 1,
                pageSize: 10,
            });
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Success',
                data: mockLogs,
            });
        });

        it('should handle missing date parameters', async () => {
            req.query = {};
            await systemLogController.getLogs(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Start date and end date are required and must be in YYYY-MM-DD format',
                code: STATUS_CODES.BAD_REQUEST,
            });
        });

        it('should handle invalid date format', async () => {
            req.query = {
                startDate: 'invalid-date',
                endDate: '2024-01-31',
            };
            await systemLogController.getLogs(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Start date and end date are required and must be in YYYY-MM-DD format',
                code: STATUS_CODES.BAD_REQUEST,
            });
        });

        it('should handle end date before start date', async () => {
            req.query = {
                startDate: '2024-01-31',
                endDate: '2024-01-01',
            };
            await systemLogController.getLogs(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'End date must be after start date',
                code: STATUS_CODES.BAD_REQUEST,
            });
        });

        it('should handle service errors', async () => {
            req.query = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
            };
            systemLogService.getLogs.mockRejectedValue(new Error('Database error'));
            await systemLogController.getLogs(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to fetch system logs',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });

    describe('createLog', () => {
        it('should create log successfully', async () => {
            const mockLog = {
                logId: 1,
                action: 'Create',
                userId: 1,
                details: 'New user created',
                timestamp: expect.any(Date),
            };
            req.body = {
                action: 'Create',
                userId: 1,
                details: 'New user created',
            };
            systemLogService.createLog.mockResolvedValue(mockLog);
            await systemLogController.createLog(req, res);
            expect(systemLogService.createLog).toHaveBeenCalledWith({
                action: 'Create',
                userId: 1,
                details: 'New user created',
            });
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.CREATED);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Action logged successfully',
                data: mockLog,
            });
        });

        it('should handle missing action or userId', async () => {
            req.body = {
                details: 'Incomplete data',
            };
            await systemLogController.createLog(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Action and userId are required',
                code: STATUS_CODES.BAD_REQUEST,
            });
        });

        it('should handle service errors', async () => {
            req.body = {
                action: 'Create',
                userId: 1,
                details: 'New user created',
            };
            systemLogService.createLog.mockRejectedValue(new Error('Database error'));
            await systemLogController.createLog(req, res);
            expect(res.status).toHaveBeenCalledWith(STATUS_CODES.INTERNAL_ERROR);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to log action',
                code: STATUS_CODES.INTERNAL_ERROR,
            });
        });
    });
});