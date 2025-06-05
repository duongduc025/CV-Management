"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import { Project, ProjectCreateRequest, createProject, getProjects, addProjectMember, getAllUsers, User as ProjectUser, Member, getProjectMembers, UserWithProjectRole, removeProjectMember, updateProject } from '@/services/project';
import { toast } from 'sonner';
import { FolderOpen, Plus, Calendar, Clock, CheckCircle, X, UserPlus, Eye, Edit } from 'lucide-react';

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

  // Members panel states
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [selectedProjectForMembers, setSelectedProjectForMembers] = useState<Project | null>(null);
  const [currentProjectMembers, setCurrentProjectMembers] = useState<UserWithProjectRole[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMemberForDelete, setSelectedMemberForDelete] = useState<UserWithProjectRole | null>(null);

  // Edit project modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    start_date: '',
    end_date: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
      toast.success(`Đã tạo dự án "${newProject.name}" thành công`);
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

      toast.success(`Đã thêm thành viên vào dự án "${selectedProject.name}" thành công`);

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

  // Handle viewing project members
  const handleViewProjectMembers = async (project: Project) => {
    setSelectedProjectForMembers(project);
    setCurrentProjectMembers([]);
    setMembersError(null);
    setShowMembersPanel(true);

    if (project.id) {
      try {
        setLoadingMembers(true);
        console.log(`Fetching members for project: ${project.name} (${project.id})`);
        const members = await getProjectMembers(project.id);
        setCurrentProjectMembers(members);
        console.log('Project members loaded successfully:', members);
      } catch (error) {
        console.error('Failed to load project members:', error);
        setMembersError(error instanceof Error ? error.message : 'Không thể tải danh sách thành viên dự án');
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
      setSelectedProjectForMembers(null);
      setCurrentProjectMembers([]);
      setMembersError(null);
    }
  };

  // Handle removing member from project
  const handleRemoveMember = (member: UserWithProjectRole) => {
    setSelectedMemberForDelete(member);
    setShowDeleteDialog(true);
  };

  // Handle confirming member removal
  const handleConfirmDelete = async () => {
    if (!selectedProjectForMembers?.id || !selectedMemberForDelete) return;

    try {
      setRemovingMember(selectedMemberForDelete.id);
      console.log(`Removing member ${selectedMemberForDelete.id} from project ${selectedProjectForMembers.id}`);

      await removeProjectMember(selectedProjectForMembers.id, selectedMemberForDelete.id);

      // Refresh the members list
      const updatedMembers = await getProjectMembers(selectedProjectForMembers.id);
      setCurrentProjectMembers(updatedMembers);

      console.log('Member removed successfully');
      toast.success('Đã xóa thành viên khỏi dự án thành công');

      // Close dialog
      setShowDeleteDialog(false);
      setSelectedMemberForDelete(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      setMembersError(error instanceof Error ? error.message : 'Không thể xóa thành viên khỏi dự án');
    } finally {
      setRemovingMember(null);
    }
  };

  // Handle canceling member removal
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSelectedMemberForDelete(null);
  };

  // Helper function to convert date to HTML input format (YYYY-MM-DD)
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return '';

      // Get local date components to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      // Format as YYYY-MM-DD for HTML date input
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  };

  // Handle edit project
  const handleEditProject = (project: Project) => {
    setSelectedProjectForEdit(project);
    
    // Format dates for HTML input (YYYY-MM-DD)
    const formattedStartDate = formatDateForInput(project.start_date);
    const formattedEndDate = formatDateForInput(project.end_date);

    setEditFormData({
      name: project.name,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForEdit || !editFormData.name.trim()) {
      setEditError('Tên dự án không được để trống');
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);

      const updateData = {
        name: editFormData.name,
        start_date: editFormData.start_date || undefined,
        end_date: editFormData.end_date || undefined,
      };

      const updatedProject = await updateProject(selectedProjectForEdit.id!, updateData);

      setProjects(prev =>
        prev.map(project =>
          project.id === selectedProjectForEdit.id ? updatedProject : project
        )
      );

      toast.success(`Đã cập nhật dự án "${updatedProject.name}" thành công`);
      setShowEditModal(false);
      setSelectedProjectForEdit(null);
      setEditFormData({ name: '', start_date: '', end_date: '' });
    } catch (error) {
      console.error('Failed to update project:', error);
      setEditError(error instanceof Error ? error.message : 'Không thể cập nhật dự án');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setSelectedProjectForEdit(null);
    setEditFormData({ name: '', start_date: '', end_date: '' });
    setEditError(null);
  };

  return (
    <div className="h-full w-full bg-gray-50 flex relative">
      {/* Main Content */}
      <div className={`${showMembersPanel ? 'w-1/3' : 'w-full'} transition-all duration-300 flex flex-col`}>
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewProjectMembers(project)}
                          className="p-1 text-green-600 hover:text-green-800 transition-colors"
                          title="Xem thành viên"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenAddMemberModal(project)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Thêm thành viên"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditProject(project)}
                          className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
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

      {/* Edit Project Modal */}
      {showEditModal && selectedProjectForEdit && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Chỉnh sửa dự án - {selectedProjectForEdit.name}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-800 text-sm">{editError}</p>
                </div>
              )}

              <div>
                <label htmlFor="edit_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Tên dự án *
                </label>
                <input
                  type="text"
                  id="edit_name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                  placeholder="Nhập tên dự án"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  id="edit_start_date"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="edit_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  id="edit_end_date"
                  value={editFormData.end_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  min={editFormData.start_date || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-[#E60012] text-white rounded-md hover:bg-[#cc0010] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editLoading ? 'Đang cập nhật...' : 'Cập nhật'}
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
      {showMembersPanel && selectedProjectForMembers && (
        <div className="w-2/3 border-l border-gray-200 bg-white flex flex-col h-full">
          {/* Panel Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h2 className="text-2xl font-bold text-[#333333]">
                    {selectedProjectForMembers.name}
                  </h2>
                </div>
                <p className="text-sm text-blue-600 font-medium">
                  Danh sách thành viên dự án
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
            {currentProjectMembers && currentProjectMembers.length > 0 && !loadingMembers && !membersError && (
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày tham gia
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày rời đi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phòng ban
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentProjectMembers.map((member) => (
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
                            {member.role_in_project || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.joined_at ? new Date(member.joined_at).toLocaleDateString('vi-VN') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.left_at ? new Date(member.left_at).toLocaleDateString('vi-VN') : 'Đang hoạt động'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.department?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {member.left_at ? (
                              <span className="text-gray-400 text-xs">Đã rời dự án</span>
                            ) : (
                              <button
                                onClick={() => handleRemoveMember(member)}
                                disabled={removingMember !== null}
                                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Xóa
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No Members State */}
            {currentProjectMembers && currentProjectMembers.length === 0 && !loadingMembers && !membersError && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có thành viên nào</h3>
                <p className="text-gray-600">
                  Dự án này chưa có thành viên nào
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedMemberForDelete && (
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
                  Xác nhận xóa thành viên
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Bạn có chắc chắn muốn xóa thành viên sau khỏi dự án "{selectedProjectForMembers?.name}"?
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedMemberForDelete.full_name}</p>
                    <p className="text-sm text-gray-500">{selectedMemberForDelete.email}</p>
                    <p className="text-sm text-gray-500">Mã NV: {selectedMemberForDelete.employee_code}</p>
                    <p className="text-sm text-gray-500">Vai trò: {selectedMemberForDelete.role_in_project || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">
                      <strong>Cảnh báo:</strong> Thành viên này sẽ bị xóa khỏi dự án. Hành động này có thể được hoàn tác bằng cách thêm lại thành viên.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={removingMember !== null}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={removingMember !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removingMember !== null ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xóa...
                  </div>
                ) : (
                  'Xóa thành viên'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
