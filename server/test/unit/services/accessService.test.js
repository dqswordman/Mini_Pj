// test/unit/services/accessService.test.js

// Mocking dependencies
jest.mock('../../../src/config/database', () => ({
    executeSQL: jest.fn(),
    getConnection: jest.fn()
}));

jest.mock('qrcode', () => ({
    toDataURL: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    execute: jest.fn(),
    BIND_OUT: 'BIND_OUT',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    OBJECT: 'OBJECT',
    outFormat: 'OBJECT'
}));

// Required after mocks
const { executeSQL } = require('../../../src/config/database');
const QRCode = require('qrcode');
const oracledb = require('oracledb');
const accessService = require('../../../src/services/accessService');

describe('AccessService', () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            execute: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            close: jest.fn()
        };
        jest.clearAllMocks();
        oracledb.getConnection.mockResolvedValue(mockConnection);
    });

    describe('createAccessLog', () => {
        const mockValidBooking = {
            rows: [{
                BOOKING_ID: 1,
                START_TIME: new Date(Date.now() - 3600000),
                END_TIME: new Date(Date.now() + 3600000),
                BOOKING_STATUS: 'Approved',
                SECRET_NUMBER: 'ABC123',
                ROOM_NAME: 'Meeting Room A',
                EMPLOYEE_NAME: 'John Doe'
            }]
        };

        it('should create access log successfully', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce(mockValidBooking)
                .mockResolvedValueOnce({ 
                    outBinds: { access_log_id: [1] }
                });

            // Act
            const result = await accessService.createAccessLog(1);

            // Assert
            expect(result).toEqual({
                accessLogId: 1,
                bookingId: 1,
                accessTime: expect.any(Date),
                roomName: 'Meeting Room A',
                employeeName: 'John Doe'
            });
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error for non-existent booking', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(accessService.createAccessLog(999))
                .rejects
                .toThrow('Booking not found');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error for non-approved booking', async () => {
            // Arrange
            const mockPendingBooking = {
                rows: [{
                    ...mockValidBooking.rows[0],
                    BOOKING_STATUS: 'Pending'
                }]
            };
            mockConnection.execute.mockResolvedValue(mockPendingBooking);

            // Act & Assert
            await expect(accessService.createAccessLog(1))
                .rejects
                .toThrow('Booking is not approved');
        });

        it('should throw error for access outside booking time', async () => {
            // Arrange
            const mockExpiredBooking = {
                rows: [{
                    ...mockValidBooking.rows[0],
                    START_TIME: new Date(Date.now() - 7200000),
                    END_TIME: new Date(Date.now() - 3600000)
                }]
            };
            mockConnection.execute.mockResolvedValue(mockExpiredBooking);

            // Act & Assert
            await expect(accessService.createAccessLog(1))
                .rejects
                .toThrow('Access attempt outside booking time window');
        });
    });

    describe('verifySecretNumber', () => {
        it('should return true for valid secret number and time', async () => {
            // Arrange
            const mockBooking = {
                rows: [{
                    BOOKING_ID: 1,
                    START_TIME: new Date(Date.now() - 3600000),
                    END_TIME: new Date(Date.now() + 3600000),
                    BOOKING_STATUS: 'Approved',
                    SECRET_NUMBER: 'ABC123'
                }]
            };
            executeSQL.mockResolvedValue(mockBooking);

            // Act
            const result = await accessService.verifySecretNumber(1, 'ABC123');

            // Assert
            expect(result).toBe(true);
            expect(executeSQL).toHaveBeenCalledWith(
                expect.any(String),
                [1]
            );
        });

        it('should return false for invalid secret number', async () => {
            // Arrange
            const mockBooking = {
                rows: [{
                    BOOKING_ID: 1,
                    SECRET_NUMBER: 'ABC123',
                    BOOKING_STATUS: 'Approved',
                    START_TIME: new Date(Date.now() - 3600000),
                    END_TIME: new Date(Date.now() + 3600000)
                }]
            };
            executeSQL.mockResolvedValue(mockBooking);

            // Act
            const result = await accessService.verifySecretNumber(1, 'WRONG123');

            // Assert
            expect(result).toBe(false);
        });

        it('should throw error for non-approved booking', async () => {
            // Arrange
            const mockBooking = {
                rows: [{
                    BOOKING_ID: 1,
                    SECRET_NUMBER: 'ABC123',
                    BOOKING_STATUS: 'Pending',
                    START_TIME: new Date(Date.now() - 3600000),
                    END_TIME: new Date(Date.now() + 3600000)
                }]
            };
            executeSQL.mockResolvedValue(mockBooking);

            // Act & Assert
            await expect(accessService.verifySecretNumber(1, 'ABC123'))
                .rejects
                .toThrow('Booking is not approved');
        });
    });

    describe('generateQRCode', () => {
        it('should generate QR code successfully', async () => {
            // Arrange
            const mockQRCode = 'data:image/png;base64,...';
            QRCode.toDataURL.mockResolvedValue(mockQRCode);

            // Act
            const result = await accessService.generateQRCode(1, 'ABC123');

            // Assert
            expect(result).toBe(mockQRCode);
            expect(QRCode.toDataURL).toHaveBeenCalledWith(
                JSON.stringify({ bookingId: 1, secretNumber: 'ABC123' })
            );
        });
    });

    describe('getAccessLogs', () => {
        it('should return access logs for a booking', async () => {
            // Arrange
            const mockLogs = {
                rows: [{
                    ACCESS_LOG_ID: 1,
                    BOOKING_ID: 1,
                    ACCESS_TIME: new Date(),
                    ROOM_NAME: 'Meeting Room A',
                    EMPLOYEE_NAME: 'John Doe'
                }]
            };
            executeSQL.mockResolvedValue(mockLogs);

            // Act
            const result = await accessService.getAccessLogs(1);

            // Assert
            expect(result).toEqual(mockLogs.rows);
            expect(executeSQL).toHaveBeenCalledWith(
                expect.any(String),
                [1]
            );
        });
    });

    describe('checkUnusedBookings', () => {
        it('should return list of unused bookings', async () => {
            // Arrange
            const mockUnusedBookings = {
                rows: [{
                    BOOKING_ID: 1,
                    EMPLOYEE_ID: 1,
                    ROOM_ID: 1,
                    START_TIME: new Date(),
                    END_TIME: new Date(),
                    EMPLOYEE_NAME: 'John Doe',
                    ROOM_NAME: 'Meeting Room A'
                }]
            };
            executeSQL.mockResolvedValue(mockUnusedBookings);

            // Act
            const result = await accessService.checkUnusedBookings();

            // Assert
            expect(result).toEqual(mockUnusedBookings.rows);
            expect(executeSQL).toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe('updateEmployeeLockStatus', () => {
        it('should update employee lock status successfully', async () => {
            // Arrange
            executeSQL.mockResolvedValue({ rowsAffected: 1 });

            // Act
            const result = await accessService.updateEmployeeLockStatus(1, true);

            // Assert
            expect(result).toEqual({ success: true });
            expect(executeSQL).toHaveBeenCalledWith(
                expect.any(String),
                {
                    isLocked: 1,
                    employeeId: 1
                }
            );
        });
    });
});