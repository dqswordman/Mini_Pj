// test/unit/services/bookingService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
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
const { executeQuery } = require('../../../src/config/database');
const crypto = require('crypto');
const oracledb = require('oracledb');
const bookingService = require('../../../src/services/bookingService');

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
    });

    describe('checkTimeConflict', () => {
        it('should return true when there is a time conflict', async () => {
            // Arrange
            const mockResult = {
                rows: [{ CONFLICT_COUNT: 1 }]
            };
            executeQuery.mockResolvedValue(mockResult);

            // Act
            const result = await bookingService.checkTimeConflict(
                1, 
                new Date('2024-02-01T09:00:00'),
                new Date('2024-02-01T10:00:00')
            );

            // Assert
            expect(result).toBe(true);
            expect(executeQuery).toHaveBeenCalled();
        });

        it('should return false when there is no time conflict', async () => {
            // Arrange
            const mockResult = {
                rows: [{ CONFLICT_COUNT: 0 }]
            };
            executeQuery.mockResolvedValue(mockResult);

            // Act
            const result = await bookingService.checkTimeConflict(
                1,
                new Date('2024-02-01T09:00:00'),
                new Date('2024-02-01T10:00:00')
            );

            // Assert
            expect(result).toBe(false);
        });

        it('should exclude specified booking when checking conflicts', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [{ CONFLICT_COUNT: 0 }] });

            // Act
            await bookingService.checkTimeConflict(
                1,
                new Date('2024-02-01T09:00:00'),
                new Date('2024-02-01T10:00:00'),
                123
            );

            // Assert
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND booking_id != :excludeBookingId'),
                expect.arrayContaining([123])
            );
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

        it('should create a normal room booking successfully', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ IS_DISABLED: 0 }] }) // Room check
                .mockResolvedValueOnce({ outBinds: { booking_id: [1] } }) // Booking insert
                .mockResolvedValueOnce({ rows: [{ ROOM_TYPE: 'Normal' }] }) // Room type check
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Status update

            const mockBooking = { BOOKING_ID: 1, BOOKING_STATUS: 'Approved' };
            jest.spyOn(bookingService, 'getBookingById').mockResolvedValue(mockBooking);
            jest.spyOn(bookingService, 'checkTimeConflict').mockResolvedValue(false);

            // Act
            const result = await bookingService.createBooking(mockBookingData);

            // Assert
            expect(result).toEqual(mockBooking);
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should create a VIP room booking with pending approval', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ IS_DISABLED: 0 }] })
                .mockResolvedValueOnce({ outBinds: { booking_id: [1] } })
                .mockResolvedValueOnce({ rows: [{ ROOM_TYPE: 'VIP' }] })
                .mockResolvedValueOnce({ rowsAffected: 1 });

            const mockBooking = { BOOKING_ID: 1, BOOKING_STATUS: 'Pending' };
            jest.spyOn(bookingService, 'getBookingById').mockResolvedValue(mockBooking);
            jest.spyOn(bookingService, 'checkTimeConflict').mockResolvedValue(false);

            // Act
            const result = await bookingService.createBooking(mockBookingData);

            // Assert
            expect(result).toEqual(mockBooking);
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('BookingApprovals'),
                expect.any(Array)
            );
        });

        it('should throw error for time conflict', async () => {
            // Arrange
            jest.spyOn(bookingService, 'checkTimeConflict').mockResolvedValue(true);

            // Act & Assert
            await expect(bookingService.createBooking(mockBookingData))
                .rejects
                .toThrow('Time slot is already booked');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });

        it('should throw error for disabled room', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ IS_DISABLED: 1 }] });
            jest.spyOn(bookingService, 'checkTimeConflict').mockResolvedValue(false);

            // Act & Assert
            await expect(bookingService.createBooking(mockBookingData))
                .rejects
                .toThrow('Room is disabled');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });

    describe('getBookingById', () => {
        it('should return booking details successfully', async () => {
            // Arrange
            const mockBooking = {
                rows: [{
                    BOOKING_ID: 1,
                    EMPLOYEE_ID: 1,
                    ROOM_ID: 1,
                    BOOKING_STATUS: 'Approved'
                }]
            };
            executeQuery.mockResolvedValue(mockBooking);

            // Act
            const result = await bookingService.getBookingById(1);

            // Assert
            expect(result).toEqual(mockBooking.rows[0]);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.any(String),
                [1]
            );
        });

        it('should throw error when booking not found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(bookingService.getBookingById(999))
                .rejects
                .toThrow('Booking not found');
        });
    });

    describe('getUserBookings', () => {
        it('should return all user bookings when no status filter', async () => {
            // Arrange
            const mockBookings = {
                rows: [
                    { BOOKING_ID: 1, BOOKING_STATUS: 'Approved' },
                    { BOOKING_ID: 2, BOOKING_STATUS: 'Pending' }
                ]
            };
            executeQuery.mockResolvedValue(mockBookings);

            // Act
            const result = await bookingService.getUserBookings(1);

            // Assert
            expect(result).toEqual(mockBookings.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.not.stringContaining('AND b.booking_status'),
                [1]
            );
        });

        it('should filter bookings by status when provided', async () => {
            // Arrange
            const mockBookings = {
                rows: [{ BOOKING_ID: 1, BOOKING_STATUS: 'Approved' }]
            };
            executeQuery.mockResolvedValue(mockBookings);

            // Act
            const result = await bookingService.getUserBookings(1, 'Approved');

            // Assert
            expect(result).toEqual(mockBookings.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND b.booking_status = :status'),
                expect.arrayContaining(['Approved'])
            );
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
            jest.spyOn(bookingService, 'getBookingById')
                .mockResolvedValueOnce(mockBooking)
                .mockResolvedValueOnce({ ...mockBooking, BOOKING_STATUS: 'Cancelled' });
            executeQuery.mockResolvedValue({ rowsAffected: 1 });

            // Act
            const result = await bookingService.cancelBooking(1, 1, 'Meeting cancelled');

            // Assert
            expect(result.BOOKING_STATUS).toBe('Cancelled');
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE Bookings'),
                expect.any(Object)
            );
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
            await expect(bookingService.cancelBooking(1, 1, 'Unauthorized cancel'))
                .rejects
                .toThrow('Unauthorized to cancel this booking');
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
        });
    });

    describe('checkIfAdmin', () => {
        it('should return true for admin user', async () => {
            // Arrange
            const mockResult = {
                rows: [{ POSITION_NAME: 'Admin' }]
            };
            executeQuery.mockResolvedValue(mockResult);

            // Act
            const result = await bookingService.checkIfAdmin(1);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for non-admin user', async () => {
            // Arrange
            const mockResult = {
                rows: [{ POSITION_NAME: 'Employee' }]
            };
            executeQuery.mockResolvedValue(mockResult);

            // Act
            const result = await bookingService.checkIfAdmin(1);

            // Assert
            expect(result).toBe(false);
        });
    });
});