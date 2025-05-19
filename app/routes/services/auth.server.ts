import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { sessionStorage } from "../services/session.server";
// 定義使用者類型
export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

// 建立驗證器
//export const authenticator  = new Authenticator<User>(sessionStorage);
export const authenticator = new Authenticator(sessionStorage);
// 設定 Google 策略
const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
  },
  async ({ profile }) => {
    // 在這裡處理使用者資料
    return {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
);

authenticator.use(googleStrategy);