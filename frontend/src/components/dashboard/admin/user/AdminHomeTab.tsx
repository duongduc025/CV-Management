"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { Users, Building2, UserCheck, FileText, AlertCircle, BarChart3 } from 'lucide-react';
import { getUsers } from '@/services/user';
import { getDepartments } from '@/services/auth';

interface AdminHomeTabProps {
  user: User;
  onNavigateToTab?: (tab: string) => void;
}

interface AdminStats {
  totalUsers: number;
  totalDepartments: number;
  usersWithCV: number;
  pendingCVRequests: number;
}

export default function AdminHomeTab({ user, onNavigateToTab }: AdminHomeTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load basic statistics
      const [usersData, departmentsData] = await Promise.all([
        getUsers(),
        getDepartments()
      ]);

      // Calculate statistics
      const adminStats: AdminStats = {
        totalUsers: usersData.length,
        totalDepartments: departmentsData.length,
        usersWithCV: 0, // This would need a specific API endpoint
        pendingCVRequests: 0, // This would need a specific API endpoint
      };

      setStats(adminStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin tổng quan');
      console.error('Error loading admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-[#E60012] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 text-white">Admin Dashboard</h2>
        <p className="text-red-100">
          Xin chào {user.full_name}, hãy quản lý hệ thống và giám sát hoạt động tổng thể.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={loadAdminStats}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Statistics */}
      {!loading && !error && stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <BarChart3 className="h-6 w-6 text-[#E60012] mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Thống kê hệ thống</h3>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Users Card */}
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-blue-700">Tổng người dùng</div>
              <div className="text-xs text-blue-600 mt-1">
                Tất cả người dùng trong hệ thống
              </div>
            </div>

            {/* Total Departments Card */}
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.totalDepartments}</div>
              <div className="text-sm text-green-700">Tổng phòng ban</div>
              <div className="text-xs text-green-600 mt-1">
                Số phòng ban đang hoạt động
              </div>
            </div>

            {/* Users with CV Card */}
            <div className="bg-yellow-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <UserCheck className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.usersWithCV}</div>
              <div className="text-sm text-yellow-700">Người dùng có CV</div>
              <div className="text-xs text-yellow-600 mt-1">
                Đã tạo và cập nhật CV
              </div>
            </div>

            {/* Pending CV Requests Card */}
            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">{stats.pendingCVRequests}</div>
              <div className="text-sm text-purple-700">Yêu cầu CV chờ xử lý</div>
              <div className="text-xs text-purple-600 mt-1">
                Cần được xem xét
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User Management */}
          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <Users className="h-6 w-6 text-[#E60012] mr-2" />
              <h4 className="font-medium text-gray-900">Quản lý người dùng</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Đăng ký người dùng mới và quản lý thông tin thành viên
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => onNavigateToTab?.('register')}
                className="text-xs px-3 py-1 bg-[#E60012] text-white rounded hover:bg-[#cc0010] transition-colors"
              >
                Đăng ký người dùng
              </button>
              <button
                onClick={() => onNavigateToTab?.('members')}
                className="text-xs px-3 py-1 bg-[#83C21E] text-white rounded hover:bg-[#6fa01a] transition-colors"
              >
                Xem danh sách
              </button>
            </div>
          </div>

          {/* System Monitoring */}
          <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <BarChart3 className="h-6 w-6 text-[#E60012] mr-2" />
              <h4 className="font-medium text-gray-900">Giám sát hệ thống</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Theo dõi hoạt động và hiệu suất của hệ thống
            </p>
            <div className="flex space-x-2">
              <button className="text-xs px-3 py-1 bg-[#83C21E] text-white rounded hover:bg-[#6fa01a] transition-colors">
                Xem báo cáo
              </button>
              <button className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
                Cài đặt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
