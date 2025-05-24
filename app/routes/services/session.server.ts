import { createCookieSessionStorage } from "@remix-run/node";
import type { User } from "../../lib/google-auth.server";

// 檢查必要的環境變數
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required');
}

// 檢查是否為開發環境
const isDevelopment = process.env.NODE_ENV !== 'production';

// 建立並導出 sessionStorage
export const sessionStorage = createCookieSessionStorage<{
  user: User;
}>({
  cookie: {
    name: "remix_auth_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [AUTH_SECRET],
    secure: !isDevelopment,
  },
});

// 導出 session 相關函數
export const { getSession, commitSession, destroySession } = sessionStorage;

// 工具函數：從請求中獲取用戶
export async function getUserFromSession(request: Request): Promise<User | null> {
  const session = await getSession(request.headers.get("Cookie"));
  return session.get("user") || null;
}

// 工具函數：檢查用戶是否已登入
export async function requireUserSession(request: Request, redirectTo: string = "/login") {
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