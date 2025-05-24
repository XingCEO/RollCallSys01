// app/lib/database.server.ts
// SQLite 資料庫連接和管理 (除錯版本)

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

interface DatabaseConfig {
  path: string;
  enableLogging: boolean;
  enableBackup: boolean;
}

class DatabaseManager {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    console.log("🔄 DatabaseManager 建構子被調用");
    console.log("  - 資料庫路徑:", config.path);
    console.log("  - 啟用日誌:", config.enableLogging);
  }

  private initialize(): void {
    if (this.isInitialized) {
      console.log("⚠️  資料庫已經初始化，跳過重複初始化");
      return;
    }

    try {
      console.log("🔄 開始初始化 SQLite 資料庫...");
      
      // 確保資料庫目錄存在
      const dbDir = dirname(this.config.path);
      console.log("🔄 檢查資料庫目錄:", dbDir);
      
      if (!existsSync(dbDir)) {
        console.log("🔄 建立資料庫目錄...");
        mkdirSync(dbDir, { recursive: true });
        console.log("✅ 資料庫目錄建立完成");
      } else {
        console.log("✅ 資料庫目錄已存在");
      }

      // 檢查資料庫檔案是否存在
      const dbExists = existsSync(this.config.path);
      console.log("🔄 資料庫檔案存在:", dbExists ? "是" : "否");

      // 建立資料庫連接
      console.log("🔄 建立 SQLite 資料庫連接...");
      this.db = new Database(this.config.path, {
        verbose: this.config.enableLogging ? (sql) => {
          console.log("📝 SQL 查詢:", sql);
        } : undefined,
      });

      // 設定 SQLite 優化參數
      console.log("🔄 設定 SQLite 參數...");
      this.db.pragma('journal_mode = WAL'); // 啟用 WAL 模式提升並發效能
      this.db.pragma('cache_size = 10000');  // 設定快取大小
      this.db.pragma('foreign_keys = ON');   // 啟用外鍵約束

      console.log("✅ SQLite 參數設定完成");

      // 執行資料庫初始化
      this.runInitialSetup();

      this.isInitialized = true;
      console.log(`🎉 SQLite 資料庫連接成功: ${this.config.path}`);
      
      // 驗證連接
      this.verifyConnection();
      
    } catch (error) {
      console.error('❌ 資料庫初始化失敗:', error);
      console.error('錯誤詳情:', error instanceof Error ? error.message : '未知錯誤');
      throw error;
    }
  }

  private verifyConnection(): void {
    if (!this.db) return;
    
    try {
      // 執行簡單查詢驗證連接
      const result = this.db.prepare("SELECT 1 as test").get();
      console.log("✅ 資料庫連接驗證成功:", result);
      
      // 檢查 users 表是否存在
      const tables = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).get();
      
      console.log("✅ users 表存在:", tables ? "是" : "否");
      
      if (tables) {
        // 檢查 users 表的記錄數量
        const count = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
        console.log("📊 users 表記錄數量:", count.count);
      }
      
    } catch (error) {
      console.error("❌ 資料庫連接驗證失敗:", error);
      throw error;
    }
  }

  private runInitialSetup(): void {
    if (!this.db) throw new Error('資料庫未初始化');

    try {
      console.log("🔄 執行資料庫結構初始化...");
      
      // 讀取並執行 schema.sql
      const schemaPath = join(process.cwd(), 'database', 'schema.sql');
      console.log("🔄 查找 schema 檔案:", schemaPath);
      
      if (existsSync(schemaPath)) {
        console.log("✅ 找到 schema 檔案，開始執行...");
        const schema = readFileSync(schemaPath, 'utf8');
        console.log("📄 Schema 內容長度:", schema.length, "字元");
        
        this.db.exec(schema);
        console.log('✅ 資料庫結構建立完成');
        
        // 驗證表結構
        const tableInfo = this.db.prepare("PRAGMA table_info(users)").all();
        console.log("📋 users 表結構:");
        tableInfo.forEach((col: any) => {
          console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
        });
        
      } else {
        console.warn(`⚠️  找不到 schema 檔案: ${schemaPath}`);
        console.log("🔄 使用內建 schema 建立基本結構...");
        
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
        `;
        
        this.db.exec(basicSchema);
        console.log('✅ 基本資料庫結構建立完成');
      }
    } catch (error) {
      console.error('❌ 執行資料庫結構建立失敗:', error);
      throw error;
    }
  }

  public getDatabase(): Database.Database {
    if (!this.isInitialized) {
      console.log("⚠️  資料庫尚未初始化，現在進行初始化...");
      this.initialize();
    }
    
    if (!this.db) {
      throw new Error('資料庫未初始化');
    }
    return this.db;
  }

  public prepare(sql: string): Database.Statement {
    const db = this.getDatabase();
    try {
      return db.prepare(sql);
    } catch (error) {
      console.error("❌ 準備 SQL 語句失敗:", sql);
      console.error("錯誤:", error);
      throw error;
    }
  }

  public exec(sql: string): void {
    const db = this.getDatabase();
    try {
      db.exec(sql);
    } catch (error) {
      console.error("❌ 執行 SQL 失敗:", sql);
      console.error("錯誤:", error);
      throw error;
    }
  }

  public transaction<T>(fn: () => T): T {
    const db = this.getDatabase();
    try {
      return db.transaction(fn)();
    } catch (error) {
      console.error("❌ 事務執行失敗:", error);
      throw error;
    }
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('✅ 資料庫連接已關閉');
    }
  }

  public getStats(): any {
    const db = this.getDatabase();
    
    try {
      const stats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE created_at >= date('now')) as users_today,
          (SELECT COUNT(*) FROM users WHERE last_login >= date('now')) as active_today,
          (SELECT SUM(login_count) FROM users) as total_logins
      `).get();
      
      console.log("📊 資料庫統計:", stats);
      return stats;
    } catch (error) {
      console.error("❌ 取得資料庫統計失敗:", error);
      throw error;
    }
  }
}

// 建立單例資料庫實例
console.log("🔄 建立 DatabaseManager 實例...");
export const database = new DatabaseManager({
  path: process.env.DATABASE_PATH || './data/app.db',
  enableLogging: process.env.ENABLE_DATABASE_LOGGING === 'true',
  enableBackup: true,
});

// 導出便利函數
export const getDb = () => {
  try {
    return database.getDatabase();
  } catch (error) {
    console.error("❌ 取得資料庫實例失敗:", error);
    throw error;
  }
};

export const prepare = (sql: string) => {
  try {
    return database.prepare(sql);
  } catch (error) {
    console.error("❌ 準備 SQL 語句失敗:", sql, error);
    throw error;
  }
};

export const exec = (sql: string) => database.exec(sql);
export const transaction = <T>(fn: () => T) => database.transaction(fn);

// 程序結束時關閉資料庫
process.on('exit', () => {
  console.log("🔄 程序結束，關閉資料庫連接...");
  database.close();
});

process.on('SIGINT', () => {
  console.log("🔄 收到 SIGINT，關閉資料庫連接...");
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("🔄 收到 SIGTERM，關閉資料庫連接...");
  database.close();
  process.exit(0);
});