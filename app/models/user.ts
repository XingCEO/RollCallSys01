// app/models/user.ts
// 用戶資料模型定義

export interface User {
  id: number;                    // SQLite AUTOINCREMENT ID
  googleId: string;              // Google OAuth ID
  email: string;
  name: string;
  avatarUrl?: string;
  locale: string;
  verifiedEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  loginCount: number;
  isActive: boolean;
  role: 'user' | 'admin' | 'moderator';
}

export interface CreateUserData {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  locale?: string;
  verifiedEmail?: boolean;
  role?: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  avatarUrl?: string;
  locale?: string;
  verifiedEmail?: boolean;
}

export interface SessionUser {
  id: number;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  loginCount: number;
  isNewUser?: boolean;  // 標記是否為首次註冊
}

export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
  totalLogins: number;
}

// 資料庫原始資料轉換為 User 物件的輔助函數
export function mapDbRowToUser(row: any): User {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    locale: row.locale,
    verifiedEmail: Boolean(row.verified_email),
    createdAt: typeof row.created_at === 'string' ? new Date(row.created_at) : row.created_at,
    updatedAt: typeof row.updated_at === 'string' ? new Date(row.updated_at) : row.updated_at,
    lastLogin: row.last_login ? (typeof row.last_login === 'string' ? new Date(row.last_login) : row.last_login) : undefined,
    loginCount: row.login_count,
    isActive: Boolean(row.is_active),
    role: row.role as 'user' | 'admin' | 'moderator',
  };
}