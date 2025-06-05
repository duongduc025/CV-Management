"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { getDepartments, getRoles, type Department, type Role } from '@/services/auth';
import { toast } from 'sonner';

interface UserFormData {
  employeeCode: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  departmentId: string;
  selectedRoles: string[];
}

interface AdminRegisterTabProps {
  user: User;
}

export default function AdminRegisterTab({ user }: AdminRegisterTabProps) {
  // Note: user parameter available for future use if needed
  // State for mass registration
  const [bulkUsers, setBulkUsers] = useState<UserFormData[]>([]);

  // Common state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [departmentsData, rolesData] = await Promise.all([
        getDepartments(),
        getRoles()
      ]);
      setDepartments(departmentsData);
      setRoles(rolesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu ban đầu');
    } finally {
      setLoadingData(false);
    }
  };

  const addBulkUser = () => {
    setBulkUsers([...bulkUsers, {
      employeeCode: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      departmentId: '',
      selectedRoles: [],
    }]);
  };

  const removeBulkUser = (index: number) => {
    setBulkUsers(bulkUsers.filter((_, i) => i !== index));
  };

  const updateBulkUser = (index: number, field: keyof UserFormData, value: string | string[]) => {
    const updated = [...bulkUsers];
    updated[index] = { ...updated[index], [field]: value };
    setBulkUsers(updated);
  };

  const handleBulkRoleChange = (index: number, roleName: string, checked: boolean) => {
    const updated = [...bulkUsers];
    if (checked) {
      updated[index].selectedRoles = [...updated[index].selectedRoles, roleName];
    } else {
      updated[index].selectedRoles = updated[index].selectedRoles.filter(role => role !== roleName);
    }
    setBulkUsers(updated);
  };

  const clearAllUsers = () => {
    setBulkUsers([]);
    addBulkUser(); // Add one empty row
  };

  const setDefaultPasswordForAll = () => {
    const updated = bulkUsers.map(user => ({
      ...user,
      password: '12345678',
      confirmPassword: '12345678'
    }));
    setBulkUsers(updated);
  };

  const handleTablePaste = (e: React.ClipboardEvent, startRowIndex: number, startFieldIndex: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const rows = pastedData.split('\n').filter(row => row.trim() !== '');

    const fieldOrder = ['employeeCode', 'fullName', 'email', 'password', 'confirmPassword'];

    const updatedUsers = [...bulkUsers];

    rows.forEach((row, rowOffset) => {
      const cells = row.split('\t');
      const targetRowIndex = startRowIndex + rowOffset;

      // Add new rows if needed
      while (updatedUsers.length <= targetRowIndex) {
        updatedUsers.push({
          employeeCode: '',
          fullName: '',
          email: '',
          password: '',
          confirmPassword: '',
          departmentId: '',
          selectedRoles: [],
        });
      }

      cells.forEach((cell, cellOffset) => {
        const fieldIndex = startFieldIndex + cellOffset;
        if (fieldIndex < fieldOrder.length) {
          const fieldName = fieldOrder[fieldIndex] as keyof UserFormData;
          if (fieldName !== 'selectedRoles' && fieldName !== 'departmentId') {
            updatedUsers[targetRowIndex][fieldName] = cell.trim();
          }
        }
      });
    });

    setBulkUsers(updatedUsers);
  };

  // Initialize with one empty row if no users
  useEffect(() => {
    if (bulkUsers.length === 0) {
      addBulkUser();
    }
  }, []);

  const validateForm = (userData: UserFormData): string | null => {
    if (!userData.employeeCode.trim()) return 'Mã nhân viên là bắt buộc';
    if (!userData.fullName.trim()) return 'Họ và tên là bắt buộc';
    if (!userData.email.trim()) return 'Email là bắt buộc';
    if (!userData.password) return 'Mật khẩu là bắt buộc';
    if (userData.password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    if (userData.password !== userData.confirmPassword) return 'Mật khẩu không khớp';
    if (!userData.departmentId) return 'Phòng ban là bắt buộc';
    return null;
  };

  const registerBulkUsers = async (usersData: UserFormData[]) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        users: usersData.map(userData => ({
          employee_code: userData.employeeCode,
          full_name: userData.fullName,
          email: userData.email,
          password: userData.password,
          department_id: userData.departmentId,
          role_names: userData.selectedRoles,
        }))
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Bulk registration failed');
    }

    return response.json();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (bulkUsers.length === 0) {
      setError('Vui lòng thêm ít nhất một người dùng');
      return;
    }

    // Validate all users
    for (let i = 0; i < bulkUsers.length; i++) {
      const validationError = validateForm(bulkUsers[i]);
      if (validationError) {
        setError(`Người dùng ${i + 1}: ${validationError}`);
        return;
      }
    }

    try {
      setLoading(true);
      const result = await registerBulkUsers(bulkUsers);

      if (result.status === 'success') {
        toast.success(`Đăng ký thành công ${bulkUsers.length} người dùng!`);
        setBulkUsers([]);
        addBulkUser(); // Add one empty row
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red mx-auto"></div>
          <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50">
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đăng ký người dùng</h1>
            <p className="text-gray-600 mt-1">Tạo tài khoản người dùng mới cho hệ thống</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError('')}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Mass Registration Form */}
        <BulkUserForm
          bulkUsers={bulkUsers}
          departments={departments}
          roles={roles}
          loading={loading}
          onSubmit={handleBulkSubmit}
          onAddUser={addBulkUser}
          onRemoveUser={removeBulkUser}
          onUpdateUser={updateBulkUser}
          onRoleChange={handleBulkRoleChange}
          onTablePaste={handleTablePaste}
          onClearAll={clearAllUsers}
          onSetDefaultPasswords={setDefaultPasswordForAll}
        />
      </div>
    </div>
  );
}

