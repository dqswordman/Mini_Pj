-- 创建序列
CREATE SEQUENCE seq_departments START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_positions START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_employees START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_rooms START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_user_credentials START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_bookings START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_access_permissions START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_system_logs START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_edp START WITH 1 INCREMENT BY 1;

-- 创建表 Departments
CREATE TABLE Departments (
    department_id NUMBER PRIMARY KEY,
    department_name VARCHAR2(100) NOT NULL UNIQUE
);

CREATE OR REPLACE TRIGGER trg_departments_bi
BEFORE INSERT ON Departments
FOR EACH ROW
BEGIN
    :NEW.department_id := seq_departments.NEXTVAL;
END;

-- 创建表 Positions
CREATE TABLE Positions (
    position_id NUMBER PRIMARY KEY,
    position_name VARCHAR2(100) NOT NULL UNIQUE
);

CREATE OR REPLACE TRIGGER trg_positions_bi
BEFORE INSERT ON Positions
FOR EACH ROW
BEGIN
    :NEW.position_id := seq_positions.NEXTVAL;
END;

-- 创建表 Employees
CREATE TABLE Employees (
    employee_id NUMBER PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    email VARCHAR2(100) NOT NULL UNIQUE,
    phone_number VARCHAR2(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_locked NUMBER(1) DEFAULT 0
);

CREATE OR REPLACE TRIGGER trg_employees_bi
BEFORE INSERT ON Employees
FOR EACH ROW
BEGIN
    :NEW.employee_id := seq_employees.NEXTVAL;
END;

-- 创建表 UserCredentials
CREATE TABLE UserCredentials (
    user_id NUMBER PRIMARY KEY,
    employee_id NUMBER UNIQUE,
    username VARCHAR2(100) NOT NULL UNIQUE,
    password_hash VARCHAR2(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uc_employee FOREIGN KEY (employee_id) REFERENCES Employees(employee_id)
);

CREATE OR REPLACE TRIGGER trg_user_credentials_bi
BEFORE INSERT ON UserCredentials
FOR EACH ROW
BEGIN
    :NEW.user_id := seq_user_credentials.NEXTVAL;
END;

-- 创建表 Rooms
CREATE TABLE Rooms (
    room_id NUMBER PRIMARY KEY,
    room_name VARCHAR2(100) NOT NULL,
    building_id NUMBER,
    floor_number NUMBER,
    capacity NUMBER,
    is_disabled NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER trg_rooms_bi
BEFORE INSERT ON Rooms
FOR EACH ROW
BEGIN
    :NEW.room_id := seq_rooms.NEXTVAL;
END;

-- 创建表 RoomAmenities
CREATE TABLE RoomAmenities (
    room_id NUMBER,
    amenity_name VARCHAR2(100) NOT NULL,
    CONSTRAINT pk_room_amenities PRIMARY KEY (room_id, amenity_name),
    CONSTRAINT fk_ra_room FOREIGN KEY (room_id) REFERENCES Rooms(room_id)
);

-- 创建表 Bookings
CREATE TABLE Bookings (
    booking_id NUMBER PRIMARY KEY,
    employee_id NUMBER,
    room_id NUMBER,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    booking_status VARCHAR2(20) DEFAULT 'Pending',
    cancellation_reason VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_employee FOREIGN KEY (employee_id) REFERENCES Employees(employee_id),
    CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES Rooms(room_id),
    CONSTRAINT ck_booking_status CHECK (booking_status IN ('Pending', 'Approved', 'Cancelled', 'Expired'))
);

CREATE OR REPLACE TRIGGER trg_bookings_bi
BEFORE INSERT ON Bookings
FOR EACH ROW
BEGIN
    :NEW.booking_id := seq_bookings.NEXTVAL;
END;

-- 创建表 AccessPermissions
CREATE TABLE AccessPermissions (
    permission_id NUMBER PRIMARY KEY,
    position_id NUMBER,
    screen_name VARCHAR2(100),
    access_level VARCHAR2(10),
    CONSTRAINT fk_ap_position FOREIGN KEY (position_id) REFERENCES Positions(position_id),
    CONSTRAINT ck_access_level CHECK (access_level IN ('Read', 'Write', 'Delete'))
);

CREATE OR REPLACE TRIGGER trg_access_permissions_bi
BEFORE INSERT ON AccessPermissions
FOR EACH ROW
BEGIN
    :NEW.permission_id := seq_access_permissions.NEXTVAL;
END;

-- 创建表 SystemLogs
CREATE TABLE SystemLogs (
    log_id NUMBER PRIMARY KEY,
    log_action VARCHAR2(100),
    user_id NUMBER,
    log_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details CLOB,
    CONSTRAINT fk_sl_user FOREIGN KEY (user_id) REFERENCES Employees(employee_id)
);

CREATE OR REPLACE TRIGGER trg_system_logs_bi
BEFORE INSERT ON SystemLogs
FOR EACH ROW
BEGIN
    :NEW.log_id := seq_system_logs.NEXTVAL;
END;

-- 创建表 EmployeeDepartmentPositions
CREATE TABLE EmployeeDepartmentPositions (
    id NUMBER PRIMARY KEY,
    employee_id NUMBER NOT NULL,
    department_id NUMBER NOT NULL,
    position_id NUMBER NOT NULL,
    CONSTRAINT fk_edp_employee FOREIGN KEY (employee_id) REFERENCES Employees(employee_id),
    CONSTRAINT fk_edp_department FOREIGN KEY (department_id) REFERENCES Departments(department_id),
    CONSTRAINT fk_edp_position FOREIGN KEY (position_id) REFERENCES Positions(position_id)
);

CREATE OR REPLACE TRIGGER trg_edp_bi
BEFORE INSERT ON EmployeeDepartmentPositions
FOR EACH ROW
BEGIN
    :NEW.id := seq_edp.NEXTVAL;
END;
