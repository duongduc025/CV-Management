"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { canAccessAdmin } from '@/services/auth';
import { getUsers, getUserById, updateUser, deleteUser, getDepartments, type User, type Department } from '@/services/auth';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminUserPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for editing
  const [editForm, setEditForm] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    departmentId: ''
  });

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // If user is loaded but doesn't have admin access, redirect to dashboard
    if (!loading && user && !canAccessAdmin(user)) {
      router.push('/dashboard');
      return;
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && canAccessAdmin(user)) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, departmentsData] = await Promise.all([
        getUsers(),
        getDepartments()
      ]);
      setUsers(usersData);
      setDepartments(departmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const userData = await getUserById(userId);
      setSelectedUser(userData);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      employee_code: user.employee_code,
      full_name: user.full_name,
      email: user.email,
      departmentId: user.departmentId || ''
    });
    setIsEditing(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      const updatedUser = await updateUser(selectedUser.id, {
        employee_code: editForm.employee_code,
        full_name: editForm.full_name,
        email: editForm.email,
        departmentId: editForm.departmentId
      });

      setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
      setSelectedUser(updatedUser);
      setIsEditing(false);
      setSuccess('User updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setIsEditing(false);
      }
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading user management..." />
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  if (!canAccessAdmin(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access user management.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSwitcherNavbar />

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                  <p className="text-gray-600 mt-1">Manage system users, their roles and permissions</p>
                </div>
                <Link
                  href="/admin"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  ← Back to Admin
                </Link>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
                <button
                  onClick={() => setError('')}
                  className="float-right text-red-700 hover:text-red-900"
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {success}
                <button
                  onClick={() => setSuccess('')}
                  className="float-right text-green-700 hover:text-green-900"
                >
                  ×
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Users List */}
              <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Users ({users.length})</h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-medium text-sm">
                                    {user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="text-xs text-gray-400">
                                  {user.employee_code} • {user.department?.name || 'No Department'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewUser(user.id)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-green-600 hover:text-green-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {user.roles && user.roles.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {role.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Details/Edit Panel */}
              <div className="lg:col-span-1">
                {selectedUser ? (
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium text-gray-900">
                          {isEditing ? 'Edit User' : 'User Details'}
                        </h2>
                        {!isEditing && (
                          <button
                            onClick={() => handleEditUser(selectedUser)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Employee Code</label>
                            <input
                              type="text"
                              value={editForm.employee_code}
                              onChange={(e) => setEditForm({ ...editForm, employee_code: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                              type="text"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Department</label>
                            <select
                              value={editForm.departmentId}
                              onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Department</option>
                              {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveUser}
                              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditing(false)}
                              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Employee Code</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.employee_code}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.full_name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Department</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedUser.department?.name || 'No Department'}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Roles</label>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedUser.roles && selectedUser.roles.length > 0 ? (
                                selectedUser.roles.map((role) => (
                                  <span
                                    key={role.id}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                  >
                                    {role.name}
                                  </span>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500">No roles assigned</p>
                              )}
                            </div>
                          </div>
                          <div className="pt-4">
                            <button
                              onClick={() => handleDeleteUser(selectedUser.id)}
                              className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                              Delete User
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-medium text-gray-900">User Details</h2>
                    </div>
                    <div className="px-6 py-4">
                      <p className="text-gray-500 text-center">Select a user to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}