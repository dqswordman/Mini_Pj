// test/unit/services/roomService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    NUMBER: 'NUMBER',
    BIND_OUT: 'BIND_OUT'
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
            // Arrange
            const mockRooms = {
                rows: [
                    {
                        ROOM_ID: 1,
                        ROOM_NAME: 'Meeting Room A',
                        BUILDING_ID: 1,
                        FLOOR_NUMBER: 1,
                        CAPACITY: 10,
                        IS_DISABLED: 0,
                        UPCOMING_BOOKINGS: 2
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockRooms);

            // Act
            const result = await roomService.getAllRooms();

            // Assert
            expect(result).toEqual(mockRooms.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.any(Array)
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
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ outBinds: { room_id: [1] } }) // Room insert
                .mockResolvedValueOnce({ rowsAffected: 1 }) // First amenity
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Second amenity

            const mockCreatedRoom = {
                rows: [{
                    ROOM_ID: 1,
                    ROOM_NAME: 'New Meeting Room',
                    AMENITIES: ['Projector', 'TV']
                }]
            };
            executeQuery.mockResolvedValue(mockCreatedRoom);

            // Act
            const result = await roomService.createRoom(mockRoomData);

            // Assert
            expect(result.ROOM_ID).toBe(1);
            expect(mockConnection.execute).toHaveBeenCalledTimes(3);
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should create room without amenities', async () => {
            // Arrange
            const roomDataWithoutAmenities = {
                ...mockRoomData,
                amenities: []
            };
            mockConnection.execute
                .mockResolvedValueOnce({ outBinds: { room_id: [1] } });

            // Act
            await roomService.createRoom(roomDataWithoutAmenities);

            // Assert
            expect(mockConnection.execute).toHaveBeenCalledTimes(1);
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should rollback on error', async () => {
            // Arrange
            mockConnection.execute.mockRejectedValue(new Error('Insert failed'));

            // Act & Assert
            await expect(roomService.createRoom(mockRoomData))
                .rejects
                .toThrow('Insert failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
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
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Room update
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete old amenities
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Insert new amenity 1
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Insert new amenity 2

            const mockUpdatedRoom = {
                rows: [{
                    ROOM_ID: 1,
                    ROOM_NAME: 'Updated Room',
                    AMENITIES: ['TV', 'Whiteboard']
                }]
            };
            executeQuery.mockResolvedValue(mockUpdatedRoom);

            // Act
            const result = await roomService.updateRoom(1, mockUpdateData);

            // Assert
            expect(result.ROOM_NAME).toBe('Updated Room');
            expect(mockConnection.execute).toHaveBeenCalledTimes(4);
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should update only room info when amenities not provided', async () => {
            // Arrange
            const dataWithoutAmenities = { ...mockUpdateData };
            delete dataWithoutAmenities.amenities;

            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Only room update

            // Act
            await roomService.updateRoom(1, dataWithoutAmenities);

            // Assert
            expect(mockConnection.execute).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteRoom', () => {
        it('should delete room successfully', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ COUNT: 0 }] }) // No active bookings
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete amenities
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete bookings
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Delete room

            // Act
            const result = await roomService.deleteRoom(1);

            // Assert
            expect(result.message).toBe('Room deleted successfully');
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should throw error when room has active bookings', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ COUNT: 1 }] }); // Has active bookings

            // Act & Assert
            await expect(roomService.deleteRoom(1))
                .rejects
                .toThrow('Cannot delete room with active bookings');
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
        it('should search rooms with all criteria', async () => {
            // Arrange
            const criteria = {
                buildingId: 1,
                floorNumber: 2,
                minCapacity: 10,
                startTime: new Date('2024-01-01T09:00:00'),
                endTime: new Date('2024-01-01T10:00:00')
            };
            const mockRooms = {
                rows: [
                    {
                        ROOM_ID: 2,
                        ROOM_NAME: 'Meeting Room B',
                        BUILDING_ID: 1,
                        FLOOR_NUMBER: 2,
                        CAPACITY: 15,
                        IS_DISABLED: 0
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockRooms);

            // Act
            const result = await roomService.searchRooms(criteria);

            // Assert
            expect(result).toEqual(mockRooms.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE r.is_disabled = 0'),
                expect.objectContaining(criteria)
            );
        });

        it('should search with partial criteria', async () => {
            // Arrange
            const criteria = {
                minCapacity: 10
            };
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            await roomService.searchRooms(criteria);

            // Assert
            expect(executeQuery).toHaveBeenCalledWith(
                expect.not.stringContaining('building_id'),
                expect.objectContaining({ minCapacity: 10 })
            );
        });

        it('should include time conflict check when times provided', async () => {
            // Arrange
            const criteria = {
                startTime: new Date('2024-01-01T09:00:00'),
                endTime: new Date('2024-01-01T10:00:00')
            };

            // Act
            await roomService.searchRooms(criteria);

            // Assert
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('NOT EXISTS'),
                expect.objectContaining({
                    startTime: criteria.startTime,
                    endTime: criteria.endTime
                })
            );
        });
    });
});