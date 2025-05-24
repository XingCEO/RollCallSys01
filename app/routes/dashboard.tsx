// app/routes/dashboard.tsx
// 儀表板頁面

import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  return json({ user });
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();
  
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '從未';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">歡迎，{user.name}！</h1>
        
        <div className="flex items-center gap-4 mb-6">
          {user.avatarUrl && (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <p className="text-gray-600">Email: {user.email}</p>
            <p className="text-gray-600">角色: {user.role}</p>
            {user.loginCount && (
              <p className="text-gray-600">登入次數: {user.loginCount}</p>
            )}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/profile"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600">👤</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">個人資料</p>
              <p className="text-sm text-gray-600">編輯個人資訊</p>
            </div>
          </Link>
          
          <Link
            to="/bind-student"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600">📚</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">學號綁定</p>
              <p className="text-sm text-gray-600">綁定學籍資料</p>
            </div>
          </Link>
          
          <Link
            to="/logout"
            className="flex items-center gap-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600">🚪</span>
            </div>
            <div>
              <p className="font-medium text-red-800">登出</p>
              <p className="text-sm text-red-600">安全登出系統</p>
            </div>
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">系統資訊</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">用戶 ID: {user.id}</p>
              <p className="text-gray-600">Google ID: {user.googleId}</p>
            </div>
            <div>
              <p className="text-gray-600">系統版本: v1.0.0</p>
              <p className="text-gray-600">環境: 開發模式</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}