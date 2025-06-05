"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { Project, ProjectCreateRequest, createProject, getProjects, addProjectMember, getAllUsers, User as ProjectUser, Member } from '@/services/project';
import { FolderOpen, Plus, Calendar, Clock, CheckCircle, X, UserPlus } from 'lucide-react';

interface PMProjectsTabProps {
  user: User;
}

export default function PMProjectsTab({ user }: PMProjectsTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectCreateRequest>({
    name: '',
    start_date: '',
    end_date: ''
  });

  // Add member modal states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [availableUsers, setAvailableUsers] = useState<ProjectUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Developer');
  const [addingMember, setAddingMember] = useState(false);
  const [projectMembers, setProjectMembers] = useState<{ [key: string]: Member[] }>({});

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);



  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await getProjects();
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách dự án');
      console.error('Error loading projects:', err);
      setProjects([]); // Ensure projects is always an array even on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Tên dự án không được để trống');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const newProject = await createProject(formData);
      setProjects(prev => Array.isArray(prev) ? [...prev, newProject] : [newProject]);
      setShowCreateModal(false);
      setFormData({ name: '', start_date: '', end_date: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo dự án');
      console.error('Error creating project:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  // Open add member modal
  const handleOpenAddMemberModal = async (project: Project) => {
    setSelectedProject(project);
    setSelectedUserId('');
    setSelectedRole('Developer');
    setError(null);

    try {
      // Load available users
      const users = await getAllUsers();
      setAvailableUsers(users);


      setShowAddMemberModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng');
    }
  };

  // Handle adding member to project
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.id || !selectedUserId) {
      setError('Vui lòng chọn người dùng');
      return;
    }

    try {
      setAddingMember(true);
      setError(null);

      await addProjectMember(selectedProject.id, {
        user_id: selectedUserId,
        role_in_project: selectedRole
      });


      // Close modal and reset form
      setShowAddMemberModal(false);
      setSelectedUserId('');
      setSelectedRole('Developer');
      setSelectedProject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm thành viên vào dự án');
    } finally {
      setAddingMember(false);
    }
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Dự án</h1>
          <p className="text-gray-600 mt-1">Tạo và quản lý các dự án được giao</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tạo dự án mới
        </button>
      </div>


      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Đang tải dự án...</p>
          </div>
        ) : projects === null || projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có dự án nào</h3>
            <p className="text-gray-600 mb-6">
              Bắt đầu bằng cách tạo dự án đầu tiên của bạn
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tạo Dự án Đầu tiên
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên Dự án
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày Bắt đầu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày Kết thúc
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FolderOpen className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {project.id?.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.start_date ? (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {new Date(project.start_date).toLocaleDateString('vi-VN')}
                          </div>
                        ) : (
                          <span className="text-gray-400">Chưa xác định</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.end_date ? (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            {new Date(project.end_date).toLocaleDateString('vi-VN')}
                          </div>
                        ) : (
                          <span className="text-gray-400">Chưa xác định</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenAddMemberModal(project)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Thêm thành viên
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tạo dự án mới</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                  setFormData({ name: '', start_date: '', end_date: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Tên dự án *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập tên dự án"
                  required
                />
              </div>

              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                    setFormData({ name: '', start_date: '', end_date: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Đang tạo...' : 'Tạo dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedProject && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Thêm thành viên vào "{selectedProject.name}"
              </h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setError(null);
                  setSelectedProject(null);
                  setSelectedUserId('');
                  setSelectedRole('Developer');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Members */}
            {selectedProject.id && projectMembers[selectedProject.id] && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Thành viên hiện tại:</h4>
                <div className="max-h-32 overflow-y-auto">
                  {projectMembers[selectedProject.id].map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-gray-900">
                        {member.user?.full_name || member.user_id}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {member.role_in_project || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label htmlFor="user_select" className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn người dùng *
                </label>
                <select
                  id="user_select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Chọn người dùng --</option>
                  {availableUsers
                    .filter(user =>
                      !selectedProject.id ||
                      !projectMembers[selectedProject.id] ||
                      !projectMembers[selectedProject.id].some(member => member.user_id === user.id)
                    )
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="role_select" className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò trong dự án
                </label>
                <select
                  id="role_select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Developer">Developer</option>
                  <option value="Tester">Tester</option>
                  <option value="Designer">Designer</option>
                  <option value="Analyst">Analyst</option>
                  <option value="PM">PM</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setError(null);
                    setSelectedProject(null);
                    setSelectedUserId('');
                    setSelectedRole('Developer');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingMember || !selectedUserId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingMember ? 'Đang thêm...' : 'Thêm thành viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
