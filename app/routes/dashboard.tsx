// app/routes/dashboard.tsx
// 儀表板頁面 (新增點名功能)

import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";
import { getUserBinding } from "../lib/simple-binding.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  
  // 檢查用戶綁定狀態
  const binding = getUserBinding(user.id);
  
  return json({ 
    user,
    binding
  });
}

export default function Dashboard() {
  const { user, binding } = useLoaderData<typeof loader>();
  
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
            {binding?.isbound && binding.student && (
              <p className="text-gray-600">
                學號: {binding.student.studentId} | {binding.student.department}
              </p>
            )}
          </div>
        </div>
        
        {/* 綁定狀態提醒 */}
        {!binding?.isbound && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <div>
                <p className="text-yellow-800 font-medium">尚未綁定學號</p>
                <p className="text-yellow-700 text-sm">
                  請先綁定學號以使用完整功能，包括課程點名
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 主要功能卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* 點名功能 - 最重要的功能放在最前面 */}
          <Link
            to="/attendance"
            className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
              binding?.isbound 
                ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            }`}
            onClick={(e) => {
              if (!binding?.isbound) {
                e.preventDefault();
                alert('請先綁定學號才能使用點名功能');
              }
            }}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              binding?.isbound ? 'bg-green-500' : 'bg-gray-400'
            }`}>
              <span className="text-white text-xl">📍</span>
            </div>
            <div>
              <p className={`font-medium ${
                binding?.isbound ? 'text-green-800' : 'text-gray-500'
              }`}>
                課程點名
              </p>
              <p className={`text-sm ${
                binding?.isbound ? 'text-green-600' : 'text-gray-400'
              }`}>
                {binding?.isbound ? '一鍵GPS點名' : '需先綁定學號'}
              </p>
            </div>
          </Link>

          {/* 點名記錄 */}
          <Link
            to="/attendance-history"
            className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
              binding?.isbound 
                ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' 
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            }`}
            onClick={(e) => {
              if (!binding?.isbound) {
                e.preventDefault();
                alert('請先綁定學號才能查看點名記錄');
              }
            }}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              binding?.isbound ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
              <span className="text-white text-xl">📋</span>
            </div>
            <div>
              <p className={`font-medium ${
                binding?.isbound ? 'text-blue-800' : 'text-gray-500'
              }`}>
                點名記錄
              </p>
              <p className={`text-sm ${
                binding?.isbound ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {binding?.isbound ? '查看出席紀錄' : '需先綁定學號'}
              </p>
            </div>
          </Link>
          
          <Link
            to="/profile"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">👤</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">個人資料</p>
              <p className="text-sm text-gray-600">編輯個人資訊</p>
            </div>
          </Link>
          
          <Link
            to="/bind-student"
            className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
              binding?.isbound 
                ? 'border-gray-200 hover:bg-gray-50' 
                : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
            }`}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              binding?.isbound ? 'bg-gray-100' : 'bg-orange-500'
            }`}>
              <span className={`text-xl ${
                binding?.isbound ? 'text-gray-600' : 'text-white'
              }`}>
                📚
              </span>
            </div>
            <div>
              <p className={`font-medium ${
                binding?.isbound ? 'text-gray-800' : 'text-orange-800'
              }`}>
                學號綁定
              </p>
              <p className={`text-sm ${
                binding?.isbound ? 'text-gray-600' : 'text-orange-600'
              }`}>
                {binding?.isbound ? '已綁定學籍' : '綁定學籍資料'}
              </p>
            </div>
          </Link>
        </div>
        
        {/* 次要功能 */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">📊 我的統計</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">登入次數:</span>
                <span className="font-medium">{user.loginCount || 1} 次</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">帳號狀態:</span>
                <span className="font-medium text-green-600">正常</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">綁定狀態:</span>
                <span className={`font-medium ${
                  binding?.isbound ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {binding?.isbound ? '已綁定' : '未綁定'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">🕒 最近活動</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 今日登入系統</p>
              {binding?.isbound ? (
                <p>• 學號綁定完成</p>
              ) : (
                <p>• 等待綁定學號</p>
              )}
              <p>• 帳號建立成功</p>
            </div>
          </div>
        </div>
        
        {/* 快速操作 */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🚀 快速操作</h2>
          <div className="flex flex-wrap gap-3">
            {binding?.isbound ? (
              <Link
                to="/attendance"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                📍 立即點名
              </Link>
            ) : (
              <Link
                to="/bind-student"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                📚 綁定學號
              </Link>
            )}
            
            <Link
              to="/profile"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              👤 編輯資料
            </Link>
            
            <Link
              to="/logout"
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              🚪 安全登出
            </Link>
          </div>
        </div>
        
        {/* 系統資訊 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">ℹ️ 系統資訊</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">用戶 ID: {user.id}</p>
              <p className="text-gray-600">Google ID: {user.googleId}</p>
            </div>
            <div>
              <p className="text-gray-600">系統版本: v1.1.0</p>
              <p className="text-gray-600">環境: 開發模式</p>
            </div>
          </div>
        </div>
        
        {/* 使用提示 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 使用提示</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 點名功能需要先綁定學號才能使用</li>
            <li>• 點名時會記錄您的地理位置資訊</li>
            <li>• 建議在有良好 GPS 信號的地方進行點名</li>
            <li>• 如有問題請聯繫系統管理員</li>
          </ul>
        </div>
      </div>
    </div>
  );
}