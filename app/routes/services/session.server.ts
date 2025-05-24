// app/routes/services/session.server.ts
// Session 管理 (更新版本支援資料庫用戶)

import { createCookieSessionStorage } from "@remix-run/node";
import type { SessionUser } from "../../lib/google-auth.server";

// 檢查必要的環境變數
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required');
}

// 檢查是否為開發環境
const isDevelopment = process.env.NODE_ENV !== 'production';

// 建立並導出 sessionStorage - 使用 SessionUser 類型
export const sessionStorage = createCookieSessionStorage<{
  user: SessionUser;
}>({
  cookie: {
    name: "remix_auth_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [AUTH_SECRET],
    secure: !isDevelopment,
    maxAge: 60 * 60 * 24 * 7, // 7 天
  },
});

// 導出 session 相關函數
export const { getSession, commitSession, destroySession } = sessionStorage;

// 工具函數：從請求中獲取用戶
export async function getUserFromSession(request: Request): Promise<SessionUser | null> {
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const user = session.get("user");
    
    // 驗證 session 中的用戶資料是否完整
    if (user && user.id && user.googleId && user.email) {
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('取得 Session 用戶失敗:', error);
    return null;
  }
}

// 工具函數：檢查用戶是否已登入，要求必須登入
export async function requireUserSession(request: Request, redirectTo: string = "/login"): Promise<SessionUser> {
  const user = await getUserFromSession(request);
  if (!user) {
    throw new Response("Unauthorized", {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  }
  return user;
}

// 工具函數：建立用戶 Session
export async function createUserSession(
  request: Request,
  user: SessionUser,
  redirectTo: string = "/dashboard"
) {
  const session = await getSession(request.headers.get("Cookie"));
  session.set("user", user);
  
  return new Response("Redirect", {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await commitSession(session),
    },
  });
}

// 工具函數：登出用戶
export async function logoutUser(request: Request, redirectTo: string = "/login") {
  const session = await getSession(request.headers.get("Cookie"));
  
  return new Response("Redirect", {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await destroySession(session),
    },
  });
}

// 工具函數：檢查用戶角色
export function hasRole(user: SessionUser, role: string): boolean {
  return user.role === role;
}

// 工具函數：檢查是否為管理員
export function isAdmin(user: SessionUser): boolean {
  return user.role === 'admin';
}

// 工具函數：要求特定角色
export async function requireRole(
  request: Request, 
  role: string, 
  redirectTo: string = "/login"
): Promise<SessionUser> {
  const user = await requireUserSession(request, redirectTo);
  
  if (!hasRole(user, role)) {
    throw new Response("Forbidden", {
      status: 403,
      headers: {
        Location: "/dashboard?error=insufficient_permissions",
      },
    });
  }
  
  return user;
}

// 工具函數：要求管理員權限
export async function requireAdmin(request: Request): Promise<SessionUser> {
  return requireRole(request, 'admin', "/dashboard?error=admin_required");
}