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

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export function generateAuthUrl(state?: string) {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    state: state || 'default',
    redirect_uri: GOOGLE_CALLBACK_URL, // 明確指定 redirect_uri
  });
  
  return authUrl;
}

export async function verifyGoogleToken(code: string): Promise<User> {
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
    };
  } catch (error) {
    console.error('Google 驗證錯誤:', error);
    throw new Error('Google 認證失敗');
  }
}