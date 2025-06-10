"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Target, User as UserIcon, Building } from 'lucide-react';
import { getAdminDashboardStats, AdminDashboardStats } from '@/services/admin';

export default function AdminHomeTab() {
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalUsers: 0,
    totalCVs: 0,
    updatedCVs: 0,
    updateRequests: 0,
    totalProjects: 0,
    totalDepartments: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching admin dashboard stats...');
        const statsData = await getAdminDashboardStats();
        console.log('Received stats data:', statsData);
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);



  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <div className="text-sm text-gray-600 mt-1">Trang chủ / Dashboard</div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-600 mt-1">Trang chủ / Dashboard</div>

      </div>


      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Tổng số người dùng</div>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #E60012, #c5000f)' }}
            >
              <UserIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Updated CVs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.updatedCVs}</div>
              <div className="text-sm text-gray-600">CV đã cập nhật</div>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #83C21E, #6fa01a)' }}
            >
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Update Requests */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.updateRequests}</div>
              <div className="text-sm text-gray-600">Yêu cầu cập nhật CV</div>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)' }}
            >
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Projects */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
              <div className="text-sm text-gray-600">Tổng số dự án</div>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #9C27B0, #7B1FA2)' }}
            >
              <Target className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Departments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalDepartments}</div>
              <div className="text-sm text-gray-600">Tổng số phòng ban</div>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #333333, #1a1a1a)' }}
            >
              <Building className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
