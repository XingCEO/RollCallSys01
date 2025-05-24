// scripts/init-attendance.js
// 簡單的點名系統資料庫初始化腳本

const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';

console.log('🚀 開始初始化點名系統資料庫...');

try {
  const db = new Database(DB_PATH);
  console.log('✅ 資料庫連接成功');

  // 檢查資料表是否存在
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_records'").get();
  
  if (tables) {
    console.log('✅ attendance_records 表已存在');
    db.close();
    console.log('🎉 點名系統已準備就緒！');
    process.exit(0);
  }

  // 建立點名記錄表
  console.log('🔄 建立 attendance_records 表...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      course_id INTEGER,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      timestamp DATETIME NOT NULL,
      status TEXT DEFAULT 'present',
      device_info TEXT,
      ip_address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  console.log('✅ attendance_records 表建立成功');

  // 建立索引
  console.log('🔄 建立索引...');
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date(timestamp));
  `);
  
  console.log('✅ 索引建立成功');

  // 建立課程表（可選）
  console.log('🔄 建立 courses 表...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT UNIQUE NOT NULL,
      course_name TEXT NOT NULL,
      instructor TEXT,
      department TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✅ courses 表建立成功');

  // 插入測試課程
  console.log('🔄 插入測試課程...');
  
  db.exec(`
    INSERT OR IGNORE INTO courses (course_code, course_name, instructor, department) VALUES
    ('CS101', '計算機概論', '王教授', '資訊工程系'),
    ('CS201', '資料結構', '李教授', '資訊工程系'),
    ('EE101', '電路學', '張教授', '電子工程系');
  `);
  
  console.log('✅ 測試課程插入成功');

  // 驗證建立結果
  const attendanceTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_records'").get();
  const coursesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='courses'").get();
  
  console.log('\n📊 建立結果驗證:');
  console.log(`  attendance_records: ${attendanceTable ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`  courses: ${coursesTable ? '✅ 成功' : '❌ 失敗'}`);

  if (attendanceTable) {
    console.log('\n🎉 點名系統資料庫初始化完成！');
    console.log('現在您可以使用點名功能了。');
  } else {
    console.log('\n❌ 初始化失敗，請檢查錯誤訊息。');
  }

  db.close();
  
} catch (error) {
  console.error('❌ 初始化失敗:', error);
  console.error('詳細錯誤:', error.message);
  
  if (error.message.includes('no such table: users')) {
    console.log('\n💡 建議: 請先執行基礎資料庫初始化');
    console.log('npm run db:init');
  }
  
  process.exit(1);
}