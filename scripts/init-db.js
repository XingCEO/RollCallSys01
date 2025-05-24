// scripts/init-db.js
// 資料庫初始化腳本 (ES modules 版本)

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// 獲取當前文件的目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// 配置
const DB_PATH = process.env.DATABASE_PATH || './data/app.db';
const SCHEMA_PATH = resolve(projectRoot, 'database/schema.sql');

console.log('🚀 開始初始化 SQLite 資料庫...');

try {
  // 確保資料庫目錄存在
  const dbDir = dirname(resolve(DB_PATH));
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
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
  if (existsSync(SCHEMA_PATH)) {
    const schema = readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    console.log('✅ 執行資料庫結構建立完成');
  } else {
    console.warn(`⚠️  找不到 schema 檔案: ${SCHEMA_PATH}`);
    console.log('🔄 使用內建基本結構...');
    
    // 使用內建的基本結構
    const basicSchema = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        locale TEXT DEFAULT 'zh-TW',
        verified_email INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        login_count INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        role TEXT DEFAULT 'user'
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
      
      CREATE TRIGGER IF NOT EXISTS users_updated_at 
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `;
    
    db.exec(basicSchema);
    console.log('✅ 基本資料庫結構建立完成');
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
  const args = process.argv.slice(2);
  if (args.includes('--with-test-data')) {
    console.log('🔄 建立測試資料...');
    
    const insertTestUser = db.prepare(`
      INSERT OR IGNORE INTO users (google_id, email, name, avatar_url, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const adminResult = insertTestUser.run(
      'test_admin_123',
      'admin@test.com',
      '測試管理員',
      'https://via.placeholder.com/150',
      'admin'
    );
    
    const userResult = insertTestUser.run(
      'test_user_456',
      'user@test.com',
      '測試用戶',
      'https://via.placeholder.com/150',
      'user'
    );
    
    console.log(`✅ 測試資料建立完成 (新增 ${adminResult.changes + userResult.changes} 筆記錄)`);
  }

  // 顯示統計資訊
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    console.log(`📊 目前用戶數量: ${userCount.count}`);
  } catch (error) {
    console.log('⚠️  無法取得用戶統計:', error.message);
  }

  // 關閉資料庫連接
  db.close();
  
  console.log('🎉 資料庫初始化完成！');
  console.log(`📍 資料庫位置: ${resolve(DB_PATH)}`);
  
  console.log('\n📝 下一步操作:');
  console.log('1. 啟動應用: npm run dev');
  console.log('2. 前往登入頁面: http://localhost:5173/login');
  console.log('3. 使用 Google 帳號登入測試');
  console.log('4. 如需學號綁定功能，執行: npm run db:migrate');
  console.log('5. 如需點名功能，執行點名系統初始化');
  
} catch (error) {
  console.error('❌ 資料庫初始化失敗:', error);
  console.error('詳細錯誤:', error.message);
  
  if (error.message.includes('ENOENT')) {
    console.log('\n💡 建議: 檢查檔案路徑是否正確');
    console.log('資料庫路徑:', DB_PATH);
    console.log('Schema 路徑:', SCHEMA_PATH);
  } else if (error.message.includes('EACCES')) {
    console.log('\n💡 建議: 檢查檔案權限');
    console.log('chmod 755 ./data/');
  } else if (error.message.includes('database is locked')) {
    console.log('\n💡 建議: 關閉其他使用資料庫的程序');
  }
  
  process.exit(1);
}