// app/lib/user.server.ts
// 用戶相關資料庫操作 (修復版本)

import { prepare, transaction } from './database.server';
import type { User, CreateUserData, UpdateUserData, UserStats } from '../models/user';
import { mapDbRowToUser } from '../models/user';

// 初始化 Prepared Statements 的函數
function initializeStatements() {
  console.log("🔄 初始化資料庫 Prepared Statements...");
  
  try {
    const statements = {
      findByGoogleId: prepare('SELECT * FROM users WHERE google_id = ? AND is_active = 1'),
      findByEmail: prepare('SELECT * FROM users WHERE email = ? AND is_active = 1'),
      findById: prepare('SELECT * FROM users WHERE id = ? AND is_active = 1'),
      insertUser: prepare(`
        INSERT INTO users (google_id, email, name, avatar_url, locale, verified_email, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      updateUser: prepare(`
        UPDATE users 
        SET email = ?, name = ?, avatar_url = ?, locale = ?, verified_email = ?
        WHERE google_id = ?
      `),
      updateLastLogin: prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE google_id = ?'),
      incrementLoginCount: prepare('UPDATE users SET login_count = login_count + 1 WHERE google_id = ?'),
      deactivateUser: prepare('UPDATE users SET is_active = 0 WHERE google_id = ?'),
      getAllUsers: prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC'),
      getUserStats: prepare(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= date('now') THEN 1 END) as new_users_today,
          COUNT(CASE WHEN created_at >= date('now', 'start of month') THEN 1 END) as new_users_this_month,
          COUNT(CASE WHEN last_login >= date('now') THEN 1 END) as active_users_today,
          COALESCE(SUM(login_count), 0) as total_logins
        FROM users 
        WHERE is_active = 1
      `),
    };
    
    console.log("✅ Prepared Statements 初始化完成");
    return statements;
  } catch (error) {
    console.error("❌ 初始化 Prepared Statements 失敗:", error);
    throw error;
  }
}

// 延遲初始化，避免模組載入時的問題
let statements: ReturnType<typeof initializeStatements> | null = null;

function getStatements() {
  if (!statements) {
    statements = initializeStatements();
  }
  return statements;
}

/**
 * 根據 Google ID 查詢用戶
 */
