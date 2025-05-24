-- database/migrations/004_add_attendance.sql
-- 建立點名系統相關資料表
-- SQLite 語法 - 請勿用於 SQL Server

-- 課程資料表
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT UNIQUE NOT NULL,          -- 課程代碼
    course_name TEXT NOT NULL,                 -- 課程名稱
    instructor TEXT,                           -- 授課教師
    department TEXT,                           -- 開課系所
    credits INTEGER DEFAULT 3,                -- 學分數
    semester TEXT,                             -- 學期 (例如: 2024-1)
    classroom TEXT,                            -- 教室
    schedule TEXT,                             -- 上課時間
    description TEXT,                          -- 課程描述
    max_students INTEGER DEFAULT 50,          -- 最大學生數
    status TEXT DEFAULT 'active',             -- 課程狀態 (active, inactive, ended)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 點名記錄資料表
CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                 -- 用戶ID (關聯到 users 表)
    student_id TEXT NOT NULL,                 -- 學號
    course_id INTEGER,                        -- 課程ID (關聯到 courses 表，可選)
    latitude REAL NOT NULL,                   -- 緯度
    longitude REAL NOT NULL,                  -- 經度
    accuracy REAL,                            -- GPS 準確度 (公尺)
    timestamp DATETIME NOT NULL,              -- 點名時間
    status TEXT DEFAULT 'present',           -- 出席狀態 (present, late, absent)
    device_info TEXT,                         -- 設備資訊
    ip_address TEXT,                          -- IP 位址
    notes TEXT,                               -- 備註
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵約束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- 課程學生選課關聯表
CREATE TABLE IF NOT EXISTS course_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,              -- 課程ID
    user_id INTEGER NOT NULL,                -- 用戶ID
    student_id TEXT NOT NULL,                -- 學號
    enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'enrolled',         -- 選課狀態 (enrolled, dropped, completed)
    grade TEXT,                             -- 成績
    
    -- 外鍵約束
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 唯一約束：一個學生不能重複選同一門課
    UNIQUE(course_id, user_id)
);

-- 點名地點設定表 (可選功能)
CREATE TABLE IF NOT EXISTS attendance_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,                       -- 關聯課程 (可選)
    location_name TEXT NOT NULL,            -- 地點名稱
    latitude REAL NOT NULL,                 -- 中心緯度
    longitude REAL NOT NULL,                -- 中心經度
    radius REAL DEFAULT 100,                -- 允許範圍 (公尺)
    address TEXT,                           -- 地址描述
    is_active INTEGER DEFAULT 1,           -- 是否啟用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_id ON attendance_records(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date(timestamp));
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_user ON course_enrollments(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON course_enrollments(student_id);

CREATE INDEX IF NOT EXISTS idx_locations_course ON attendance_locations(course_id);
CREATE INDEX IF NOT EXISTS idx_locations_active ON attendance_locations(is_active);

-- 建立觸發器自動更新時間戳記
CREATE TRIGGER IF NOT EXISTS courses_updated_at 
    AFTER UPDATE ON courses
    FOR EACH ROW
    BEGIN
        UPDATE courses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 插入測試課程資料
INSERT OR IGNORE INTO courses (course_code, course_name, instructor, department, semester, classroom, schedule) VALUES
('CS101', '計算機概論', '王教授', '資訊工程系', '2024-1', 'E101', '週一 09:10-12:00'),
('CS201', '資料結構', '李教授', '資訊工程系', '2024-1', 'E102', '週二 13:10-16:00'),
('EE101', '電路學', '張教授', '電子工程系', '2024-1', 'F201', '週三 09:10-12:00'),
('ME101', '工程力學', '陳教授', '機械工程系', '2024-1', 'G101', '週四 13:10-16:00'),
('CS301', '軟體工程', '劉教授', '資訊工程系', '2024-1', 'E103', '週五 09:10-12:00');

-- 插入測試點名地點 (以學校主要建築為例)
INSERT OR IGNORE INTO attendance_locations (location_name, latitude, longitude, radius, address) VALUES
('工學院大樓', 25.0174, 121.5398, 150, '台北市工學院大樓'),
('資訊大樓', 25.0184, 121.5408, 120, '台北市資訊大樓'),
('圖書館', 25.0164, 121.5388, 100, '台北市中央圖書館'),
('學生活動中心', 25.0154, 121.5378, 80, '台北市學生活動中心'),
('體育館', 25.0144, 121.5368, 200, '台北市體育館');

-- 為測試學生自動選課 (可選)
-- 這裡假設學號 123456 (王小明) 選修 CS101
INSERT OR IGNORE INTO course_enrollments (course_id, user_id, student_id) 
SELECT 
    c.id as course_id,
    u.id as user_id,
    s.student_id
FROM courses c, users u, students s
WHERE c.course_code = 'CS101' 
    AND s.student_id = '123456'
    AND u.student_id = s.student_id
    AND u.binding_status = 'bound'
LIMIT 1;