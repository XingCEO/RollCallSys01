// app/routes/attendance-history.tsx
// 點名記錄查看頁面

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";
import { getUserBinding } from "../lib/simple-binding.server";
import { getUserAttendanceRecords, getAttendanceStats } from "../lib/attendance.server";
import type { AttendanceRecord, AttendanceStats } from "../lib/attendance.server";

// 定義 Loader 回傳類型
interface LoaderData {
  user: any;
  binding: any;
  records: AttendanceRecord[];
  stats: AttendanceStats | null;
  dbError?: boolean;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const user = await requireUserSession(request);
  
  // 檢查用戶是否已綁定學號
  const binding = getUserBinding(user.id);
  
  if (!binding?.isbound) {
    throw new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/bind-student?error=binding_required",
      },
    });
  }

  try {
    // 取得點名記錄 (最近20筆)
    const records = getUserAttendanceRecords(user.id, 20);
    
    // 取得統計資訊
    const stats = getAttendanceStats(user.id);
    
    return json<LoaderData>({ 
      user,
      binding,
      records,
      stats
    });
  } catch (error) {
    console.error('載入點名記錄失敗:', error);
    
    return json<LoaderData>({ 
      user,
      binding,
      records: [],
      stats: null,
      dbError: true
    });
  }
}

export default function AttendanceHistory() {
  const { user, binding, records, stats, dbError } = useLoaderData<LoaderData>();
  
  // 格式化日期時間
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('zh-TW'),
      time: date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      weekday: date.toLocaleDateString('zh-TW', { weekday: 'short' })
    };
  };
  
  // 格式化座標
  const formatCoordinate = (coord: number, digits: number = 4) => {
    return coord.toFixed(digits);
  };
  
  // 格式化準確度
  const formatAccuracy = (accuracy: number) => {
    if (accuracy < 1000) {
      return `${Math.round(accuracy)}m`;
    } else {
      return `${(accuracy / 1000).toFixed(1)}km`;
    }
  };
  
  // 狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-50';
      case 'late': return 'text-yellow-600 bg-yellow-50';
      case 'absent': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  // 狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return '出席';
      case 'late': return '遲到';
      case 'absent': return '缺席';
      default: return '未知';
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📋 點名記錄</h1>
            <p className="text-gray-600">查看您的出席記錄和統計資訊</p>
          </div>
          <Link
            to="/attendance"
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            📍 立即點名
          </Link>
        </div>
        
        {/* 資料庫錯誤提示 */}
        {dbError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-orange-600">⚠️</span>
              <div>
                <p className="text-orange-800 font-medium">點名系統尚未初始化</p>
                <p className="text-orange-700 text-sm">
                  請聯繫系統管理員執行資料庫遷移：npm run db:migrate:attendance
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 統計資訊 */}
        {!dbError && stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">📊</span>
                </div>
                <div>
                  <p className="text-sm text-blue-600">總點名次數</p>
                  <p className="text-xl font-bold text-blue-800">{stats.totalRecords}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">✅</span>
                </div>
                <div>
                  <p className="text-sm text-green-600">出席次數</p>
                  <p className="text-xl font-bold text-green-800">{stats.presentCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">⏰</span>
                </div>
                <div>
                  <p className="text-sm text-yellow-600">本週點名</p>
                  <p className="text-xl font-bold text-yellow-800">{stats.thisWeekRecords}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">🎯</span>
                </div>
                <div>
                  <p className="text-sm text-purple-600">平均準確度</p>
                  <p className="text-xl font-bold text-purple-800">
                    {stats.averageAccuracy > 0 ? formatAccuracy(stats.averageAccuracy) : '--'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 點名記錄列表 */}
        {!dbError && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">🕒 最近記錄</h2>
            
            {records.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">📋</span>
                </div>
                <p className="text-gray-500 mb-4">還沒有點名記錄</p>
                <Link
                  to="/attendance"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  📍 立即點名
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => {
                  if (!record) return null; // 安全檢查
                  
                  const datetime = formatDateTime(record.timestamp);
                  return (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">{datetime.weekday}</p>
                            <p className="font-medium text-gray-800">{datetime.date}</p>
                            <p className="text-sm text-gray-600">{datetime.time}</p>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                                {getStatusText(record.status)}
                              </span>
                              {record.courseId && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  課程 #{record.courseId}
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                📍 位置：{formatCoordinate(record.latitude)}, {formatCoordinate(record.longitude)}
                                {record.accuracy && (
                                  <span className="text-gray-500 ml-2">
                                    (準確度: {formatAccuracy(record.accuracy)})
                                  </span>
                                )}
                              </p>
                              
                              {record.notes && (
                                <p>💬 備註：{record.notes}</p>
                              )}
                              
                              {record.deviceInfo && (
                                <p className="text-xs text-gray-400">
                                  🖥️ 設備：{record.deviceInfo.substring(0, 50)}...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <a
                            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-xs"
                          >
                            🗺️ 地圖
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }).filter(Boolean)} {/* 過濾掉 null 值 */}
                
                {records.length >= 20 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      顯示最近 20 筆記錄 • 如需查看更多記錄請聯繫管理員
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 導航按鈕 */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4 justify-center">
          <Link 
            to="/dashboard" 
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            返回儀表板
          </Link>
          
          <Link 
            to="/attendance" 
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            📍 前往點名
          </Link>
          
          <Link 
            to="/profile" 
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            個人資料
          </Link>
        </div>
      </div>
    </div>
  );
}