export function findUserByGoogleId(googleId: string): User | null {
  console.log("🔄 查詢用戶 (Google ID):", googleId);
  
  try {
    const stmt = getStatements();
    const row = stmt.findByGoogleId.get(googleId) as any;
    
    if (row) {
      console.log("✅ 找到用戶:", {
        id: row.id,
        email: row.email,
        name: row.name,
        loginCount: row.login_count
      });
      return mapDbRowToUser(row);
    } else {
      console.log("ℹ️  用戶不存在 (Google ID):", googleId);
      return null;
    }
  } catch (error) {
    console.error('❌ 查詢用戶失敗 (Google ID):', googleId, error);
    throw new Error(`查詢用戶失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 根據 Email 查詢用戶
 */
export function findUserByEmail(email: string): User | null {
  console.log("🔄 查詢用戶 (Email):", email);
  
  try {
    const stmt = getStatements();
    const row = stmt.findByEmail.get(email) as any;
    
    if (row) {
      console.log("✅ 找到用戶 (Email):", row.name);
      return mapDbRowToUser(row);
    } else {
      console.log("ℹ️  用戶不存在 (Email):", email);
      return null;
    }
  } catch (error) {
    console.error('❌ 查詢用戶失敗 (Email):', email, error);
    throw new Error(`查詢用戶失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 根據 ID 查詢用戶
 */
export function findUserById(id: number): User | null {
  console.log("🔄 查詢用戶 (ID):", id);
  
  try {
    const stmt = getStatements();
    const row = stmt.findById.get(id) as any;
    
    if (row) {
      console.log("✅ 找到用戶 (ID):", row.name);
      return mapDbRowToUser(row);
    } else {
      console.log("ℹ️  用戶不存在 (ID):", id);
      return null;
    }
  } catch (error) {
    console.error('❌ 查詢用戶失敗 (ID):', id, error);
    throw new Error(`查詢用戶失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 建立新用戶
 */
export function createUser(userData: CreateUserData): User {
  console.log("🔄 開始建立新用戶:");
  console.log("  - Google ID:", userData.googleId);
  console.log("  - Email:", userData.email);
  console.log("  - Name:", userData.name);
  console.log("  - Role:", userData.role);
  
  try {
    return transaction(() => {
      console.log("🔄 開始資料庫事務...");
      
      const stmt = getStatements();
      
      // 檢查用戶是否已存在
      const existingUser = stmt.findByGoogleId.get(userData.googleId) as any;
      if (existingUser) {
        console.error("❌ 用戶已存在:", userData.googleId);
        throw new Error('Google 帳號已存在');
      }
      
      // 檢查 Email 是否已被使用
      const existingEmail = stmt.findByEmail.get(userData.email) as any;
      if (existingEmail) {
        console.error("❌ Email 已被使用:", userData.email);
        throw new Error('電子郵件已被使用');
      }
      
      console.log("🔄 執行插入用戶...");
      
      // 插入新用戶
      const result = stmt.insertUser.run(
        userData.googleId,
        userData.email,
        userData.name,
        userData.avatarUrl || null,
        userData.locale || 'zh-TW',
        userData.verifiedEmail ? 1 : 0,
        userData.role || 'user'
      );

      console.log("✅ 插入結果:", {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      });

      if (result.changes === 0) {
        throw new Error('建立用戶失敗：沒有記錄被插入');
      }

      // 查詢並返回新建立的用戶
      const newUser = stmt.findByGoogleId.get(userData.googleId) as any;
      if (!newUser) {
        throw new Error('無法取得新建立的用戶');
      }

      const mappedUser = mapDbRowToUser(newUser);
      console.log(`✅ 新用戶建立成功: ${mappedUser.email} (資料庫ID: ${mappedUser.id})`);
      return mappedUser;
    });
  } catch (error) {
    console.error('❌ 建立用戶失敗:', error);
    
    // 檢查是否為重複鍵錯誤
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('google_id')) {
        throw new Error('Google 帳號已存在');
      }
      if (error.message.includes('email')) {
        throw new Error('電子郵件已被使用');
      }
    }
    
    throw new Error(`建立用戶失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 更新用戶資訊
 */
export function updateUser(googleId: string, userData: UpdateUserData): User {
  console.log("🔄 開始更新用戶:", googleId);
  console.log("  - 更新資料:", userData);
  
  try {
    return transaction(() => {
      const stmt = getStatements();
      
      // 先取得現有用戶資料
      const existingUser = stmt.findByGoogleId.get(googleId) as any;
      if (!existingUser) {
        throw new Error('用戶不存在');
      }

      console.log("🔄 現有用戶資料:", {
        name: existingUser.name,
        email: existingUser.email,
        avatarUrl: existingUser.avatar_url
      });

      // 合併更新資料
      const updatedData = {
        email: userData.email ?? existingUser.email,
        name: userData.name ?? existingUser.name,
        avatarUrl: userData.avatarUrl ?? existingUser.avatar_url,
        locale: userData.locale ?? existingUser.locale,
        verifiedEmail: userData.verifiedEmail ?? Boolean(existingUser.verified_email),
      };

      console.log("🔄 合併後的資料:", updatedData);

      // 執行更新
      const result = stmt.updateUser.run(
        updatedData.email,
        updatedData.name,
        updatedData.avatarUrl,
        updatedData.locale,
        updatedData.verifiedEmail ? 1 : 0,
        googleId
      );

      console.log("✅ 更新結果:", { changes: result.changes });

      if (result.changes === 0) {
        throw new Error('更新用戶失敗：沒有記錄被更新');
      }

      // 返回更新後的用戶資料
      const updatedUser = stmt.findByGoogleId.get(googleId) as any;
      if (!updatedUser) {
        throw new Error('無法取得更新後的用戶');
      }

      const mappedUser = mapDbRowToUser(updatedUser);
      console.log("✅ 用戶更新成功:", mappedUser.name);
      return mappedUser;
    });
  } catch (error) {
    console.error('❌ 更新用戶失敗:', googleId, error);
    throw new Error(`更新用戶失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 更新最後登入時間
 */
export function updateLastLogin(googleId: string): void {
  console.log("🔄 更新最後登入時間:", googleId);
  
  try {
    const stmt = getStatements();
    const result = stmt.updateLastLogin.run(googleId);
    
    console.log("✅ 更新最後登入時間結果:", { changes: result.changes });
    
    if (result.changes === 0) {
      throw new Error('用戶不存在');
    }
  } catch (error) {
    console.error('❌ 更新登入時間失敗:', googleId, error);
    throw new Error(`更新登入時間失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 增加登入次數
 */
export function incrementLoginCount(googleId: string): void {
  console.log("🔄 增加登入次數:", googleId);
  
  try {
    const stmt = getStatements();
    const result = stmt.incrementLoginCount.run(googleId);
    
    console.log("✅ 增加登入次數結果:", { changes: result.changes });
    
    if (result.changes === 0) {
      throw new Error('用戶不存在');
    }
  } catch (error) {
    console.error('❌ 更新登入次數失敗:', googleId, error);
    throw new Error(`更新登入次數失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 停用用戶帳號
 */
export function deactivateUser(googleId: string): void {
  console.log("🔄 停用用戶帳號:", googleId);
  
  try {
    const stmt = getStatements();
    const result = stmt.deactivateUser.run(googleId);
    
    if (result.changes === 0) {
      throw new Error('用戶不存在');
    }
    console.log(`✅ 用戶已停用: ${googleId}`);
  } catch (error) {
    console.error('❌ 停用用戶失敗:', googleId, error);
    throw new Error(`停用用戶失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 取得所有用戶列表（管理員功能）
 */
export function getAllUsers(): User[] {
  console.log("🔄 取得所有用戶列表...");
  
  try {
    const stmt = getStatements();
    const rows = stmt.getAllUsers.all();
    
    console.log("✅ 取得用戶列表成功，用戶數量:", rows.length);
    
    return rows.map(mapDbRowToUser);
  } catch (error) {
    console.error('❌ 取得用戶列表失敗:', error);
    throw new Error(`取得用戶列表失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 取得用戶統計資訊
 */
export function getUserStats(): UserStats {
  console.log("🔄 取得用戶統計資訊...");
  
  try {
    const stmt = getStatements();
    const stats = stmt.getUserStats.get() as any;
    
    const result = {
      totalUsers: stats.total_users || 0,
      newUsersToday: stats.new_users_today || 0,
      newUsersThisMonth: stats.new_users_this_month || 0,
      activeUsersToday: stats.active_users_today || 0,
      totalLogins: stats.total_logins || 0,
    };
    
    console.log("✅ 用戶統計資訊:", result);
    
    return result;
  } catch (error) {
    console.error('❌ 取得統計資訊失敗:', error);
    throw new Error(`取得統計資訊失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 檢查用戶是否存在
 */
export function userExists(googleId: string): boolean {
  console.log("🔄 檢查用戶是否存在:", googleId);
  
  try {
    const user = findUserByGoogleId(googleId);
    const exists = user !== null;
    console.log("✅ 用戶存在檢查結果:", exists);
    return exists;
  } catch (error) {
    console.error('❌ 檢查用戶存在失敗:', googleId, error);
    return false;
  }
}