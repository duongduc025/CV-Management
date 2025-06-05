"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { getUsersInDepartment } from '@/services/user';
import { getUserCVByUserId, CV, createCVUpdateRequest } from '@/services/cv';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from 'sonner';

interface BULMembersTabProps {
  user: User;
}

export default function BULMembersTab({ user }: BULMembersTabProps) {
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

  // Load members on component mount and when user changes
  useEffect(() => {
    loadMembers();
  }, [user]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user has department ID
      if (!user.departmentId && !user.department?.id) {
        setError('Không thể tải danh sách thành viên: Người dùng chưa được gán phòng ban');
        return;
      }

      // Use department ID from user object
      const departmentId = user.departmentId || user.department?.id;
      if (!departmentId) {
        setError('Không thể tải danh sách thành viên: Không tìm thấy ID phòng ban');
        return;
      }

      console.log(`Loading members from department: ${departmentId}`);
      const membersData = await getUsersInDepartment(departmentId);
      setMembers(membersData);
      console.log(`Loaded ${membersData.length} members from department`);

      // Load CV statuses for all members
      await loadMembersCVStatuses(membersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách thành viên');
      console.error('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  };

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
          } catch (error) {
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

      // Use Sonner toast for success notification
      toast.success(result.message);

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

  return (
    <div className="h-full w-full bg-gray-50 flex relative">
      {/* Main Content */}
      <div className={`${showCVPanel ? 'w-1/2' : 'w-full'} transition-all duration-300 flex flex-col`}>
        <div className="w-full p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý thành viên</h1>
              <p className="text-gray-600 mt-1">
                Danh sách thành viên trong phòng ban: {user.department?.name || 'Chưa có phòng ban'}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={loadMembers}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                Thử lại
              </button>
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
                  Chưa có thành viên nào trong phòng ban này
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
                        Vai trò
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
                          {member.roles?.map(role => role.name).join(', ') || 'Chưa có vai trò'}
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
                          <button
                            onClick={() => handleViewCV(member)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Xem CV
                          </button>
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                  <div className="text-[#E60012] mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[#E60012] font-medium text-lg">{cvError}</p>
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
                    <label className="text-sm font-medium text-gray-500">Phòng ban</label>
                    <p className="text-gray-900 mt-1">{selectedMember.department?.name || 'Chưa có phòng ban'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vai trò</label>
                    <p className="text-gray-900 mt-1">{selectedMember.roles?.map(role => role.name).join(', ') || 'Chưa có vai trò'}</p>
                  </div>
                </div>
            </div>

            {/* CV Display Section */}
            {selectedMemberCV && !loadingCV && !cvError && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="max-w-2xl mx-auto p-6 bg-white">
                    {/* Header */}
                    <div className="mb-10">
                      <div className="text-left text-sm text-gray-500 mb-6">SƠ YẾU LÝ LỊCH</div>

                      <div className="grid grid-cols-3 gap-6">
                        {/* Profile Image - First 1/3 */}
                        <div className="col-span-1">
                          {selectedMemberCV.details?.anh_chan_dung ? (
                            <img
                              src={selectedMemberCV.details.anh_chan_dung}
                              alt="Profile"
                              className="w-24 h-32 object-cover border-2 border-gray-300"
                            />
                          ) : (
                            <div className="w-24 h-32 border-2 border-gray-300 flex items-center justify-center text-gray-500 text-xs">
                              Ảnh chân<br />dung
                            </div>
                          )}
                        </div>

                        {/* Name and Title - Remaining 2/3 (Center aligned) */}
                        <div className="col-span-2 flex flex-col justify-center items-center">
                          <div className="bg-yellow-300 px-4 py-2 mb-3">
                            <h1 className="text-xl font-bold text-black">
                              {selectedMemberCV.details?.ho_ten || selectedMember.full_name}
                            </h1>
                          </div>
                          <div className="text-red-500 text-base font-medium">
                            {selectedMemberCV.details?.chuc_danh || selectedMember.roles?.map(role => role.name).join(', ') || 'Chức danh'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TÓM TẮT Section */}
                    <div className="mb-10">
                      <h2 className="text-lg font-bold text-black mb-4 border-b border-gray-400 pb-2">TÓM TẮT</h2>
                      <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                        {selectedMemberCV.details?.tom_tat || `Tóm tắt kinh nghiệm và kỹ năng chuyên môn của ${selectedMember.full_name}`}
                      </div>
                    </div>

                    {/* THÔNG TIN CHUNG Section */}
                    <div className="mb-10">
                      <h2 className="text-lg font-bold text-black mb-4 border-b border-gray-400 pb-2">THÔNG TIN CHUNG</h2>

                      <div className="grid grid-cols-2 gap-12 mb-6">
                        <div>
                          <h3 className="text-sm font-semibold text-black mb-3">Thông tin cá nhân</h3>
                          <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                            {selectedMemberCV.details?.thong_tin_ca_nhan || `Email: ${selectedMember.email}\nMã NV: ${selectedMember.employee_code}\nPhòng ban: ${selectedMember.department?.name || 'Chưa có phòng ban'}`}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-black mb-3">Đào tạo</h3>
                          <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                            {selectedMemberCV.details?.thong_tin_dao_tao || 'Thông tin về quá trình đào tạo và học vấn'}
                          </div>
                        </div>
                      </div>

                      {selectedMemberCV.details?.thong_tin_khoa_hoc && (
                        <div className="mb-4">
                          <div className="text-sm text-black mb-2">Thông tin khóa học đã tham gia:</div>
                          <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                            {selectedMemberCV.details.thong_tin_khoa_hoc}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KỸ NĂNG Section */}
                    <div className="mb-8">
                      <h2 className="text-lg font-bold text-black mb-4 border-b border-gray-400 pb-2">KỸ NĂNG</h2>
                      <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                        {selectedMemberCV.details?.thong_tin_ki_nang || `Kỹ năng chuyên môn và kỹ năng mềm của ${selectedMember.full_name}`}
                      </div>
                    </div>


                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Dialog */}
      {showMessageDialog && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
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
