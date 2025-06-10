"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { Users, Clock, CheckCircle, XCircle, Target } from 'lucide-react';
import { getProjectManagementInfo, ProjectManagementInfo } from '@/services/generalInfo';

interface PMHomeTabProps {
  user: User;
}

export default function PMHomeTab({}: PMHomeTabProps) {
  const [projectInfo, setProjectInfo] = useState<ProjectManagementInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGeneralInfo();
  }, []);

  const loadGeneralInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load project management info
      const projInfo = await getProjectManagementInfo();

      setProjectInfo(projInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin tổng quan');
      console.error('Error loading general info:', err);
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <div className="text-sm text-gray-600 mt-1">Trang chủ / Dashboard</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={loadGeneralInfo}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Thử lại
          </button>
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
      {projectInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Projects */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{projectInfo.total_project_count}</div>
                <div className="text-sm text-gray-600">Tổng số dự án</div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #E60012, #c5000f)' }}
              >
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Projects In Progress */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{projectInfo.projects_in_progress}</div>
                <div className="text-sm text-gray-600">Dự án đang thực hiện</div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #83C21E, #6fa01a)' }}
              >
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Projects Not Started */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{projectInfo.projects_not_started}</div>
                <div className="text-sm text-gray-600">Dự án chưa bắt đầu</div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)' }}
              >
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Projects Ended */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{projectInfo.projects_ended}</div>
                <div className="text-sm text-gray-600">Dự án đã kết thúc</div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #333333, #1a1a1a)' }}
              >
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Members */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{projectInfo.total_member_count}</div>
                <div className="text-sm text-gray-600">Tổng số thành viên</div>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #9C27B0, #7B1FA2)' }}
              >
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
