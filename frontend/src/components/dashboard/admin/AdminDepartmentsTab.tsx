"use client";

import { useState, useEffect } from 'react';
import { DepartmentWithStats, DepartmentCreateRequest, getDepartmentsWithStats, createDepartment, updateDepartment, deleteDepartment } from '@/services/department';
import { User, getUsersInDepartment } from '@/services/user';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, Building2, Users, UserCheck, Eye } from 'lucide-react';

interface DepartmentFormData {
  name: string;
}

export default function AdminDepartmentsTab() {
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Create department modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<DepartmentFormData>({
    name: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit department modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepartmentForEdit, setSelectedDepartmentForEdit] = useState<DepartmentWithStats | null>(null);
  const [editFormData, setEditFormData] = useState<DepartmentFormData>({
    name: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete department state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartmentForDelete, setSelectedDepartmentForDelete] = useState<DepartmentWithStats | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState(false);

  // Members panel states
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [selectedDepartmentForMembers, setSelectedDepartmentForMembers] = useState<DepartmentWithStats | null>(null);
  const [currentDepartmentMembers, setCurrentDepartmentMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Load departments on component mount
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading all departments for admin...');
      const departmentsData = await getDepartmentsWithStats();
      setDepartments(departmentsData);
      console.log(`Loaded ${departmentsData.length} departments`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phòng ban');
      console.error('Error loading departments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter departments based on search
  const filteredDepartments = departments.filter(department =>
    department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    department.manager_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handler functions
  const handleEditDepartment = (department: DepartmentWithStats) => {
    setSelectedDepartmentForEdit(department);
    setEditFormData({
      name: department.name,
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleDeleteDepartment = (department: DepartmentWithStats) => {
    setSelectedDepartmentForDelete(department);
    setShowDeleteDialog(true);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name.trim()) {
      setCreateError('Tên phòng ban không được để trống');
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError('');

      const departmentData: DepartmentCreateRequest = {
        name: createFormData.name.trim(),
      };

      const newDepartment = await createDepartment(departmentData);

      toast.success(`Đã tạo phòng ban "${newDepartment.name}" thành công`);
      setShowCreateModal(false);
      setCreateFormData({ name: '' });

      // Reload departments to get updated stats
      loadDepartments();
    } catch (error) {
      console.error('Failed to create department:', error);
      setCreateError(error instanceof Error ? error.message : 'Không thể tạo phòng ban');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartmentForEdit || !editFormData.name.trim()) {
      setEditError('Tên phòng ban không được để trống');
      return;
    }

    try {
      setEditLoading(true);
      setEditError('');

      const updateData: DepartmentCreateRequest = {
        name: editFormData.name.trim(),
      };

      const updatedDepartment = await updateDepartment(selectedDepartmentForEdit.id, updateData);

      toast.success(`Đã cập nhật phòng ban "${updatedDepartment.name}" thành công`);
      setShowEditModal(false);
      setSelectedDepartmentForEdit(null);
      setEditFormData({ name: '' });

      // Reload departments to get updated stats
      loadDepartments();
    } catch (error) {
      console.error('Failed to update department:', error);
      setEditError(error instanceof Error ? error.message : 'Không thể cập nhật phòng ban');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDepartmentForDelete) return;

    try {
      setDeletingDepartment(true);
      console.log(`Deleting department: ${selectedDepartmentForDelete.id}`);

      await deleteDepartment(selectedDepartmentForDelete.id);

      toast.success(`Đã xóa phòng ban "${selectedDepartmentForDelete.name}" thành công`);
      setShowDeleteDialog(false);
      setSelectedDepartmentForDelete(null);

      // Reload departments to get updated list
      loadDepartments();
    } catch (error) {
      console.error('Failed to delete department:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa phòng ban');
    } finally {
      setDeletingDepartment(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSelectedDepartmentForDelete(null);
  };

  // Handle viewing department members
  const handleViewDepartmentMembers = async (department: DepartmentWithStats) => {
    setSelectedDepartmentForMembers(department);
    setCurrentDepartmentMembers([]);
    setMembersError(null);
    setShowMembersPanel(true);

    if (department.id) {
      try {
        setLoadingMembers(true);
        console.log(`Fetching members for department: ${department.name} (${department.id})`);
        const members = await getUsersInDepartment(department.id);
        setCurrentDepartmentMembers(members);
        console.log('Department members loaded successfully:', members);
      } catch (error) {
        console.error('Failed to load department members:', error);
        setMembersError(error instanceof Error ? error.message : 'Không thể tải danh sách thành viên phòng ban');
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  // Handle toggling members panel
  const handleToggleMembersPanel = () => {
    setShowMembersPanel(!showMembersPanel);
    if (!showMembersPanel) {
      // If opening panel, clear previous data
      setSelectedDepartmentForMembers(null);
      setCurrentDepartmentMembers([]);
      setMembersError(null);
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 flex relative">
      {/* Main Content */}
      <div className={`${showMembersPanel ? 'w-1/3' : 'w-full'} transition-all duration-300 flex flex-col`}>
        <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý phòng ban</h1>
            <p className="text-gray-600 mt-1">
              Quản lý tất cả phòng ban trong hệ thống
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-[#E60012] text-white rounded-lg hover:bg-[#cc0010] transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo phòng ban mới
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên phòng ban hoặc quản lý..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadDepartments}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Departments Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Đang tải phòng ban...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy phòng ban</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? 'Không có phòng ban nào phù hợp với từ khóa tìm kiếm'
                  : 'Chưa có phòng ban nào trong hệ thống'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-[#E60012] text-white rounded-lg hover:bg-[#cc0010] transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo phòng ban đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên phòng ban
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quản lý
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số thành viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDepartments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {department.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <UserCheck className="w-4 h-4 text-gray-400 mr-2" />
                          {department.manager_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400 mr-2" />
                          {department.member_count} thành viên
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDepartmentMembers(department)}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Xem thành viên"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditDepartment(department)}
                            className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(department)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Create Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tạo phòng ban mới
            </h3>

            <form onSubmit={handleCreateDepartment}>
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">{createError}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên phòng ban <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên phòng ban..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                    setCreateFormData({ name: '' });
                  }}
                  disabled={createLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-[#E60012] text-white rounded-md hover:bg-[#cc0010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang tạo...
                    </div>
                  ) : (
                    'Tạo phòng ban'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && selectedDepartmentForEdit && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Chỉnh sửa phòng ban - {selectedDepartmentForEdit.name}
            </h3>

            <form onSubmit={handleEditSubmit}>
              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">{editError}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên phòng ban <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên phòng ban..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDepartmentForEdit(null);
                    setEditError('');
                    setEditFormData({ name: '' });
                  }}
                  disabled={editLoading}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-[#E60012] text-white rounded-md hover:bg-[#cc0010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang cập nhật...
                    </div>
                  ) : (
                    'Cập nhật'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedDepartmentForDelete && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Xác nhận xóa phòng ban
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Bạn có chắc chắn muốn xóa phòng ban sau không?
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedDepartmentForDelete.name}</p>
                    <p className="text-sm text-gray-500">
                      Quản lý: {selectedDepartmentForDelete.manager_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedDepartmentForDelete.member_count} thành viên
                    </p>
                  </div>
                </div>
              </div>
              {selectedDepartmentForDelete.member_count > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">
                        <strong>Cảnh báo:</strong> Phòng ban này có {selectedDepartmentForDelete.member_count} thành viên.
                        Việc xóa phòng ban có thể bị từ chối nếu còn thành viên được gán vào phòng ban này.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={deletingDepartment}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingDepartment}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingDepartment ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xóa...
                  </div>
                ) : (
                  'Xóa phòng ban'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Toggle Button */}
      {showMembersPanel && (
        <div className="absolute top-1/2 left-1/3 transform -translate-y-1/2 z-10">
          <button
            onClick={handleToggleMembersPanel}
            className="bg-white border-2 border-gray-300 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-[#83C21E] group"
            title="Đóng panel thành viên"
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

      {/* Members Side Panel */}
      {showMembersPanel && selectedDepartmentForMembers && (
        <div className="w-2/3 border-l border-gray-200 bg-white flex flex-col h-full">
          {/* Panel Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h2 className="text-2xl font-bold text-[#333333]">
                    {selectedDepartmentForMembers.name}
                  </h2>
                </div>
                <p className="text-sm text-blue-600 font-medium">
                  Danh sách thành viên phòng ban
                </p>
              </div>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Members Loading State */}
            {loadingMembers && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 border border-blue-100">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-3 border-[#83C21E] mr-4"></div>
                  <span className="text-[#333333] font-medium text-lg">Đang tải thành viên...</span>
                </div>
              </div>
            )}

            {/* Members Error State */}
            {membersError && !loadingMembers && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-8 mb-6 border border-red-100">
                <div className="text-center">
                  <div className="text-red-500 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-red-600 font-medium text-lg">{membersError}</p>
                </div>
              </div>
            )}

            {/* Members Table */}
            {currentDepartmentMembers && currentDepartmentMembers.length > 0 && !loadingMembers && !membersError && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentDepartmentMembers.map((member) => (
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
                            {member.roles?.map(role => role.name).join(', ') || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No Members State */}
            {currentDepartmentMembers && currentDepartmentMembers.length === 0 && !loadingMembers && !membersError && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có thành viên nào</h3>
                <p className="text-gray-600">
                  Phòng ban này chưa có thành viên nào
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
