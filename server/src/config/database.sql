-- Step 1: Drop all tables (ignore errors)
DROP TABLE UnlockRequests;
DROP TABLE AccessPermissions;
DROP TABLE SystemLogs;
DROP TABLE RoomAccessLog;
DROP TABLE BookingApprovals;
DROP TABLE Bookings;
DROP TABLE RoomAmenities;
DROP TABLE Rooms;
DROP TABLE UserCredentials;
DROP TABLE EmployeeDepartmentPositions;
DROP TABLE Positions;
DROP TABLE Departments;
DROP TABLE Employees;

-- Step 2: Drop all sequences (ignore errors)
DROP SEQUENCE emp_seq;
DROP SEQUENCE dept_seq;
DROP SEQUENCE pos_seq;
DROP SEQUENCE user_seq;
DROP SEQUENCE room_seq;
DROP SEQUENCE booking_seq;
DROP SEQUENCE permission_seq;
DROP SEQUENCE log_seq;
DROP SEQUENCE access_seq;

-- Step 3: Create simple sequences
CREATE SEQUENCE emp_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE dept_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE pos_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE user_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE room_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE booking_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE permission_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE log_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE access_seq START WITH 1 INCREMENT BY 1;

-- Step 4: Create base tables without foreign keys
CREATE TABLE Employees (
    employee_id NUMBER,
    name VARCHAR2(100),
    email VARCHAR2(100),
    phone_number VARCHAR2(20),
    created_date DATE DEFAULT SYSDATE,
    updated_date DATE DEFAULT SYSDATE,
    is_locked NUMBER(1) DEFAULT 0,
    CONSTRAINT emp_pk PRIMARY KEY (employee_id)
);

CREATE TABLE Departments (
    department_id NUMBER,
    department_name VARCHAR2(100),
    CONSTRAINT dept_pk PRIMARY KEY (department_id)
);

CREATE TABLE Positions (
    position_id NUMBER,
    position_name VARCHAR2(100),
    CONSTRAINT pos_pk PRIMARY KEY (position_id)
);

CREATE TABLE Rooms (
    room_id NUMBER,
    room_name VARCHAR2(100),
    building_id NUMBER,
    floor_number NUMBER,
    capacity NUMBER,
    is_disabled NUMBER(1) DEFAULT 0,
    created_date DATE DEFAULT SYSDATE,
    updated_date DATE DEFAULT SYSDATE,
    CONSTRAINT room_pk PRIMARY KEY (room_id)
);

CREATE TABLE UserCredentials (
    user_id NUMBER,
    employee_id NUMBER,
    username VARCHAR2(100),
    password_hash VARCHAR2(255),
    created_date DATE DEFAULT SYSDATE,
    updated_date DATE DEFAULT SYSDATE,
    CONSTRAINT user_pk PRIMARY KEY (user_id)
);

CREATE TABLE EmployeeDepartmentPositions (
    employee_id NUMBER,
    department_id NUMBER,
    position_id NUMBER,
    assignment_date DATE DEFAULT SYSDATE,
    CONSTRAINT edp_pk PRIMARY KEY (employee_id, department_id, position_id)
);

CREATE TABLE Bookings (
    booking_id NUMBER,
    employee_id NUMBER,
    room_id NUMBER,
    start_time DATE,
    end_time DATE,
    status VARCHAR2(20) DEFAULT 'Pending',
    cancellation_reason VARCHAR2(255),
    created_date DATE DEFAULT SYSDATE,
    updated_date DATE DEFAULT SYSDATE,
    CONSTRAINT book_pk PRIMARY KEY (booking_id)
);

CREATE TABLE BookingApprovals (
    booking_id NUMBER,
    approved_by NUMBER,
    approval_status VARCHAR2(20) DEFAULT 'Pending',
    approval_reason VARCHAR2(255),
    approval_date DATE DEFAULT SYSDATE,
    CONSTRAINT ba_pk PRIMARY KEY (booking_id, approved_by)
);

CREATE TABLE RoomAmenities (
    room_id NUMBER,
    amenity_name VARCHAR2(100),
    CONSTRAINT ra_pk PRIMARY KEY (room_id, amenity_name)
);

CREATE TABLE SystemLogs (
    log_id NUMBER,
    action VARCHAR2(100),
    user_id NUMBER,
    log_date DATE DEFAULT SYSDATE,
    details VARCHAR2(4000),
    CONSTRAINT log_pk PRIMARY KEY (log_id)
);

CREATE TABLE AccessPermissions (
    permission_id NUMBER,
    position_id NUMBER,
    screen_name VARCHAR2(100),
    access_level VARCHAR2(10),
    CONSTRAINT perm_pk PRIMARY KEY (permission_id)
);

CREATE TABLE RoomAccessLog (
    access_log_id NUMBER,
    booking_id NUMBER,
    access_date DATE DEFAULT SYSDATE,
    CONSTRAINT ral_pk PRIMARY KEY (access_log_id)
);

CREATE TABLE UnlockRequests (
    employee_id NUMBER,
    request_date DATE DEFAULT SYSDATE,
    requested_by NUMBER,
    approval_status VARCHAR2(10) DEFAULT 'Pending',
    approval_reason VARCHAR2(255),
    approved_by NUMBER,
    approval_date DATE,
    CONSTRAINT ur_pk PRIMARY KEY (employee_id, request_date)
);

-- Step 5: Create simple triggers for ID generation
CREATE OR REPLACE TRIGGER emp_bi_trg
BEFORE INSERT ON Employees
FOR EACH ROW
BEGIN
  SELECT emp_seq.NEXTVAL INTO :NEW.employee_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER dept_bi_trg
