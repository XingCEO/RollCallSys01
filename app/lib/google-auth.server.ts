// app/lib/google-auth.server.ts
// Google OAuth 認證邏輯 (更新版本)

import { OAuth2Client } from 'google-auth-library';

// 確保環境變數存在
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  throw new Error('Missing Google OAuth environment variables');
}

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL
);

// Google 回傳的用戶資訊
export type GoogleUser = {
  id: string;        // Google ID
  email: string;
  name: string;
  avatarUrl?: string;
  locale?: string;
  verifiedEmail?: boolean;
};

// Session 中儲存的用戶資訊（來自資料庫）
export type SessionUser = {
  id: number;        // 資料庫 ID
  googleId: string;  // Google ID
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  loginCount: number;
  isNewUser?: boolean;  // 標記是否為首次註冊
};

export function generateAuthUrl(state?: string) {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    state: state || 'default',
    redirect_uri: GOOGLE_CALLBACK_URL,
  });
  
  return authUrl;
}

export async function verifyGoogleToken(code: string): Promise<GoogleUser> {
  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('無法獲取用戶資訊');
    }
    
    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name!,
      avatarUrl: payload.picture,
      locale: payload.locale || 'zh-TW',
      verifiedEmail: payload.email_verified,
    };
  } catch (error) {
    console.error('Google 驗證錯誤:', error);
    throw new Error('Google 認證失敗');
  }
} 