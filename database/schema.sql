-- database/schema.sql
-- SQLite 資料庫結構定義

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,           -- Google 用戶 ID
    email TEXT UNIQUE NOT NULL,               -- 電子郵件
    name TEXT NOT NULL,                       -- 顯示名稱
    avatar_url TEXT,                          -- 頭像 URL
    locale TEXT DEFAULT 'zh-TW',              -- 語言偏好
    verified_email INTEGER DEFAULT 1,         -- Email 驗證狀態 (1=true, 0=false)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,                      -- 最後登入時間
    login_count INTEGER DEFAULT 1,           -- 登入次數
    is_active INTEGER DEFAULT 1,             -- 帳號狀態 (1=active, 0=inactive)
    role TEXT DEFAULT 'user'                 -- 用戶角色
);

-- 建立索引優化查詢
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 建立觸發器自動更新 updated_at
CREATE TRIGGER IF NOT EXISTS users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;