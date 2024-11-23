-- 首先删除可能存在的触发器
DROP TRIGGER dept_bi_trg;

-- 重新创建触发器
CREATE OR REPLACE TRIGGER dept_bi_trg
BEFORE INSERT ON Departments
FOR EACH ROW
BEGIN
  IF :NEW.department_id IS NULL THEN
    SELECT dept_seq.NEXTVAL INTO :NEW.department_id FROM DUAL;
  END IF;
END;