// Mass User Registration Form Component
interface BulkUserFormProps {
  bulkUsers: UserFormData[];
  departments: Department[];
  roles: Role[];
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onAddUser: () => void;
  onRemoveUser: (index: number) => void;
  onUpdateUser: (index: number, field: keyof UserFormData, value: string | string[]) => void;
  onRoleChange: (index: number, roleName: string, checked: boolean) => void;
  onTablePaste: (e: React.ClipboardEvent, startRowIndex: number, startFieldIndex: number) => void;
  onClearAll: () => void;
  onSetDefaultPasswords: () => void;
}

function BulkUserForm({
  bulkUsers,
  departments,
  roles,
  loading,
  onSubmit,
  onAddUser,
  onRemoveUser,
  onUpdateUser,
  onRoleChange,
  onTablePaste,
  onClearAll,
  onSetDefaultPasswords
}: BulkUserFormProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Đăng ký người dùng hàng loạt</h2>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onSetDefaultPasswords}
                disabled={bulkUsers.length === 0}
                className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Đặt mật khẩu mặc định
              </button>
              <button
                type="button"
                onClick={onAddUser}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                + Thêm dòng
              </button>
              <button
                type="button"
                onClick={onClearAll}
                disabled={bulkUsers.length === 0}
                className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã nhân viên
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Họ và tên
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mật khẩu
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Xác nhận mật khẩu
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phòng ban
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vai trò
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bulkUsers.map((user, index) => (
                  <tr key={index}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={user.employeeCode}
                        onChange={(e) => onUpdateUser(index, 'employeeCode', e.target.value)}
                        onPaste={(e) => onTablePaste(e, index, 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Mã NV"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={user.fullName}
                        onChange={(e) => onUpdateUser(index, 'fullName', e.target.value)}
                        onPaste={(e) => onTablePaste(e, index, 1)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Họ và tên"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="email"
                        value={user.email}
                        onChange={(e) => onUpdateUser(index, 'email', e.target.value)}
                        onPaste={(e) => onTablePaste(e, index, 2)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="email@example.com"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="password"
                        value={user.password}
                        onChange={(e) => onUpdateUser(index, 'password', e.target.value)}
                        onPaste={(e) => onTablePaste(e, index, 3)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Mật khẩu"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="password"
                        value={user.confirmPassword}
                        onChange={(e) => onUpdateUser(index, 'confirmPassword', e.target.value)}
                        onPaste={(e) => onTablePaste(e, index, 4)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Xác nhận"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <select
                        value={user.departmentId}
                        onChange={(e) => onUpdateUser(index, 'departmentId', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Chọn</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {roles.filter(role => role.name !== 'Employee').map((role) => (
                          <label key={role.id} className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={user.selectedRoles.includes(role.name)}
                              onChange={(e) => onRoleChange(index, role.name, e.target.checked)}
                              className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-1"
                            />
                            {role.name}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onRemoveUser(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between px-6 pb-6">
            <div className="text-sm text-gray-600">
              Tổng: {bulkUsers.length} người dùng
            </div>
            <button
              type="submit"
              disabled={loading || bulkUsers.length === 0}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng ký...' : `Đăng ký ${bulkUsers.length} người dùng`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
