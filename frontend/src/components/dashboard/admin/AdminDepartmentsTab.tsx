"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { DepartmentWithStats, DepartmentCreateRequest, getDepartmentsWithStats, createDepartment, updateDepartment, deleteDepartment } from '@/services/department';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, Building2, Users, UserCheck } from 'lucide-react';

interface DepartmentFormData {
  name: string;
}

interface AdminDepartmentsTabProps {
  user: User;
}

export default function AdminDepartmentsTab({ user }: AdminDepartmentsTabProps) {
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

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
  );
}
