"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { Building2, Users, AlertCircle } from 'lucide-react';
import { getDepartmentInfo, DepartmentInfo } from '@/services/generalInfo';

interface BULHomeTabProps {
  user: User;
}

export default function BULHomeTab({ user }: BULHomeTabProps) {
  const [departmentInfo, setDepartmentInfo] = useState<DepartmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDepartmentInfo();
  }, []);

  const loadDepartmentInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load department info
      const deptInfo = await getDepartmentInfo();

      setDepartmentInfo(deptInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin phòng ban');
      console.error('Error loading department info:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-[#E60012] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 text-white">BUL/Lead Dashboard</h2>
        <p className="text-red-100">
          Xin chào {user.full_name}, hãy quản lý và điều phối hoạt động nhóm hiệu quả.
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
            onClick={loadDepartmentInfo}
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
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      )}

      {/* Department Info Section */}
      {!loading && !error && departmentInfo && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <Building2 className="h-6 w-6 text-[#E60012] mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Thông tin phòng ban</h3>
          </div>

          {/* Department Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Name Card */}
            <div className="bg-[#E60012] rounded-lg p-6 text-white">
              <div className="flex items-center mb-3">
                <Building2 className="h-8 w-8 text-white mr-3" />
                <div>
                  <div className="text-sm text-red-100 mb-1">Tên phòng ban</div>
                  <div className="text-2xl font-bold text-white">{departmentInfo.name}</div>
                </div>
              </div>
              <div className="text-red-100 text-sm">
                Phòng ban bạn đang quản lý
              </div>
            </div>

            {/* Member Count Card */}
            <div className="bg-[#6BA01A] rounded-lg p-6 text-white">
              <div className="flex items-center mb-3">
                <Users className="h-8 w-8 text-white mr-3" />
                <div>
                  <div className="text-sm text-green-100 mb-1">Số lượng thành viên</div>
                  <div className="text-2xl font-bold text-white">{departmentInfo.member_count}</div>
                </div>
              </div>
              <div className="text-green-100 text-sm">
                Tổng số thành viên trong phòng ban
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
