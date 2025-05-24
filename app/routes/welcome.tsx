// app/routes/welcome.tsx
// 首次註冊用戶的歡迎頁面

import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  return json({ user });
}

export default function Welcome() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="mb-6">
          {user.avatarUrl && (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-20 h-20 rounded-full mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            歡迎加入！
          </h1>
          <p className="text-xl text-gray-600">
            您好，{user.name}！
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            🎉 帳號建立成功
          </h2>
          <p className="text-blue-700">
            您的帳號已經成功建立並連結到 Google 帳號。<br/>
            現在您可以開始使用系統的所有功能。
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">📧 電子郵件</h3>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">👤 用戶角色</h3>
            <p className="text-gray-600 capitalize">{user.role}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            接下來您可以：
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded">
              <p className="font-medium text-green-800">✅ 瀏覽儀表板</p>
              <p className="text-green-600">查看系統主要功能</p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-medium text-blue-800">👤 編輯個人資料</p>
              <p className="text-blue-600">更新您的個人資訊</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="font-medium text-purple-800">🔧 探索功能</p>
              <p className="text-purple-600">了解系統各項功能</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            前往儀表板
          </Link>
          <Link
            to="/profile"
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            編輯個人資料
          </Link>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>這是您第 {user.loginCount} 次登入系統</p>
        </div>
      </div>
    </div>
  );
}