BEFORE INSERT ON Departments
FOR EACH ROW
BEGIN
  SELECT dept_seq.NEXTVAL INTO :NEW.department_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER pos_bi_trg
BEFORE INSERT ON Positions
FOR EACH ROW
BEGIN
  SELECT pos_seq.NEXTVAL INTO :NEW.position_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER user_bi_trg
BEFORE INSERT ON UserCredentials
FOR EACH ROW
BEGIN
  SELECT user_seq.NEXTVAL INTO :NEW.user_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER room_bi_trg
BEFORE INSERT ON Rooms
FOR EACH ROW
BEGIN
  SELECT room_seq.NEXTVAL INTO :NEW.room_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER booking_bi_trg
BEFORE INSERT ON Bookings
FOR EACH ROW
BEGIN
  SELECT booking_seq.NEXTVAL INTO :NEW.booking_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER perm_bi_trg
BEFORE INSERT ON AccessPermissions
FOR EACH ROW
BEGIN
  SELECT permission_seq.NEXTVAL INTO :NEW.permission_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER log_bi_trg
BEFORE INSERT ON SystemLogs
FOR EACH ROW
BEGIN
  SELECT log_seq.NEXTVAL INTO :NEW.log_id FROM DUAL;
END;
/

CREATE OR REPLACE TRIGGER acc_bi_trg
BEFORE INSERT ON RoomAccessLog
FOR EACH ROW
BEGIN
  SELECT access_seq.NEXTVAL INTO :NEW.access_log_id FROM DUAL;
END;
/

-- Step 6: Create update triggers for dates
CREATE OR REPLACE TRIGGER emp_bu_trg
BEFORE UPDATE ON Employees
FOR EACH ROW
BEGIN
  :NEW.updated_date := SYSDATE;
END;
/

CREATE OR REPLACE TRIGGER user_bu_trg
BEFORE UPDATE ON UserCredentials
FOR EACH ROW
BEGIN
  :NEW.updated_date := SYSDATE;
END;
/

CREATE OR REPLACE TRIGGER room_bu_trg
BEFORE UPDATE ON Rooms
FOR EACH ROW
BEGIN
  :NEW.updated_date := SYSDATE;
END;
/

CREATE OR REPLACE TRIGGER booking_bu_trg
BEFORE UPDATE ON Bookings
FOR EACH ROW
BEGIN
  :NEW.updated_date := SYSDATE;
END;
/

-- Step 7: Add basic unique constraints
ALTER TABLE Employees ADD CONSTRAINT emp_email_uk UNIQUE (email);
ALTER TABLE Departments ADD CONSTRAINT dept_name_uk UNIQUE (department_name);
ALTER TABLE Positions ADD CONSTRAINT pos_name_uk UNIQUE (position_name);
ALTER TABLE UserCredentials ADD CONSTRAINT user_username_uk UNIQUE (username);

-- Step 8: Add basic check constraints
ALTER TABLE Employees ADD CONSTRAINT emp_is_locked_chk CHECK (is_locked IN (0,1));
ALTER TABLE Rooms ADD CONSTRAINT room_is_disabled_chk CHECK (is_disabled IN (0,1));
ALTER TABLE Bookings ADD CONSTRAINT book_status_chk 
  CHECK (status IN ('Pending', 'Approved', 'Cancelled', 'Expired'));
ALTER TABLE BookingApprovals ADD CONSTRAINT ba_status_chk 
  CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));
ALTER TABLE AccessPermissions ADD CONSTRAINT perm_level_chk 
  CHECK (access_level IN ('Read', 'Write', 'Delete'));

-- Step 9: Add basic foreign keys
ALTER TABLE UserCredentials ADD CONSTRAINT user_emp_fk 
  FOREIGN KEY (employee_id) REFERENCES Employees(employee_id);

ALTER TABLE EmployeeDepartmentPositions ADD CONSTRAINT edp_emp_fk 
  FOREIGN KEY (employee_id) REFERENCES Employees(employee_id);

ALTER TABLE EmployeeDepartmentPositions ADD CONSTRAINT edp_dept_fk 
  FOREIGN KEY (department_id) REFERENCES Departments(department_id);

ALTER TABLE EmployeeDepartmentPositions ADD CONSTRAINT edp_pos_fk 
  FOREIGN KEY (position_id) REFERENCES Positions(position_id);

ALTER TABLE Bookings ADD CONSTRAINT book_emp_fk 
  FOREIGN KEY (employee_id) REFERENCES Employees(employee_id);

ALTER TABLE Bookings ADD CONSTRAINT book_room_fk 
  FOREIGN KEY (room_id) REFERENCES Rooms(room_id);

ALTER TABLE BookingApprovals ADD CONSTRAINT ba_book_fk 
  FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id);

ALTER TABLE BookingApprovals ADD CONSTRAINT ba_emp_fk 
  FOREIGN KEY (approved_by) REFERENCES Employees(employee_id);

ALTER TABLE RoomAmenities ADD CONSTRAINT ra_room_fk 
  FOREIGN KEY (room_id) REFERENCES Rooms(room_id);

ALTER TABLE RoomAccessLog ADD CONSTRAINT ral_book_fk 
  FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id);

ALTER TABLE AccessPermissions ADD CONSTRAINT perm_pos_fk 
  FOREIGN KEY (position_id) REFERENCES Positions(position_id);