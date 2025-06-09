"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { User } from '@/services/auth';
import { getAllMembersOfAllProjects } from '@/services/project';
import { getUserCVByUserId, CV, createCVUpdateRequest } from '@/services/cv';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

export default function PMMembersTab() {
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [selectedMemberCV, setSelectedMemberCV] = useState<CV | null>(null);
  const [membersCVStatus, setMembersCVStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCV, setLoadingCV] = useState(false);
  const [loadingCVStatuses, setLoadingCVStatuses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [requestingUpdate, setRequestingUpdate] = useState(false);
  const [showCVPanel, setShowCVPanel] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [selectedMemberForUpdate, setSelectedMemberForUpdate] = useState<User | null>(null);

  // Notification hook
  const { addNotification } = useNotifications();

  // Load members on component mount
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const membersData = await getAllMembersOfAllProjects();
      setMembers(membersData);
      // Don't automatically select the first member

      // Load CV statuses for all members
      await loadMembersCVStatuses(membersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách thành viên');
      console.error('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const loadMembersCVStatuses = async (membersData: User[]) => {
    try {
      setLoadingCVStatuses(true);
      const statusMap: Record<string, string> = {};

      // Fetch CV status for each member
      const statusPromises = membersData.map(async (member) => {
        if (member.id) {
          try {
            const memberCV = await getUserCVByUserId(member.id);
            statusMap[member.id] = memberCV.status || 'Chưa cập nhật';
          } catch {
            // If CV not found, set status as 'Chưa cập nhật'
            statusMap[member.id] = 'Chưa cập nhật';
            console.log(`No CV found for member ${member.id}, setting status to 'Chưa cập nhật'`);
          }
        }
      });

      await Promise.all(statusPromises);
      setMembersCVStatus(statusMap);
      console.log('Loaded CV statuses for all members:', statusMap);
    } catch (error) {
      console.error('Error loading CV statuses:', error);
    } finally {
      setLoadingCVStatuses(false);
    }
  };

  const handleViewCV = async (member: User) => {
    setSelectedMember(member);
    setSelectedMemberCV(null);
    setCvError(null);
    setShowCVPanel(true);

    // Fetch CV information for the selected member
    if (member.id) {
      try {
        setLoadingCV(true);
        console.log(`Fetching CV for user ID: ${member.id}`);
        const memberCV = await getUserCVByUserId(member.id);
        setSelectedMemberCV(memberCV);
        console.log('Member CV loaded successfully:', memberCV);
      } catch (error) {
        console.error('Failed to load member CV:', error);
        setCvError(error instanceof Error ? error.message : 'Không thể tải CV của thành viên');
      } finally {
        setLoadingCV(false);
      }
    }
  };

  const handleTogglePanel = () => {
    setShowCVPanel(!showCVPanel);
    if (!showCVPanel) {
      // If opening panel, clear previous data
      setSelectedMember(null);
      setSelectedMemberCV(null);
      setCvError(null);
    }
  };

  // Helper function to check if CV is empty/uninitialized
  const isCVEmpty = (cv: CV | null): boolean => {
    if (!cv || !cv.details) return true;

    const details = cv.details;

    // Check if all main fields are empty or null
    const mainFieldsEmpty = !details.full_name?.trim() &&
                           !details.job_title?.trim() &&
                           !details.summary?.trim() &&
                           !details.email?.trim() &&
                           !details.phone?.trim() &&
                           !details.address?.trim() &&
                           !details.birthday &&
                           !details.gender?.trim() &&
                           !details.portrait_path?.trim();

    // Check if education array is empty or all entries are empty
    const educationEmpty = !details.education ||
                          details.education.length === 0 ||
                          details.education.every(edu =>
                            !edu.organization?.trim() &&
                            !edu.degree?.trim() &&
                            !edu.major?.trim() &&
                            !edu.graduation_year
                          );

    // Check if courses array is empty or all entries are empty
    const coursesEmpty = !details.courses ||
                        details.courses.length === 0 ||
                        details.courses.every(course =>
                          !course.course_name?.trim() &&
                          !course.organization?.trim() &&
                          !course.finish_date?.trim()
                        );

    // Check if skills array is empty or all entries are empty
    const skillsEmpty = !details.skills ||
                       details.skills.length === 0 ||
                       details.skills.every(skill =>
                         !skill.skill_name?.trim() &&
                         !skill.description?.trim()
                       );

    return mainFieldsEmpty && educationEmpty && coursesEmpty && skillsEmpty;
  };

  const handleRequestCVUpdate = (member: User) => {
    setSelectedMemberForUpdate(member);
    setUpdateMessage('');
    setShowMessageDialog(true);
  };

  const handleSendUpdateRequest = async () => {
    if (!selectedMemberForUpdate) return;

    try {
      setRequestingUpdate(true);

      // First get the CV for this member
      const memberCV = await getUserCVByUserId(selectedMemberForUpdate.id);

      if (!memberCV?.id) {
        addNotification({
          title: 'Lỗi',
          message: 'Không tìm thấy CV để yêu cầu cập nhật',
          type: 'error'
        });
        return;
      }

      console.log(`Requesting CV update for CV ID: ${memberCV.id} with message:`, updateMessage);
      const result = await createCVUpdateRequest(memberCV.id, updateMessage);

      // Use appropriate toast based on status and message type
      if (result.status === 'error') {
        toast.error(result.message);
      } else if (result.message === "CV đang trong trạng thái chờ cập nhật") {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
        // Update CV status to "Chưa cập nhật" if request was successful and not just a status message
        setMembersCVStatus(prev => ({
          ...prev,
          [selectedMemberForUpdate.id]: 'Chưa cập nhật'
        }));
      }

      console.log('CV update request sent successfully');
      setShowMessageDialog(false);
      setSelectedMemberForUpdate(null);
      setUpdateMessage('');
    } catch (error) {
      console.error('Failed to request CV update:', error);
      addNotification({
        title: 'Lỗi',
        message: error instanceof Error ? error.message : 'Không thể gửi yêu cầu cập nhật CV',
        type: 'error'
      });
    } finally {
      setRequestingUpdate(false);
    }
  };

  const handleCancelUpdateRequest = () => {
    setShowMessageDialog(false);
    setSelectedMemberForUpdate(null);
    setUpdateMessage('');
  };

  const renderCVStatus = (status: string) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'Đã cập nhật':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'Chưa cập nhật':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'Hủy yêu cầu':
          return 'bg-gray-100 text-gray-800 border-gray-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải danh sách thành viên...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadMembers}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 flex relative">
      {/* Main Content */}
      <div className={`${showCVPanel ? 'w-1/2' : 'w-full'} transition-all duration-300 flex flex-col`}>
        <div className="w-full p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý thành viên</h1>
              <p className="text-gray-600 mt-1">Danh sách tất cả thành viên trong các dự án</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Đang tải thành viên...</p>
              </div>
            ) : members === null || members.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có thành viên nào</h3>
                <p className="text-gray-600 mb-6">
                  Chưa có thành viên nào trong các dự án
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thành viên
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mã NV
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phòng ban
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dự án đang tham gia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái CV
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {member.full_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.employee_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.department?.name || 'Chưa có phòng ban'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          {member.projects && member.projects.length > 0 ? (
                            <div className="space-y-1">
                              {member.projects.slice(0, 2).map((project, index) => (
                                <span
                                  key={index}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1"
                                  title={project}
                                >
                                  {project.length > 15 ? `${project.substring(0, 15)}...` : project}
                                </span>
                              ))}
                              {member.projects.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{member.projects.length - 2} khác
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Chưa có dự án</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {loadingCVStatuses ? (
                            <div className="animate-pulse">
                              <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                            </div>
                          ) : (
                            renderCVStatus(membersCVStatus[member.id] || 'Chưa cập nhật')
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewCV(member)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Xem CV"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRequestCVUpdate(member)}
                              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                              title="Yêu cầu cập nhật"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      {showCVPanel && (
        <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 z-10">
          <button
            onClick={handleTogglePanel}
            className="bg-white border-2 border-gray-300 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-[#83C21E] group"
            title="Đóng panel CV"
          >
            <svg
              className="w-4 h-4 text-gray-600 group-hover:text-[#83C21E] transition-colors duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* CV Side Panel */}
      {showCVPanel && selectedMember && (
        <div className="w-1/2 border-l border-gray-200 bg-white flex flex-col h-full">
          {/* Panel Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h2 className="text-2xl font-bold text-[#333333]">
                    {selectedMember.full_name}
                  </h2>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {selectedMember.employee_code}
                </span>
                <p className="text-sm text-blue-600 font-medium mt-2">
                  {selectedMember.projects?.join(', ') || 'Chưa có dự án'} • {selectedMember.roles?.map(role => role.name).join(', ') || 'Chưa có vai trò'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 ml-4">
                {/* Top Row - Primary Actions */}
                <div className="flex items-center gap-2">
                  {/* View Original CV Button */}
                  {selectedMemberCV?.details?.cv_path && (
                    <a
                      href={selectedMemberCV.details.cv_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-[#83C21E] text-white rounded-lg hover:bg-[#6fa01a] transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Xem CV gốc
                    </a>
                  )}

                  {/* Request Update Button */}
                  <button
                    onClick={() => handleRequestCVUpdate(selectedMember)}
                    disabled={requestingUpdate}
                    className="inline-flex items-center px-4 py-2 bg-[#E60012] text-white rounded-lg hover:bg-[#cc0010] transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
                  >
                    {requestingUpdate ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Đang gửi...
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Yêu cầu cập nhật
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* CV Loading State */}
            {loadingCV && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 border border-blue-100">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-3 border-[#83C21E] mr-4"></div>
                  <span className="text-[#333333] font-medium text-lg">Đang tải CV...</span>
                </div>
              </div>
            )}

            {/* CV Error State */}
            {cvError && !loadingCV && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-8 mb-6 border border-red-100">
                <div className="text-center">
                  <div className="text-red-500 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-red-600 font-medium text-lg">{cvError}</p>
                </div>
              </div>
            )}

            {/* Contact Information Card */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin liên hệ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900 mt-1">{selectedMember.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mã nhân viên</label>
                  <p className="text-gray-900 mt-1">{selectedMember.employee_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dự án</label>
                  <p className="text-gray-900 mt-1">{selectedMember.projects?.join(', ') || 'Chưa có dự án'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vai trò</label>
                  <p className="text-gray-900 mt-1">{selectedMember.roles?.map(role => role.name).join(', ') || 'Chưa có vai trò'}</p>
                </div>
                {selectedMember.department && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Phòng ban</label>
                    <p className="text-gray-900 mt-1">{selectedMember.department.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* CV Display Section */}
            {selectedMemberCV && !loadingCV && !cvError && (
              <div className="max-w-4xl mx-auto bg-white shadow-2xl border border-gray-200">
                {/* CV Header Section */}
                <div className="bg-white border-b border-red-100 px-8 pt-6 pb-4">
                  {/* Last Updated Information */}
                  {selectedMemberCV.updater_name && selectedMemberCV.last_updated_at && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-semibold text-red-700">Thông tin cập nhật</span>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>
                          <span className="font-medium">Cập nhật bởi:</span> {selectedMemberCV.updater_name} - {selectedMemberCV.updater_employee_code}
                        </div>
                        <div>
                          <span className="font-medium">Thời gian:</span> {new Date(selectedMemberCV.last_updated_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                      selectedMemberCV.status === 'Đã cập nhật'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        selectedMemberCV.status === 'Đã cập nhật' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      {selectedMemberCV.status}
                    </span>
                  </div>
                </div>

                {/* Check if CV is empty and show appropriate message */}
                {isCVEmpty(selectedMemberCV) ? (
                  <div className="p-8 text-center">
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12">
                      <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa khởi tạo CV</h3>
                      <p className="text-gray-500 mb-6">
                        CV của {selectedMember.full_name} chưa có thông tin. Vui lòng yêu cầu cập nhật thông tin để hoàn thiện CV.
                      </p>
                      <button
                        onClick={() => handleRequestCVUpdate(selectedMember)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                      >
                        Yêu cầu cập nhật CV
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header with Red Accent */}
                    <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-white">
                  <div className="text-center text-2xl font-bold mb-6 tracking-wider">
                    SƠ YẾU LÝ LỊCH
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Profile Image - First 1/3 */}
                    <div className="col-span-1">
                      {selectedMemberCV.details?.portrait_path ? (
                        <Image
                          src={selectedMemberCV.details.portrait_path}
                          alt="Profile photo"
                          width={96}
                          height={128}
                          className="w-24 h-32 object-cover border-4 border-white rounded shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-32 border-4 border-white border-dashed rounded flex items-center justify-center text-white text-xs font-medium bg-red-500/20">
                          Ảnh chân<br />dung
                        </div>
                      )}
                    </div>

                    {/* Name and Title - Remaining 2/3 (Center aligned) */}
                    <div className="col-span-2 flex flex-col justify-center items-center">
                      <div className="bg-white text-red-700 px-4 py-2 mb-3 rounded shadow-lg">
                        <h1 className="text-xl font-bold">{selectedMemberCV.details?.full_name || selectedMember.full_name}</h1>
                      </div>
                      <div className="text-red-100 text-base font-medium">{selectedMemberCV.details?.job_title || selectedMember.roles?.map(role => role.name).join(', ') || 'Chức danh'}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {selectedMemberCV.details && (
                    <>
                      {/* Summary Section */}
                      <div className="mb-10">
                        <h2 className="text-xl font-bold text-red-700 mb-4 flex items-center">
                          <div className="w-1 h-6 bg-red-600 mr-3"></div>
                          TÓM TẮT
                        </h2>
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {selectedMemberCV.details.summary}
                          </p>
                        </div>
                      </div>

                      {/* General Information Section */}
                      <div className="mb-10">
                        <h2 className="text-xl font-bold text-red-700 mb-6 flex items-center">
                          <div className="w-1 h-6 bg-red-600 mr-3"></div>
                          THÔNG TIN CHUNG
                        </h2>

                        <div className="grid grid-cols-2 gap-12 mb-6">
                          <div>
                            <h3 className="text-sm font-semibold text-black mb-3">Thông tin cá nhân</h3>
                            <div className="bg-red-50 border-l-4 border-red-600 px-3 py-2 text-sm text-black">
                              <div><span className="font-bold">Họ và tên:</span> {selectedMemberCV.details.full_name || selectedMember.full_name}</div>
                              {selectedMemberCV.details.email && <div><span className="font-bold">Email:</span> {selectedMemberCV.details.email}</div>}
                              {selectedMemberCV.details.phone && <div><span className="font-bold">SĐT:</span> {selectedMemberCV.details.phone}</div>}
                              {selectedMemberCV.details.birthday && <div><span className="font-bold">Ngày sinh:</span> {new Date(selectedMemberCV.details.birthday).toLocaleDateString('vi-VN')}</div>}
                              {selectedMemberCV.details.gender && <div><span className="font-bold">Giới tính:</span> {selectedMemberCV.details.gender}</div>}
                              {selectedMemberCV.details.address && <div><span className="font-bold">Địa chỉ:</span> {selectedMemberCV.details.address}</div>}
                              {!selectedMemberCV.details.email && !selectedMemberCV.details.phone && (
                                <div><span className="font-bold">Email:</span> {selectedMember.email}<br /><span className="font-bold">Mã NV:</span> {selectedMember.employee_code}<br /><span className="font-bold">Dự án:</span> {selectedMember.projects?.join(', ') || 'Chưa có dự án'}<br /><span className="font-bold">Vai trò:</span> {selectedMember.roles?.map(role => role.name).join(', ') || 'Chưa có vai trò'}</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-black mb-3">Đào tạo</h3>
                            {selectedMemberCV.details.education && selectedMemberCV.details.education.length > 0 ? (
                              selectedMemberCV.details.education.map((edu, index) => (
                                <div key={index} className="bg-red-50 border-l-4 border-red-600 px-3 py-2 text-sm text-black mb-3">
                                  <div className="font-bold">{edu.organization}</div>
                                  {edu.degree && <div>{edu.degree}</div>}
                                  {edu.major && <div><span className="font-bold">Chuyên ngành:</span> {edu.major}</div>}
                                  {edu.graduation_year && <div><span className="font-bold">Năm tốt nghiệp:</span> {edu.graduation_year}</div>}
                                </div>
                              ))
                            ) : (
                              <div className="bg-red-50 border-l-4 border-red-600 px-3 py-2 text-sm text-black">
                                
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Courses */}
                        {selectedMemberCV.details.courses && selectedMemberCV.details.courses.length > 0 && (
                          <div className="mt-8">
                            <h3 className="text-lg font-semibold text-red-600 mb-4">
                              Khóa học đã tham gia
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedMemberCV.details.courses.map((course, index) => (
                                <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                  <div className="font-bold text-red-700">{course.course_name}</div>
                                  {course.organization && (
                                    <div className="text-gray-600"><span className="font-bold">Tổ chức:</span> {course.organization}</div>
                                  )}
                                  {course.finish_date && (
                                    <div className="text-gray-600">
                                      <span className="font-bold">Hoàn thành:</span> {new Date(course.finish_date).toLocaleDateString('vi-VN')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Skills Section */}
                      <div className="mb-8">
                        <h2 className="text-xl font-bold text-red-700 mb-6 flex items-center">
                          <div className="w-1 h-6 bg-red-600 mr-3"></div>
                          KỸ NĂNG
                        </h2>
                        <div className="space-y-3">
                          {selectedMemberCV.details.skills && selectedMemberCV.details.skills.length > 0 ? (
                            selectedMemberCV.details.skills.map((skill, index) => (
                              <div key={index} className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                                <div className="text-sm text-red-700">
                                  <span className="font-bold">{skill.skill_name}</span>
                                  {skill.description && (
                                    <span className="text-gray-600">: {skill.description}</span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 italic text-center py-8">
                              
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                    {/* Footer */}
                    <div className="bg-red-600 p-4 text-center">
                      <div className="text-white text-sm">
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Dialog */}
      {showMessageDialog && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Yêu cầu cập nhật CV - {selectedMemberForUpdate?.full_name}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lời nhắn (tùy chọn):
              </label>
              <textarea
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                placeholder="Nhập lời nhắn cho nhân viên về việc cập nhật CV..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {updateMessage.length}/500 ký tự
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelUpdateRequest}
                disabled={requestingUpdate}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSendUpdateRequest}
                disabled={requestingUpdate}
                className="px-4 py-2 bg-[#E60012] text-white rounded-md hover:bg-[#cc0010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requestingUpdate ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang gửi...
                  </div>
                ) : (
                  'Gửi yêu cầu'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
