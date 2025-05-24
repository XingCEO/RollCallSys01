// scripts/init-db.js
// 資料庫初始化腳本

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 配置
const DB_PATH = process.env.DATABASE_PATH || './data/app.db';
const SCHEMA_PATH = './database/schema.sql';

console.log('🚀 開始初始化 SQLite 資料庫...');

try {
  // 確保資料庫目錄存在
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✅ 建立資料庫目錄: ${dbDir}`);
  }

  // 建立資料庫連接
  const db = new Database(DB_PATH);
  console.log(`✅ 連接到資料庫: ${DB_PATH}`);

  // 設定 SQLite 參數
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = 10000');
  db.pragma('foreign_keys = ON');
  console.log('✅ 設定 SQLite 參數完成');

  // 讀取並執行 schema
  if (fs.existsSync(SCHEMA_PATH)) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('✅ 執行資料庫結構建立完成');
  } else {
    console.warn(`⚠️  找不到 schema 檔案: ${SCHEMA_PATH}`);
  }

  // 檢查資料表是否建立成功
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('✅ 已建立的資料表:', tables.map(t => t.name).join(', '));

  // 檢查 users 表結構
  const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
  if (userTableInfo.length > 0) {
    console.log('✅ users 表結構驗證成功');
    console.log('   欄位:', userTableInfo.map(col => `${col.name}(${col.type})`).join(', '));
  }

  // 建立測試資料（可選）
  if (process.argv.includes('--with-test-data')) {
    console.log('🔄 建立測試資料...');
    
    const insertTestUser = db.prepare(`
      INSERT OR IGNORE INTO users (google_id, email, name, avatar_url, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    insertTestUser.run(
      'test_admin_123',
      'admin@test.com',
      '測試管理員',
      'https://via.placeholder.com/150',
      'admin'
    );
    
    insertTestUser.run(
      'test_user_456',
      'user@test.com',
      '測試用戶',
      'https://via.placeholder.com/150',
      'user'
    );
    
    console.log('✅ 測試資料建立完成');
  }

  // 關閉資料庫連接
  db.close();
  
  console.log('🎉 資料庫初始化完成！');
  console.log(`📍 資料庫位置: ${path.resolve(DB_PATH)}`);
  
} catch (error) {
  console.error('❌ 資料庫初始化失敗:', error);
  process.exit(1);
}