// test/unit/services/bookingService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database.js', () => ({
    executeSQL: jest.fn()
}));

jest.mock('crypto', () => ({
    randomBytes: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    NUMBER: 'NUMBER',
    BIND_OUT: 'BIND_OUT'
}));

// Import dependencies AFTER setting up mocks
const crypto = require('crypto');
const oracledb = require('oracledb');
const bookingService = require('../../../src/services/bookingService.js');

describe('BookingService', () => {
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
        crypto.randomBytes.mockReturnValue(Buffer.from('1234abcd', 'hex'));
    });

    describe('checkTimeConflict', () => {
        it('should return true when there is a time conflict', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [{ CONFLICT_COUNT: 1 }]
            });

            // Act
            const result = await bookingService.checkTimeConflict(
                1, 
                new Date('2024-02-01T09:00:00'),
                new Date('2024-02-01T10:00:00')
            );

            // Assert
            expect(result).toBe(true);
            expect(mockConnection.execute).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should return false when there is no time conflict', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [{ CONFLICT_COUNT: 0 }]
            });

            // Act
            const result = await bookingService.checkTimeConflict(
                1,
                new Date('2024-02-01T09:00:00'),
                new Date('2024-02-01T10:00:00')
            );

            // Assert
            expect(result).toBe(false);
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should exclude specified booking when checking conflicts', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [{ CONFLICT_COUNT: 0 }]
            });

            // Act
            await bookingService.checkTimeConflict(
                1,
                new Date('2024-02-01T09:00:00'),
                new Date('2024-02-01T10:00:00'),
                123
            );

            // Assert
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('AND booking_id != :excludeBookingId'),
                expect.any(Object)
            );
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('generateSecretNumber', () => {
        it('should generate a valid secret number', () => {
            // Arrange
            const mockBytes = Buffer.from('1234abcd', 'hex');
            crypto.randomBytes.mockReturnValue(mockBytes);

            // Act
            const result = bookingService.generateSecretNumber();

            // Assert
            expect(result).toBe('1234ABCD');
            expect(crypto.randomBytes).toHaveBeenCalledWith(4);
        });
    });

    describe('createBooking', () => {
        const mockBookingData = {
            employeeId: 1,
            roomId: 1,
            startTime: new Date('2024-02-01T09:00:00'),
            endTime: new Date('2024-02-01T10:00:00')
        };

        beforeEach(() => {
            jest.spyOn(bookingService, 'checkTimeConflict').mockResolvedValue(false);
        });

        it('should create a normal room booking successfully', async () => {
            // Arrange
            const mockBookingId = 1;
            mockConnection.execute
                .mockImplementation((sql, params) => {
                    if (sql === 'BEGIN') {
                        return Promise.resolve();
                    }
                    if (sql.includes('SELECT is_disabled')) {
                        return Promise.resolve({
                            rows: [{ IS_DISABLED: 0 }]
                        });
                    }
                    if (sql.includes('INSERT INTO Bookings')) {
                        return Promise.resolve({
                            outBinds: { booking_id: [mockBookingId] }
                        });
                    }
                    if (sql.includes('SELECT room_type')) {
                        return Promise.resolve({
                            rows: [{ ROOM_TYPE: 'Normal' }]
                        });
                    }
                    if (sql.includes('UPDATE Bookings')) {
                        return Promise.resolve({
                            rowsAffected: 1
                        });
                    }
                    return Promise.resolve({ rows: [] });
                });

            jest.spyOn(bookingService, 'getBookingById')
                .mockResolvedValueOnce({
                    BOOKING_ID: mockBookingId,
                    EMPLOYEE_ID: mockBookingData.employeeId,
                    ROOM_ID: mockBookingData.roomId,
                    BOOKING_STATUS: 'Approved'
                });

            // Act
            const result = await bookingService.createBooking(mockBookingData);

            // Assert
            expect(result.BOOKING_STATUS).toBe('Approved');
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should create a VIP room booking with pending approval', async () => {
            // Arrange
            const mockBookingId = 1;
            mockConnection.execute
                .mockImplementation((sql, params) => {
                    if (sql === 'BEGIN') {
                        return Promise.resolve();
                    }
                    if (sql.includes('SELECT is_disabled')) {
                        return Promise.resolve({
                            rows: [{ IS_DISABLED: 0 }]
                        });
                    }
                    if (sql.includes('INSERT INTO Bookings')) {
                        return Promise.resolve({
                            outBinds: { booking_id: [mockBookingId] }
                        });
                    }
                    if (sql.includes('SELECT room_type')) {
                        return Promise.resolve({
                            rows: [{ ROOM_TYPE: 'VIP' }]
                        });
                    }
                    return Promise.resolve({
                        rowsAffected: 1,
                        rows: []
                    });
                });

            jest.spyOn(bookingService, 'getBookingById')
                .mockResolvedValue({
                    BOOKING_ID: mockBookingId,
                    BOOKING_STATUS: 'Pending'
                });

            // Act
            const result = await bookingService.createBooking(mockBookingData);

            // Assert
            expect(result.BOOKING_STATUS).toBe('Pending');
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error for disabled room', async () => {
            // Arrange
            mockConnection.execute
                .mockImplementation((sql, params) => {
                    if (sql === 'BEGIN') {
                        return Promise.resolve();
                    }
                    if (sql.includes('SELECT is_disabled')) {
                        return Promise.resolve({
                            rows: [{ IS_DISABLED: 1 }]
                        });
                    }
                    return Promise.resolve({
                        rows: []
                    });
                });

            // Act & Assert
            await expect(bookingService.createBooking(mockBookingData))
                .rejects
                .toThrow('Room is disabled');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error for time conflict', async () => {
            // Arrange
            jest.spyOn(bookingService, 'checkTimeConflict').mockResolvedValue(true);

            // Act & Assert
            await expect(bookingService.createBooking(mockBookingData))
                .rejects
                .toThrow('Time slot is already booked');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('getBookingById', () => {
        it('should return booking details successfully', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [{
                    BOOKING_ID: 1,
                    EMPLOYEE_ID: 1,
                    ROOM_ID: 1,
                    BOOKING_STATUS: 'Approved'
                }]
            });

            // Act
            const result = await bookingService.getBookingById(1);

            // Assert
            expect(result).toEqual(expect.objectContaining({
                BOOKING_ID: 1,
                BOOKING_STATUS: 'Approved'
            }));
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error when booking not found', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(bookingService.getBookingById(999))
                .rejects
                .toThrow('Booking not found');
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('getUserBookings', () => {
        it('should return all user bookings when no status filter', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [
                    { BOOKING_ID: 1, BOOKING_STATUS: 'Approved' },
                    { BOOKING_ID: 2, BOOKING_STATUS: 'Pending' }
                ]
            });

            // Act
            const result = await bookingService.getUserBookings(1);

            // Assert
            expect(result).toHaveLength(2);
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.not.stringContaining('AND b.booking_status'),
                expect.any(Object)
            );
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should filter bookings by status when provided', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [
                    { BOOKING_ID: 1, BOOKING_STATUS: 'Approved' }
                ]
            });

            // Act
            const result = await bookingService.getUserBookings(1, 'Approved');

            // Assert
            expect(result).toHaveLength(1);
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('AND b.booking_status = :status'),
                expect.any(Object)
            );
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('cancelBooking', () => {
        it('should cancel booking successfully', async () => {
            // Arrange
            const mockBooking = {
                BOOKING_ID: 1,
                EMPLOYEE_ID: 1,
                BOOKING_STATUS: 'Approved'
            };

            mockConnection.execute.mockResolvedValue({ rowsAffected: 1 });
            
            jest.spyOn(bookingService, 'getBookingById')
                .mockResolvedValueOnce(mockBooking)
                .mockResolvedValueOnce({ ...mockBooking, BOOKING_STATUS: 'Cancelled' });

            // Act
            const result = await bookingService.cancelBooking(1, 1, 'Test cancellation');

            // Assert
            expect(result.BOOKING_STATUS).toBe('Cancelled');
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error when unauthorized', async () => {
            // Arrange
            const mockBooking = {
                BOOKING_ID: 1,
                EMPLOYEE_ID: 2,
                BOOKING_STATUS: 'Approved'
            };
            jest.spyOn(bookingService, 'getBookingById').mockResolvedValue(mockBooking);
            jest.spyOn(bookingService, 'checkIfAdmin').mockResolvedValue(false);

            // Act & Assert
            await expect(bookingService.cancelBooking(1, 1, 'Unauthorized'))
                .rejects
                .toThrow('Unauthorized to cancel this booking');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('approveBooking', () => {
        it('should approve booking successfully', async () => {
            // Arrange
            const mockBooking = {
                BOOKING_ID: 1,
                BOOKING_STATUS: 'Pending'
            };

            jest.spyOn(bookingService, 'getBookingById')
                .mockResolvedValueOnce(mockBooking)
                .mockResolvedValueOnce({ ...mockBooking, BOOKING_STATUS: 'Approved' });

            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 });

            // Act
            const result = await bookingService.approveBooking(1, 1, true, 'Approved');

            // Assert
            expect(result.BOOKING_STATUS).toBe('Approved');
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error for non-pending booking', async () => {
            // Arrange
            const mockBooking = {
                BOOKING_ID: 1,
                BOOKING_STATUS: 'Approved'
            };
            jest.spyOn(bookingService, 'getBookingById').mockResolvedValue(mockBooking);

            // Act & Assert
            await expect(bookingService.approveBooking(1, 1, true, 'Approve attempt'))
                .rejects
                .toThrow('Booking is not in pending status');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('checkIfAdmin', () => {
        it('should return true for admin user', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [{ POSITION_NAME: 'Admin' }]
            });

            // Act
            const result = await bookingService.checkIfAdmin(1);

            // Assert
            expect(result).toBe(true);
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should return false for non-admin user', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({
                rows: [{ POSITION_NAME: 'Employee' }]
            });

            // Act
            const result = await bookingService.checkIfAdmin(1);

            // Assert
            expect(result).toBe(false);
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });
});