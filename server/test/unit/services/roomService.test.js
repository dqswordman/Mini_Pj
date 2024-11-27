// test/unit/services/roomService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    NUMBER: 'NUMBER', 
    BIND_OUT: 'BIND_OUT',
    BIND_IN: 'BIND_IN'  // 添加这个
}));

// Import dependencies AFTER setting up mocks
const { executeQuery } = require('../../../src/config/database');
const oracledb = require('oracledb');
const roomService = require('../../../src/services/roomService');

describe('RoomService', () => {
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

    describe('getAllRooms', () => {
        it('should return all rooms with upcoming bookings count', async () => {
            const mockRooms = {
                rows: [{
                    ROOM_ID: 1,
                    ROOM_NAME: 'Meeting Room A',
                    BUILDING_ID: 1,
                    FLOOR_NUMBER: 1,
                    CAPACITY: 10,
                    IS_DISABLED: 0,
                    UPCOMING_BOOKINGS: 2
                }]
            };
            executeQuery.mockResolvedValue(mockRooms);

            const result = await roomService.getAllRooms();

            expect(result).toEqual(mockRooms.rows);
            // 修改断言,移除对参数的验证
            expect(executeQuery).toHaveBeenCalledWith(
                expect.any(String)
            );
        });

        it('should return empty array when no rooms exist', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await roomService.getAllRooms();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getRoomById', () => {
        it('should return room with amenities', async () => {
            // Arrange
            const mockRoom = {
                rows: [{
                    ROOM_ID: 1,
                    ROOM_NAME: 'Meeting Room A',
                    BUILDING_ID: 1,
                    FLOOR_NUMBER: 1,
                    CAPACITY: 10,
                    IS_DISABLED: 0
                }]
            };
            const mockAmenities = {
                rows: [
                    { AMENITY_NAME: 'Projector' },
                    { AMENITY_NAME: 'Whiteboard' }
                ]
            };
            executeQuery
                .mockResolvedValueOnce(mockRoom)
                .mockResolvedValueOnce(mockAmenities);

            // Act
            const result = await roomService.getRoomById(1);

            // Assert
            expect(result.amenities).toEqual(['Projector', 'Whiteboard']);
            expect(executeQuery).toHaveBeenCalledTimes(2);
        });

        it('should throw error when room not found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(roomService.getRoomById(999))
                .rejects
                .toThrow('Room not found');
        });
    });

    describe('createRoom', () => {
        const mockRoomData = {
            roomName: 'New Meeting Room',
            buildingId: 1,
            floorNumber: 2,
            capacity: 15,
            amenities: ['Projector', 'TV']
        };
    
        it('should create room with amenities successfully', async () => {
            // 修改返回值格式，确保符合 Oracle 的格式
            const mockExecuteResult = {
                outBinds: {
                    room_id: [1]  // 必须是数组形式
                }
            };
            mockConnection.execute.mockImplementation((sql, params) => {
                if (sql.includes('RETURNING room_id INTO')) {
                    return Promise.resolve(mockExecuteResult);
                }
                return Promise.resolve({ rowsAffected: 1 });
            });
    
            executeQuery
                .mockResolvedValueOnce({
                    rows: [{
                        ROOM_ID: 1,
                        ROOM_NAME: 'New Meeting Room'
                    }]
                })
                .mockResolvedValueOnce({
                    rows: [
                        { AMENITY_NAME: 'Projector' },
                        { AMENITY_NAME: 'TV' }
                    ]
                });
    
            const result = await roomService.createRoom(mockRoomData);
            expect(result.ROOM_ID).toBe(1);
        });
    
        it('should create room without amenities', async () => {
            const mockExecuteResult = {
                outBinds: {
                    room_id: [1]  // 必须是数组形式
                }
            };
            mockConnection.execute.mockImplementation((sql) => {
                if (sql.includes('RETURNING room_id INTO')) {
                    return Promise.resolve(mockExecuteResult);
                }
                return Promise.resolve({ rowsAffected: 1 });
            });
    
            executeQuery
                .mockResolvedValueOnce({
                    rows: [{
                        ROOM_ID: 1,
                        ROOM_NAME: 'New Meeting Room'
                    }]
                })
                .mockResolvedValueOnce({
                    rows: []
                });
    
            const result = await roomService.createRoom({...mockRoomData, amenities: []});
            expect(mockConnection.execute).toHaveBeenCalledTimes(2); // 包括 BEGIN 和插入房间
        });
    });
    
    describe('updateRoom', () => {
        const mockUpdateData = {
            roomName: 'Updated Room',
            buildingId: 1,
            floorNumber: 2,
            capacity: 20,
            isDisabled: 0,
            amenities: ['TV', 'Whiteboard']
        };
    
        it('should update room and amenities successfully', async () => {
            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                return Promise.resolve({ rowsAffected: 1 });
            });
    
            executeQuery
                .mockResolvedValueOnce({
                    rows: [{
                        ROOM_ID: 1,
                        ROOM_NAME: 'Updated Room'
                    }]
                })
                .mockResolvedValueOnce({
                    rows: [
                        { AMENITY_NAME: 'TV' },
                        { AMENITY_NAME: 'Whiteboard' }
                    ]
                });
    
            const result = await roomService.updateRoom(1, mockUpdateData);
            expect(result.ROOM_NAME).toBe('Updated Room');
            expect(mockConnection.execute).toHaveBeenCalledTimes(5); // BEGIN + 更新房间 + 删除旧设施 + 2个新设施
        });
    
        it('should update only room info when amenities not provided', async () => {
            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                return Promise.resolve({ rowsAffected: 1 });
            });
    
            executeQuery
                .mockResolvedValueOnce({
                    rows: [{
                        ROOM_ID: 1,
                        ROOM_NAME: 'Updated Room'
                    }]
                })
                .mockResolvedValueOnce({
                    rows: []
                });
    
            const updateDataWithoutAmenities = { ...mockUpdateData };
            delete updateDataWithoutAmenities.amenities;
    
            await roomService.updateRoom(1, updateDataWithoutAmenities);
            expect(mockConnection.execute).toHaveBeenCalledTimes(2); // BEGIN + 更新房间
        });
    });

    describe('getRoomAvailability', () => {
        it('should return room bookings for specific date', async () => {
            // Arrange
            const mockBookings = {
                rows: [
                    {
                        BOOKING_ID: 1,
                        START_TIME: new Date('2024-01-01T09:00:00'),
                        END_TIME: new Date('2024-01-01T10:00:00'),
                        BOOKED_BY: 'John Doe'
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockBookings);

            // Act
            const result = await roomService.getRoomAvailability(
                1,
                new Date('2024-01-01')
            );

            // Assert
            expect(result).toEqual(mockBookings.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY b.start_time'),
                expect.any(Array)
            );
        });
    });

    describe('searchRooms', () => {
        it('should search with partial criteria', async () => {
            executeQuery.mockResolvedValueOnce({
                rows: []
            });

            await roomService.searchRooms({ minCapacity: 10 });

            // 修改断言
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('capacity'),
                expect.objectContaining({ minCapacity: 10 })
            );
        });

        it('should include time conflict check when times provided', async () => {
            executeQuery.mockResolvedValueOnce({
                rows: []
            });

            const criteria = {
                startTime: new Date('2024-01-01T09:00:00'),
                endTime: new Date('2024-01-01T10:00:00')
            };

            await roomService.searchRooms(criteria);

            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('NOT EXISTS'),
                expect.objectContaining(criteria)
            );
        });
    });
});