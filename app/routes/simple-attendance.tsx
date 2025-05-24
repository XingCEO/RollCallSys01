// app/routes/simple-attendance.tsx
// 簡化版GPS點名系統 - 完整功能實現

import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";
import { getUserBinding } from "../lib/simple-binding.server";
import Database from 'better-sqlite3';

// 定義介面
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface AttendanceRecord {
  id: number;
  userId: number;
  studentId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  status: string;
  notes?: string;
}

interface LoaderData {
  user: any;
  binding: any;
  hasAttended: boolean;
  dbError?: boolean;
  todayRecord?: AttendanceRecord;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  record?: AttendanceRecord;
}

export async function loader({ request }: LoaderFunctionArgs) {
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

  // 檢查今日是否已點名和資料庫狀態
  let hasAttended = false;
  let dbError = false;
  let todayRecord: AttendanceRecord | undefined;
  
  try {
    const DB_PATH = process.env.DATABASE_PATH || './data/app.db';
    const db = new Database(DB_PATH);
    
    // 檢查點名表是否存在
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='attendance_records'
    `).get();
    
    if (!tableExists) {
      console.log('⚠️ attendance_records 表不存在');
      dbError = true;
    } else {
      // 查詢今日點名記錄
      const result = db.prepare(`
        SELECT * FROM attendance_records 
        WHERE user_id = ? AND date(timestamp) = date('now', 'localtime')
        ORDER BY timestamp DESC
        LIMIT 1
      `).get(user.id) as any;
      
      if (result) {
        hasAttended = true;
        todayRecord = {
          id: result.id,
          userId: result.user_id,
          studentId: result.student_id,
          latitude: result.latitude,
          longitude: result.longitude,
          accuracy: result.accuracy,
          timestamp: result.timestamp,
          status: result.status,
          notes: result.notes
        };
      }
    }
    
    db.close();
  } catch (error) {
    console.error('檢查點名狀態失敗:', error);
    dbError = true;
  }

  return json<LoaderData>({ 
    user,
    binding,
    hasAttended,
    dbError,
    todayRecord
  });
}

export async function action({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  const formData = await request.formData();
  
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const accuracy = parseFloat(formData.get("accuracy") as string);
  
  console.log('收到點名請求:', { latitude, longitude, accuracy });
  
  // 驗證地理位置資料
  if (isNaN(latitude) || isNaN(longitude)) {
    return json<ActionResponse>({ 
      success: false,
      error: "無法獲取位置資訊，請重試"
    });
  }

  // 取得用戶綁定資訊
  const binding = getUserBinding(user.id);
  if (!binding?.isbound || !binding.student) {
    return json<ActionResponse>({ 
      success: false,
      error: "請先綁定學號才能點名"
    });
  }
  
  try {
    const DB_PATH = process.env.DATABASE_PATH || './data/app.db';
    const db = new Database(DB_PATH);
    
    // 檢查點名表是否存在
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='attendance_records'
    `).get();
    
    if (!tableExists) {
      db.close();
      return json<ActionResponse>({ 
        success: false,
        error: "點名系統尚未初始化，請聯繫管理員"
      });
    }
    
    // 檢查今日是否已點名
    const existing = db.prepare(`
      SELECT id FROM attendance_records 
      WHERE user_id = ? AND date(timestamp) = date('now', 'localtime')
    `).get(user.id);
    
    if (existing) {
      db.close();
      return json<ActionResponse>({ 
        success: false,
        error: "今日已完成點名"
      });
    }
    
    // 插入點名記錄
    const timestamp = new Date().toISOString();
    const insertResult = db.prepare(`
      INSERT INTO attendance_records (
        user_id, student_id, latitude, longitude, accuracy, 
        timestamp, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      binding.student.studentId,
      latitude,
      longitude,
      accuracy,
      timestamp,
      'present',
      `GPS點名成功 - 準確度: ${Math.round(accuracy)}公尺`
    );
    
    // 查詢剛插入的記錄
    const newRecord = db.prepare(`
      SELECT * FROM attendance_records WHERE id = ?
    `).get(insertResult.lastInsertRowid) as any;
    
    db.close();
    
    console.log('點名記錄插入成功:', insertResult);
    
    return json<ActionResponse>({ 
      success: true,
      message: "🎉 點名成功！",
      record: {
        id: newRecord.id,
        userId: newRecord.user_id,
        studentId: newRecord.student_id,
        latitude: newRecord.latitude,
        longitude: newRecord.longitude,
        accuracy: newRecord.accuracy,
        timestamp: newRecord.timestamp,
        status: newRecord.status,
        notes: newRecord.notes
      }
    });
  } catch (error) {
    console.error('點名失敗:', error);
    return json<ActionResponse>({ 
      success: false,
      error: error instanceof Error ? error.message : "點名失敗，請重試"
    });
  }
}

export default function SimpleAttendance() {
  const { user, binding, hasAttended, dbError, todayRecord } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const isSubmitting = navigation.state === "submitting";
  
  // 判斷實際的點名狀態
  const actuallyAttended = hasAttended || actionData?.success;
  const actualRecord = actionData?.record || todayRecord;
  
  // 獲取位置函數
  const getLocation = () => {
    setIsGettingLocation(true);
    setLocationError("");
    
    if (!navigator.geolocation) {
      setLocationError("瀏覽器不支援地理位置服務");
      setIsGettingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        });
        setIsGettingLocation(false);
        console.log('位置獲取成功:', position.coords);
      },
      (error) => {
        let errorMessage = "無法獲取位置";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "請允許位置權限";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "位置服務不可用";
            break;
          case error.TIMEOUT:
            errorMessage = "獲取位置超時";
            break;
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
        console.error('位置獲取失敗:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };
  
  // 格式化函數
  const formatCoordinate = (coord: number) => coord.toFixed(6);
  const formatAccuracy = (accuracy: number) => `${Math.round(accuracy)} 公尺`;
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-8">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📍 GPS 點名系統
          </h1>
          <p className="text-gray-600">
            簡化版定位點名功能
          </p>
        </div>
        
        {/* 用戶資訊 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            {user.avatarUrl && (
              <img 
                src={user.avatarUrl} 
                alt={user.name} 
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-blue-900">{user.name}</p>
              <p className="text-sm text-blue-700">{user.email}</p>
              {binding?.student && (
                <p className="text-sm text-blue-600">
                  學號：{binding.student.studentId} | {binding.student.department}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* 資料庫錯誤提示 */}
        {dbError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <span className="text-orange-600 text-2xl">⚠️</span>
              <p className="text-orange-800 font-medium mt-2">點名系統尚未初始化</p>
              <p className="text-orange-700 text-sm mt-1">
                請聯繫系統管理員執行：
              </p>
              <code className="bg-orange-100 px-2 py-1 rounded text-sm">
                npm run migrate:attendance
              </code>
            </div>
          </div>
        )}
        
        {/* 已完成點名 */}
        {actuallyAttended && actualRecord && !dbError && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-800 mb-4">
                今日點名已完成
              </h2>
              
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">點名時間</p>
                  <p className="font-mono text-gray-900">
                    {formatDateTime(actualRecord.timestamp)}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">緯度</p>
                    <p className="font-mono text-gray-900">
                      {formatCoordinate(actualRecord.latitude)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">經度</p>
                    <p className="font-mono text-gray-900">
                      {formatCoordinate(actualRecord.longitude)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">定位精度</p>
                  <p className="font-bold text-gray-900">
                    {formatAccuracy(actualRecord.accuracy)}
                  </p>
                </div>
                
                {actualRecord.notes && (
                  <div>
                    <p className="text-sm text-gray-600">備註</p>
                    <p className="text-gray-900">{actualRecord.notes}</p>
                  </div>
                )}
                
                <div className="mt-4">
                  <a
                    href={`https://www.google.com/maps?q=${actualRecord.latitude},${actualRecord.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    🗺️ 在地圖中查看
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 尚未點名且無資料庫錯誤 */}
        {!actuallyAttended && !dbError && (
          <>
            {/* 成功訊息 */}
            {actionData?.success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <span className="text-green-600 text-2xl">🎉</span>
                  <p className="text-green-800 font-medium mt-2">
                    {actionData.message}
                  </p>
                </div>
              </div>
            )}
            
            {/* 錯誤訊息 */}
            {actionData && !actionData.success && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <p className="text-red-800 font-medium">{actionData.error}</p>
                </div>
              </div>
            )}
            
            {locationError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <p className="text-yellow-800 font-medium">{locationError}</p>
                </div>
              </div>
            )}
            
            {/* 位置資訊顯示 */}
            {location && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">📍 當前位置</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">緯度</p>
                    <p className="font-mono text-gray-900">
                      {formatCoordinate(location.latitude)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">經度</p>
                    <p className="font-mono text-gray-900">
                      {formatCoordinate(location.longitude)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">準確度</p>
                    <p className="text-gray-900">{formatAccuracy(location.accuracy)}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 操作按鈕 */}
            <div className="space-y-4 mb-8">
              {/* 獲取位置按鈕 */}
              <button
                onClick={getLocation}
                disabled={isGettingLocation || isSubmitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
              >
                {isGettingLocation ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="animate-spin text-xl">📍</span>
                    正在獲取位置...
                  </span>
                ) : location ? (
                  <span className="flex items-center justify-center gap-3">
                    ✅ 位置已獲取
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    📍 獲取GPS位置
                  </span>
                )}
              </button>
              
              {/* 點名表單 */}
              {location && (
                <Form method="post">
                  <input type="hidden" name="latitude" value={location.latitude} />
                  <input type="hidden" name="longitude" value={location.longitude} />
                  <input type="hidden" name="accuracy" value={location.accuracy} />
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-6 px-8 rounded-lg text-xl transition-colors shadow-lg"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <span className="animate-spin text-2xl">⏳</span>
                        點名中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        ✋ 確認點名
                      </span>
                    )}
                  </button>
                </Form>
              )}
            </div>
          </>
        )}
        
        {/* 導航按鈕 */}
        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="block w-full bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors text-center"
          >
            返回儀表板
          </Link>
          
          <Link
            to="/attendance-history"
            className="block w-full bg-purple-500 text-white py-3 px-6 rounded-lg hover:bg-purple-600 transition-colors text-center"
          >
            查看點名記錄
          </Link>
        </div>
        
        {/* 使用說明 */}
        {!actuallyAttended && !dbError && (
          <div className="mt-8 pt-6 border-t border-gray-200 text-left">
            <h3 className="text-sm font-medium text-gray-800 mb-3">📋 使用說明</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 1. 點擊「獲取GPS位置」</li>
              <li>• 2. 允許瀏覽器位置權限</li>
              <li>• 3. 確認位置後點擊「確認點名」</li>
              <li>• 4. 每日只能點名一次</li>
              <li>• 5. 點名記錄將永久保存</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}