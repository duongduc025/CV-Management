"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { FolderOpen, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getProjectManagementInfo, ProjectManagementInfo } from '@/services/generalInfo';

interface PMHomeTabProps {
  user: User;
}

export default function PMHomeTab({ user }: PMHomeTabProps) {
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

  return (
    <div className="w-full p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-[#E60012] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 text-white">PM Dashboard</h2>
        <p className="text-red-100">
          Xin chào {user.full_name}, hãy quản lý dự án và điều phối hoạt động nhóm hiệu quả.
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
            onClick={loadGeneralInfo}
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

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Project Management Info Section */}
          {projectInfo && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FolderOpen className="h-6 w-6 text-[#E60012] mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Thống kê dự án</h3>
              </div>

              {/* Project Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{projectInfo.total_project_count}</div>
                  <div className="text-sm text-blue-700">Tổng dự án</div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{projectInfo.projects_not_started}</div>
                  <div className="text-sm text-yellow-700">Chưa bắt đầu</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{projectInfo.projects_in_progress}</div>
                  <div className="text-sm text-green-700">Đang thực hiện</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <XCircle className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-600">{projectInfo.projects_ended}</div>
                  <div className="text-sm text-gray-700">Đã kết thúc</div>
                </div>
              </div>

                      {/* Total Members */}
            <div className="bg-[#83C21E] bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-gray-900 mr-2" />
                  <span className="text-lg font-semibold text-gray-900">
                    Tổng số thành viên trong các dự án: {projectInfo.total_member_count}
                  </span>
                </div>
              </div>
            </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
