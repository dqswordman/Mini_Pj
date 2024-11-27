// test/unit/services/reportService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

// Import dependencies AFTER setting up mocks
const { executeQuery } = require('../../../src/config/database');
const reportService = require('../../../src/services/reportService');

describe('ReportService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRoomUsageStats', () => {
        it('should return room usage statistics', async () => {
            // Arrange
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');
            const mockStats = {
                rows: [
                    {
                        ROOM_ID: 1,
                        ROOM_NAME: 'Meeting Room A',
                        TOTAL_BOOKINGS: 10,
                        ACTUAL_USES: 8,
                        USAGE_RATE: 80.00,
                        CANCELLED_BOOKINGS: 1,
                        TOTAL_HOURS_BOOKED: 15.5
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getRoomUsageStats(startDate, endDate);

            // Assert
            expect(result).toEqual(mockStats.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                {
                    startDate: startDate,
                    endDate: endDate
                }
            );
        });

        it('should handle no bookings in period', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await reportService.getRoomUsageStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getDailyUsageStats', () => {
        it('should return daily usage statistics for a room', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        DATE_DAY: new Date('2024-01-01'),
                        TOTAL_BOOKINGS: 5,
                        ACTUAL_USES: 4,
                        USAGE_RATE: 80.00
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getDailyUsageStats(1, 1, 2024);

            // Assert
            expect(result).toEqual(mockStats.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WITH RECURSIVE DateRange'),
                {
                    roomId: 1,
                    month: 1,
                    year: 2024
                }
            );
        });

        it('should include all days in month', async () => {
            // Arrange
            const mockStats = {
                rows: Array.from({ length: 31 }, (_, i) => ({
                    DATE_DAY: new Date(`2024-01-${i + 1}`),
                    TOTAL_BOOKINGS: 0,
                    ACTUAL_USES: 0,
                    USAGE_RATE: 0
                }))
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getDailyUsageStats(1, 1, 2024);

            // Assert
            expect(result).toHaveLength(31);
            expect(executeQuery).toHaveBeenCalledTimes(1);
        });
    });

    describe('getBookingUsageStats', () => {
        it('should return booking usage comparison statistics', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        EMPLOYEE_ID: 1,
                        EMPLOYEE_NAME: 'John Doe',
                        DEPARTMENT_NAME: 'IT',
                        TOTAL_BOOKINGS: 10,
                        ACTUAL_USES: 8,
                        CANCELLED_BOOKINGS: 1,
                        UNUSED_BOOKINGS: 1,
                        USAGE_RATE: 88.89
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getBookingUsageStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result).toEqual(mockStats.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WITH BookingStats'),
                expect.any(Object)
            );
        });

        it('should handle employees with no bookings', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        EMPLOYEE_ID: 1,
                        EMPLOYEE_NAME: 'John Doe',
                        DEPARTMENT_NAME: 'IT',
                        TOTAL_BOOKINGS: 0,
                        ACTUAL_USES: 0,
                        CANCELLED_BOOKINGS: 0,
                        UNUSED_BOOKINGS: 0,
                        USAGE_RATE: null
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getBookingUsageStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result[0].USAGE_RATE).toBeNull();
        });
    });

    describe('getLockStats', () => {
        it('should return department lock statistics', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        DEPARTMENT_NAME: 'IT',
                        TOTAL_EMPLOYEES: 20,
                        LOCKED_EMPLOYEES: 2,
                        TOTAL_LOCKS: 3,
                        LOCKED_RATE: 10.00,
                        LOCKS_PER_EMPLOYEE: 0.15
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getLockStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result).toEqual(mockStats.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WITH DepartmentStats'),
                expect.any(Object)
            );
        });

        it('should handle departments with no locks', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        DEPARTMENT_NAME: 'IT',
                        TOTAL_EMPLOYEES: 20,
                        LOCKED_EMPLOYEES: 0,
                        TOTAL_LOCKS: 0,
                        LOCKED_RATE: 0,
                        LOCKS_PER_EMPLOYEE: 0
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getLockStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result[0].LOCKED_RATE).toBe(0);
            expect(result[0].LOCKS_PER_EMPLOYEE).toBe(0);
        });
    });

    describe('getLockHistory', () => {
        it('should return department lock history', async () => {
            // Arrange
            const mockHistory = {
                rows: [
                    {
                        EMPLOYEE_ID: 1,
                        EMPLOYEE_NAME: 'John Doe',
                        REQUEST_TIME: new Date('2024-01-01'),
                        APPROVAL_STATUS: 'Approved',
                        APPROVAL_REASON: 'Multiple unused bookings',
                        APPROVER_NAME: 'Admin User',
                        APPROVAL_TIME: new Date('2024-01-02')
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockHistory);

            // Act
            const result = await reportService.getLockHistory(
                1,
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result).toEqual(mockHistory.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE edp.department_id = :departmentId'),
                expect.any(Object)
            );
        });

        it('should sort history by request time descending', async () => {
            // Arrange
            const mockHistory = {
                rows: [
                    { REQUEST_TIME: new Date('2024-01-02') },
                    { REQUEST_TIME: new Date('2024-01-01') }
                ]
            };
            executeQuery.mockResolvedValue(mockHistory);
    
            // Act
            const result = await reportService.getLockHistory(1, new Date(), new Date());
    
            // Assert
            expect(result[0].REQUEST_TIME.getTime()).toBeGreaterThan(result[1].REQUEST_TIME.getTime());
        });
    
    });

    describe('getSystemLogsStats', () => {
        it('should return system logs statistics', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        ACTION: 'Login',
                        ACTION_COUNT: 100,
                        UNIQUE_USERS: 20,
                        FIRST_OCCURRENCE: new Date('2024-01-01'),
                        LAST_OCCURRENCE: new Date('2024-01-31')
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getSystemLogsStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result).toEqual(mockStats.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('GROUP BY sl.action'),
                expect.any(Object)
            );
        });

        it('should sort actions by count in descending order', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    { ACTION: 'Login', ACTION_COUNT: 100 },
                    { ACTION: 'Logout', ACTION_COUNT: 50 }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await reportService.getSystemLogsStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result[0].ACTION_COUNT).toBeGreaterThan(result[1].ACTION_COUNT);
        });

        it('should handle period with no logs', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await reportService.getSystemLogsStats(
                new Date('2024-01-01'),
                new Date('2024-01-31')
            );

            // Assert
            expect(result).toEqual([]);
        });
    });
});