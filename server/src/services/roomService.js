const { executeQuery } = require('../config/database');

class RoomService {
  async getAllRooms() {
    try {
      const result = await executeQuery(`
        SELECT 
          r.room_id,
          r.room_name,
          r.building_id,
          r.floor_number,
          r.capacity,
          r.is_disabled,
          r.created_at,
          r.updated_at,
          (
            SELECT COUNT(*)
            FROM Bookings b
            WHERE b.room_id = r.room_id
            AND b.booking_status = 'Approved'
            AND b.start_time >= CURRENT_TIMESTAMP
          ) as upcoming_bookings
        FROM Rooms r
        ORDER BY r.building_id, r.floor_number, r.room_name
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getRoomById(roomId) {
    try {
      const result = await executeQuery(`
        SELECT 
          r.room_id,
          r.room_name,
          r.building_id,
          r.floor_number,
          r.capacity,
          r.is_disabled,
          r.created_at,
          r.updated_at
        FROM Rooms r
        WHERE r.room_id = :roomId
      `, [roomId]);

      if (result.rows.length === 0) {
        throw new Error('Room not found');
      }

      // 获取房间设施
      const amenities = await this.getRoomAmenities(roomId);
      const room = result.rows[0];
      room.amenities = amenities;

      return room;
    } catch (error) {
      throw error;
    }
  }

  async getRoomAmenities(roomId) {
    try {
      const result = await executeQuery(`
        SELECT amenity_name
        FROM RoomAmenities
        WHERE room_id = :roomId
        ORDER BY amenity_name
      `, [roomId]);

      return result.rows.map(row => row.AMENITY_NAME);
    } catch (error) {
      throw error;
    }
  }

  async createRoom(roomData) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');

      // 创建房间
      const result = await connection.execute(`
        INSERT INTO Rooms (
          room_name, 
          building_id, 
          floor_number, 
          capacity, 
          is_disabled
        ) VALUES (
          :roomName,
          :buildingId,
          :floorNumber,
          :capacity,
          :isDisabled
        ) RETURNING room_id INTO :room_id
      `, {
        roomName: roomData.roomName,
        buildingId: roomData.buildingId,
        floorNumber: roomData.floorNumber,
        capacity: roomData.capacity,
        isDisabled: roomData.isDisabled || 0,
        room_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      });

      const roomId = result.outBinds.room_id[0];

      // 添加房间设施
      if (roomData.amenities && roomData.amenities.length > 0) {
        for (const amenity of roomData.amenities) {
          await connection.execute(`
            INSERT INTO RoomAmenities (room_id, amenity_name)
            VALUES (:roomId, :amenityName)
          `, {
            roomId: roomId,
            amenityName: amenity
          });
        }
      }

      await connection.commit();
      return this.getRoomById(roomId);
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  async updateRoom(roomId, roomData) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');

      // 更新房间基本信息
      await connection.execute(`
        UPDATE Rooms 
        SET room_name = :roomName,
            building_id = :buildingId,
            floor_number = :floorNumber,
            capacity = :capacity,
            is_disabled = :isDisabled,
            updated_at = CURRENT_TIMESTAMP
        WHERE room_id = :roomId
      `, {
        roomName: roomData.roomName,
        buildingId: roomData.buildingId,
        floorNumber: roomData.floorNumber,
        capacity: roomData.capacity,
        isDisabled: roomData.isDisabled,
        roomId: roomId
      });

      // 更新房间设施
      if (roomData.amenities !== undefined) {
        // 删除现有设施
        await connection.execute(`
          DELETE FROM RoomAmenities
          WHERE room_id = :roomId
        `, [roomId]);

        // 添加新设施
        for (const amenity of roomData.amenities) {
          await connection.execute(`
            INSERT INTO RoomAmenities (room_id, amenity_name)
            VALUES (:roomId, :amenityName)
          `, {
            roomId: roomId,
            amenityName: amenity
          });
        }
      }

      await connection.commit();
      return this.getRoomById(roomId);
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  async deleteRoom(roomId) {
    let connection;
    try {
      connection = await oracledb.getConnection();

      // 检查是否有未完成的预订
      const checkResult = await connection.execute(`
        SELECT COUNT(*) as count
        FROM Bookings
        WHERE room_id = :roomId
        AND booking_status IN ('Pending', 'Approved')
        AND end_time > CURRENT_TIMESTAMP
      `, [roomId]);

      if (checkResult.rows[0].COUNT > 0) {
        throw new Error('Cannot delete room with active bookings');
      }

      await connection.execute('BEGIN');

      // 删除房间设施
      await connection.execute(`
        DELETE FROM RoomAmenities
        WHERE room_id = :roomId
      `, [roomId]);

      // 删除历史预订记录
      await connection.execute(`
        DELETE FROM Bookings
        WHERE room_id = :roomId
      `, [roomId]);

      // 删除房间
      await connection.execute(`
        DELETE FROM Rooms
        WHERE room_id = :roomId
      `, [roomId]);

      await connection.commit();
      return { message: 'Room deleted successfully' };
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  async getRoomAvailability(roomId, date) {
    try {
      const result = await executeQuery(`
        SELECT 
          b.booking_id,
          b.start_time,
          b.end_time,
          e.name as booked_by
        FROM Bookings b
        JOIN Employees e ON b.employee_id = e.employee_id
        WHERE b.room_id = :roomId
        AND TRUNC(b.start_time) = TRUNC(:date)
        AND b.booking_status = 'Approved'
        ORDER BY b.start_time
      `, [roomId, date]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async searchRooms(criteria) {
    try {
      let query = `
        SELECT 
          r.room_id,
          r.room_name,
          r.building_id,
          r.floor_number,
          r.capacity,
          r.is_disabled
        FROM Rooms r
        WHERE r.is_disabled = 0
      `;

      const params = {};
      
      if (criteria.buildingId) {
        query += ` AND r.building_id = :buildingId`;
        params.buildingId = criteria.buildingId;
      }

      if (criteria.floorNumber) {
        query += ` AND r.floor_number = :floorNumber`;
        params.floorNumber = criteria.floorNumber;
      }

      if (criteria.minCapacity) {
        query += ` AND r.capacity >= :minCapacity`;
        params.minCapacity = criteria.minCapacity;
      }

      if (criteria.startTime && criteria.endTime) {
        query += `
          AND NOT EXISTS (
            SELECT 1 
            FROM Bookings b
            WHERE b.room_id = r.room_id
            AND b.booking_status = 'Approved'
            AND b.start_time < :endTime
            AND b.end_time > :startTime
          )
        `;
        params.startTime = criteria.startTime;
        params.endTime = criteria.endTime;
      }

      query += ` ORDER BY r.building_id, r.floor_number, r.room_name`;

      const result = await executeQuery(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RoomService();