"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { User, getDepartments, getRoles, type Department, type Role } from '@/services/auth';
import { getUsers, getUsersPaginated, deleteUser, updateUser, type PaginatedUsersResponse } from '@/services/user';
import { getUserCVByUserId, CV, createCVUpdateRequest, deleteCVByUserId, adminUpdateCV, type CVCreateRequest } from '@/services/cv';
import { toast } from 'sonner';
import { Eye, Edit, MessageSquare, Trash2, Save, X, Plus } from 'lucide-react';

interface UserFormData {
  employeeCode: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  departmentId: string;
  selectedRoles: string[];
}

export default function AdminUsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserCV, setSelectedUserCV] = useState<CV | null>(null);
  const [usersCVStatus, setUsersCVStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingCV, setLoadingCV] = useState(false);
  const [loadingCVStatuses, setLoadingCVStatuses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [requestingUpdate, setRequestingUpdate] = useState(false);
  const [deletingCV, setDeletingCV] = useState(false);
  const [showCVPanel, setShowCVPanel] = useState(false);
  const [editingCV, setEditingCV] = useState(false);
  const [savingCV, setSavingCV] = useState(false);
  const [cvEditFormData, setCvEditFormData] = useState<CVCreateRequest>({
    full_name: '',
    job_title: '',
    summary: '',
    birthday: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    cv_path: '',
    portrait_path: '',
    education: [],
    courses: [],
    skills: [],
  });
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [selectedUserForUpdate, setSelectedUserForUpdate] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [usePagination, setUsePagination] = useState(true); // Toggle between paginated and full list

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [bulkUsers, setBulkUsers] = useState<UserFormData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // State for user deletion
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  // State for user editing
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<UserFormData>({
    employeeCode: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    selectedRoles: [],
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Load users on component mount
  const loadUsers = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      if (usePagination) {
        console.log(`Loading paginated users for admin (page ${page})...`);
        const paginatedData: PaginatedUsersResponse = await getUsersPaginated(page);
        setUsers(paginatedData.users);
        setCurrentPage(paginatedData.current_page);
        setTotalPages(paginatedData.total_pages);
        setTotalUsers(paginatedData.total_users);
        setHasNext(paginatedData.has_next);
        setHasPrev(paginatedData.has_prev);
        console.log(`Loaded ${paginatedData.users.length} users (page ${page}/${paginatedData.total_pages}, total: ${paginatedData.total_users})`);

        // Load CV statuses for current page users
        await loadUsersCVStatuses(paginatedData.users);
      } else {
        console.log('Loading all users for admin...');
        const usersData = await getUsers();
        setUsers(usersData);
        console.log(`Loaded ${usersData.length} users`);

        // Load CV statuses for all users
        await loadUsersCVStatuses(usersData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [usePagination]);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  // Pagination functions
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadUsers(page);
    }
  };

  const handleNextPage = () => {
    if (hasNext) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrev) {
      handlePageChange(currentPage - 1);
    }
  };

  const togglePaginationMode = () => {
    setUsePagination(!usePagination);
    setCurrentPage(1);
    loadUsers(1);
  };



  const loadUsersCVStatuses = async (usersData: User[]) => {
    try {
      setLoadingCVStatuses(true);
      const statusMap: Record<string, string> = {};

      // Fetch CV status for each user
      const statusPromises = usersData.map(async (user) => {
        if (user.id) {
          try {
            const userCV = await getUserCVByUserId(user.id);
            statusMap[user.id] = userCV.status || 'Chưa cập nhật';
          } catch {
            // If CV not found, set status as 'Chưa cập nhật'
            statusMap[user.id] = 'Chưa cập nhật';
            console.log(`No CV found for user ${user.id}, setting status to 'Chưa cập nhật'`);
          }
        }
      });

      await Promise.all(statusPromises);
      setUsersCVStatus(statusMap);
      console.log('Loaded CV statuses for all users:', statusMap);
    } catch (error) {
      console.error('Error loading CV statuses:', error);
    } finally {
      setLoadingCVStatuses(false);
    }
  };

  const handleViewCV = async (selectedUser: User) => {
    setSelectedUser(selectedUser);
    setSelectedUserCV(null);
    setCvError(null);
    setShowCVPanel(true);

    // Fetch CV information for the selected user
    if (selectedUser.id) {
      try {
        setLoadingCV(true);
        console.log(`Fetching CV for user ID: ${selectedUser.id}`);
        const userCV = await getUserCVByUserId(selectedUser.id);
        setSelectedUserCV(userCV);
        console.log('User CV loaded successfully:', userCV);
      } catch (error) {
        console.error('Failed to load user CV:', error);
        setCvError(error instanceof Error ? error.message : 'Không thể tải CV của người dùng');
      } finally {
        setLoadingCV(false);
      }
    }
  };

  const handleTogglePanel = () => {
    setShowCVPanel(!showCVPanel);
    if (!showCVPanel) {
      // If opening panel, clear previous data
      setSelectedUser(null);
      setSelectedUserCV(null);
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

  // Helper function to check if CV exists and has data (for enabling delete button)
  const canDeleteCV = (): boolean => {
    return selectedUserCV !== null && !isCVEmpty(selectedUserCV);
  };

  const handleRequestCVUpdate = (user: User) => {
    setSelectedUserForUpdate(user);
    setUpdateMessage('');
    setShowMessageDialog(true);
  };

  const handleSendUpdateRequest = async () => {
    if (!selectedUserForUpdate) return;

    try {
      setRequestingUpdate(true);

      // First get the CV for this user
      const userCV = await getUserCVByUserId(selectedUserForUpdate.id);

      if (!userCV?.id) {
        toast.error('Không tìm thấy CV để yêu cầu cập nhật');
        return;
      }

      console.log(`Requesting CV update for CV ID: ${userCV.id} with message:`, updateMessage);
      const result = await createCVUpdateRequest(userCV.id, updateMessage);

      // Use appropriate toast based on status and message type
      if (result.status === 'error') {
        toast.error(result.message);
      } else if (result.message === "CV đang trong trạng thái chờ cập nhật") {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
        // Update CV status to "Chưa cập nhật" if request was successful and not just a status message
        setUsersCVStatus(prev => ({
          ...prev,
          [selectedUserForUpdate.id]: 'Chưa cập nhật'
        }));
      }

      console.log('CV update request sent successfully');
      setShowMessageDialog(false);
      setSelectedUserForUpdate(null);
      setUpdateMessage('');
    } catch (error) {
      console.error('Failed to request CV update:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể gửi yêu cầu cập nhật CV');
    } finally {
      setRequestingUpdate(false);
    }
  };

  const handleCancelUpdateRequest = () => {
    setShowMessageDialog(false);
    setSelectedUserForUpdate(null);
    setUpdateMessage('');
  };

  const handleDeleteCV = async () => {
    if (!selectedUser) return;

    try {
      setDeletingCV(true);
      console.log(`Deleting CV for user: ${selectedUser.id}`);

      // Call the deleteCVByUserId API to clear all CV data
      const result = await deleteCVByUserId(selectedUser.id);

      toast.success(result.message);

      // Refresh the CV data to show the cleared state
      if (selectedUser.id) {
        try {
          const userCV = await getUserCVByUserId(selectedUser.id);
          setSelectedUserCV(userCV);

          // Update CV status in the users list
          setUsersCVStatus(prev => ({
            ...prev,
            [selectedUser.id]: userCV.status || 'Chưa cập nhật'
          }));
        } catch (error) {
          console.error('Failed to reload CV after deletion:', error);
          // Set CV to null if there's an error loading it
          setSelectedUserCV(null);
          setUsersCVStatus(prev => ({
            ...prev,
            [selectedUser.id]: 'Chưa cập nhật'
          }));
        }
      }
    } catch (error) {
      console.error('Failed to delete CV:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa CV');
    } finally {
      setDeletingCV(false);
    }
  };

  const handleEditCV = () => {
    if (!selectedUserCV || !selectedUser) return;

    // Populate form with existing CV data
    const details = selectedUserCV.details;

    // Format birthday for HTML date input (YYYY-MM-DD)
    let formattedBirthday = '';
    if (details?.birthday) {
      try {
        const date = new Date(details.birthday);
        if (!isNaN(date.getTime())) {
          formattedBirthday = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      } catch {
        console.warn('Invalid birthday format:', details.birthday);
      }
    }

    // Format finish dates for courses
    const formattedCourses = details?.courses?.map(course => {
      let formattedFinishDate = '';
      if (course.finish_date) {
        try {
          const date = new Date(course.finish_date);
          if (!isNaN(date.getTime())) {
            formattedFinishDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        } catch {
          console.warn('Invalid finish date format:', course.finish_date);
        }
      }
      return {
        course_name: course.course_name,
        organization: course.organization || '',
        finish_date: formattedFinishDate
      };
    }) || [];

    setCvEditFormData({
      full_name: details?.full_name || '',
      job_title: details?.job_title || '',
      summary: details?.summary || '',
      birthday: formattedBirthday,
      gender: details?.gender || '',
      email: details?.email || '',
      phone: details?.phone || '',
      address: details?.address || '',
      cv_path: details?.cv_path || '',
      portrait_path: details?.portrait_path || '',
      education: details?.education?.map(edu => ({
        organization: edu.organization,
        degree: edu.degree || '',
        major: edu.major || '',
        graduation_year: edu.graduation_year || undefined
      })) || [],
      courses: formattedCourses,
      skills: details?.skills?.map(skill => ({
        skill_name: skill.skill_name,
        description: skill.description || ''
      })) || [],
    });

    setEditingCV(true);
  };

  const handleSaveCV = async () => {
    if (!selectedUser) return;

    try {
      setSavingCV(true);
      console.log(`Admin saving CV for user: ${selectedUser.id}`);

      // Prepare the data, ensuring empty strings are handled properly
      const cvDataToSend = {
        ...cvEditFormData,
        // Only include birthday if it's not empty
        birthday: cvEditFormData.birthday || '',
        // Ensure arrays are not null
        education: cvEditFormData.education || [],
        courses: cvEditFormData.courses || [],
        skills: cvEditFormData.skills || [],
      };

      console.log('CV data being sent:', cvDataToSend);

      // Call the admin update CV API
      const result = await adminUpdateCV(selectedUser.id, cvDataToSend);

      toast.success(result.message);

      // Update the displayed CV with the new data
      const cvData: CV = {
        ...result.data.cv,
        details: result.data.details
      };
      setSelectedUserCV(cvData);

      // Update CV status in the users list
      setUsersCVStatus(prev => ({
        ...prev,
        [selectedUser.id]: cvData.status || 'Đã cập nhật'
      }));

      setEditingCV(false);
      console.log('CV updated successfully by admin');
    } catch (error) {
      console.error('Failed to update CV:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật CV');
    } finally {
      setSavingCV(false);
    }
  };

  const handleCancelEditCV = () => {
    setEditingCV(false);
    // Reset form data
    setCvEditFormData({
      full_name: '',
      job_title: '',
      summary: '',
      birthday: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      cv_path: '',
      portrait_path: '',
      education: [],
      courses: [],
      skills: [],
    });
  };

  // Delete user functions
  const handleDeleteUser = (user: User) => {
    setSelectedUserForDelete(user);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return;

    try {
      setDeletingUser(true);
      console.log(`Deleting user: ${selectedUserForDelete.id}`);

      await deleteUser(selectedUserForDelete.id);

      toast.success(`Đã xóa người dùng ${selectedUserForDelete.full_name} thành công`);
      setShowDeleteDialog(false);
      
      // Cập nhật state trực tiếp thay vì tải lại toàn bộ danh sách
      setUsers(prevUsers => prevUsers.filter(u => u.id !== selectedUserForDelete.id));
      
      // Cập nhật state CV status nếu cần
      setUsersCVStatus(prevStatus => {
        const newStatus = {...prevStatus};
        if (selectedUserForDelete.id) {
          delete newStatus[selectedUserForDelete.id];
        }
        return newStatus;
      });
      
      setSelectedUserForDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa người dùng');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSelectedUserForDelete(null);
  };

  // Edit user functions
  const handleEditUser = async (user: User) => {
    setSelectedUserForEdit(user);
    setEditFormData({
      employeeCode: user.employee_code,
      fullName: user.full_name,
      email: user.email,
      password: '', // Don't populate password for editing
      confirmPassword: '',
      departmentId: user.department?.id || '',
      selectedRoles: user.roles?.map(role => role.name) || [],
    });
    setEditError('');
    setShowEditModal(true);

    // Load departments and roles if needed
    if (departments.length === 0 || roles.length === 0) {
      await loadModalData();
    }
  };

  const handleEditFormChange = (field: keyof UserFormData, value: string | string[]) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditRoleChange = (roleName: string, checked: boolean) => {
    setEditFormData(prev => ({
      ...prev,
      selectedRoles: checked
        ? [...prev.selectedRoles, roleName]
        : prev.selectedRoles.filter(role => role !== roleName)
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setEditError('');

    // Validate form
    if (!editFormData.employeeCode.trim()) {
      setEditError('Mã nhân viên là bắt buộc');
      return;
    }
    if (!editFormData.fullName.trim()) {
      setEditError('Họ và tên là bắt buộc');
      return;
    }
    if (!editFormData.email.trim()) {
      setEditError('Email là bắt buộc');
      return;
    }
    if (!editFormData.departmentId) {
      setEditError('Phòng ban là bắt buộc');
      return;
    }

    try {
      setEditLoading(true);

      const updateData = {
        employee_code: editFormData.employeeCode,
        full_name: editFormData.fullName,
        email: editFormData.email,
        department_id: editFormData.departmentId,
        role_names: editFormData.selectedRoles,
      };

      console.log('Updating user:', selectedUserForEdit.id, updateData);
      const updatedUser = await updateUser(selectedUserForEdit.id, updateData);

      toast.success(`Đã cập nhật thông tin người dùng ${updatedUser.full_name} thành công`);

      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === selectedUserForEdit.id ? updatedUser : user
        )
      );

      setShowEditModal(false);
      setSelectedUserForEdit(null);
      setEditFormData({
        employeeCode: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        departmentId: '',
        selectedRoles: [],
      });
    } catch (error) {
      console.error('Failed to update user:', error);
      setEditError(error instanceof Error ? error.message : 'Không thể cập nhật thông tin người dùng');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setSelectedUserForEdit(null);
    setEditError('');
    setEditFormData({
      employeeCode: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      departmentId: '',
      selectedRoles: [],
    });
  };

  // Registration modal functions
  const loadModalData = async () => {
    try {
      setLoadingModalData(true);
      const [departmentsData, rolesData] = await Promise.all([
        getDepartments(),
        getRoles()
      ]);
      setDepartments(departmentsData);
      setRoles(rolesData);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Không thể tải dữ liệu ban đầu');
    } finally {
      setLoadingModalData(false);
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
    setRegisterError('');

    if (bulkUsers.length === 0) {
      setRegisterError('Vui lòng thêm ít nhất một người dùng');
      return;
    }

    // Validate all users
    for (let i = 0; i < bulkUsers.length; i++) {
      const validationError = validateForm(bulkUsers[i]);
      if (validationError) {
        setRegisterError(`Người dùng ${i + 1}: ${validationError}`);
        return;
      }
    }

    try {
      setRegisterLoading(true);
      const result = await registerBulkUsers(bulkUsers);

      if (result.status === 'success') {
        toast.success(`Đăng ký thành công ${bulkUsers.length} người dùng!`);

        // Clear all data and close modal first
        setBulkUsers([]);
        setRegisterError('');
        setShowRegisterModal(false);

        // Reload users list
        loadUsers(currentPage);
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleOpenRegisterModal = async () => {
    // Clear any existing data and errors
    setBulkUsers([]);
    setRegisterError('');

    setShowRegisterModal(true);

    // Load departments and roles if needed
    if (departments.length === 0 || roles.length === 0) {
      await loadModalData();
    }

    // Always start with one empty row
    addBulkUser();
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterError('');
    setBulkUsers([]);
    setRegisterLoading(false); // Also reset loading state
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

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || user.department?.name === departmentFilter;
    const matchesProject = !projectFilter || user.projects?.includes(projectFilter);

    return matchesSearch && matchesDepartment && matchesProject;
  });

  // Get unique departments and projects for filters
  const filterDepartments = Array.from(new Set(users.map(user => user.department?.name).filter(Boolean)));
  const projects = Array.from(new Set(users.flatMap(user => user.projects || [])));

  return (
    <div className="h-full w-full bg-gray-50 flex relative">
      {/* Main Content */}
      <div className={`${showCVPanel ? 'w-1/2' : 'w-full'} transition-all duration-300 flex flex-col`}>
        <div className="w-full p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
              <p className="text-gray-600 mt-1">
                Quản lý tất cả người dùng trong hệ thống
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Pagination Toggle */}
              <button
                onClick={togglePaginationMode}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  usePagination
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={usePagination ? 'Chuyển sang xem tất cả' : 'Chuyển sang xem theo trang'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {usePagination ? 'Phân trang' : 'Tất cả'}
              </button>

              {/* Register Button */}
              <button
                onClick={handleOpenRegisterModal}
                className="inline-flex items-center px-4 py-2 bg-[#E60012] text-white rounded-lg hover:bg-[#cc0010] transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Đăng ký người dùng
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Box */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, mã nhân viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Tất cả phòng ban</option>
                {filterDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* Project Filter */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Tất cả dự án</option>
                {projects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => loadUsers(1)}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Đang tải người dùng...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy người dùng</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || departmentFilter || projectFilter
                    ? 'Không có người dùng nào phù hợp với bộ lọc hiện tại'
                    : 'Chưa có người dùng nào trong hệ thống'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Người dùng
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
                        Vai trò
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dự án
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
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.employee_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.department?.name || 'Chưa có phòng ban'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.roles?.map(role => role.name).join(', ') || 'Chưa có vai trò'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          {user.projects && user.projects.length > 0 ? (
                            <div className="space-y-1">
                              {user.projects.slice(0, 2).map((project, index) => (
                                <span
                                  key={index}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1"
                                  title={project}
                                >
                                  {project.length > 15 ? `${project.substring(0, 15)}...` : project}
                                </span>
                              ))}
                              {user.projects.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{user.projects.length - 2} khác
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
                            renderCVStatus(usersCVStatus[user.id] || 'Chưa cập nhật')
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewCV(user)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Xem CV"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRequestCVUpdate(user)}
                              className="p-1 text-green-600 hover:text-green-800 transition-colors"
                              title="Yêu cầu cập nhật"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
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

          {/* Pagination Controls */}
          {usePagination && !loading && users.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                {/* Pagination Info */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                   Tổng: {totalUsers} người dùng
                  </span>
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={handlePrevPage}
                    disabled={!hasPrev}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      hasPrev
                        ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    Trước
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {/* First page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="px-2 py-2 text-sm text-gray-500">...</span>
                        )}
                      </>
                    )}

                    {/* Current page and neighbors */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            pageNum === currentPage
                              ? 'bg-[#E60012] text-white border border-[#E60012]'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="px-2 py-2 text-sm text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNext}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      hasNext
                        ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            </div>
          )}
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
      {showCVPanel && selectedUser && (
        <div className="w-1/2 border-l border-gray-200 bg-white flex flex-col h-full">
          {/* Panel Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h2 className="text-2xl font-bold text-[#333333]">
                    {selectedUser.full_name}
                  </h2>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {selectedUser.employee_code}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 ml-4">
                {/* Top Row - Primary Actions */}
                <div className="flex items-center gap-2">
                  {/* View Original CV Button */}
                  {selectedUserCV?.details?.cv_path && (
                    <a
                      href={selectedUserCV.details.cv_path}
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

                  {/* Edit CV Button */}
                  {!editingCV ? (
                    <button
                      onClick={handleEditCV}
                      disabled={!selectedUserCV || isCVEmpty(selectedUserCV)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Chỉnh sửa CV
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCV}
                        disabled={savingCV}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
                      >
                        {savingCV ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Đang lưu...
                          </div>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Lưu CV
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEditCV}
                        disabled={savingCV}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Hủy
                      </button>
                    </div>
                  )}

                  {/* Request Update Button */}
                  <button
                    onClick={() => handleRequestCVUpdate(selectedUser)}
                    disabled={requestingUpdate || editingCV}
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

                  {/* Delete CV Button */}
                  <button
                    onClick={handleDeleteCV}
                    disabled={deletingCV || !canDeleteCV()}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
                  >
                    {deletingCV ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Đang xóa...
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Xóa CV
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
                  <p className="text-gray-900 mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mã nhân viên</label>
                  <p className="text-gray-900 mt-1">{selectedUser.employee_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phòng ban</label>
                  <p className="text-gray-900 mt-1">{selectedUser.department?.name || 'Chưa có phòng ban'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vai trò</label>
                  <p className="text-gray-900 mt-1">{selectedUser.roles?.map(role => role.name).join(', ') || 'Chưa có vai trò'}</p>
                </div>
              </div>

              {/* Projects Section */}
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-500">Dự án tham gia</label>
                {selectedUser.projects && selectedUser.projects.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUser.projects.map((project, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {project}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 mt-1 text-sm">Chưa tham gia dự án nào</p>
                )}
              </div>
            </div>

            {/* CV Edit Form */}
            {editingCV && selectedUserCV && !loadingCV && !cvError && (
              <div className="max-w-4xl mx-auto bg-white shadow-2xl border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Chỉnh sửa CV - {selectedUser.full_name}</h3>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                    <input
                      type="text"
                      value={cvEditFormData.full_name}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chức danh</label>
                    <input
                      type="text"
                      value={cvEditFormData.job_title}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, job_title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tóm tắt</label>
                    <textarea
                      value={cvEditFormData.summary}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, summary: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                    <input
                      type="date"
                      value={cvEditFormData.birthday}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, birthday: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                    <select
                      value={cvEditFormData.gender}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={cvEditFormData.email}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                    <input
                      type="tel"
                      value={cvEditFormData.phone}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                    <input
                      type="text"
                      value={cvEditFormData.address}
                      onChange={(e) => setCvEditFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Education Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Học vấn</h4>
                    <button
                      type="button"
                      onClick={() => setCvEditFormData(prev => ({
                        ...prev,
                        education: [...(prev.education || []), { organization: '', degree: '', major: '', graduation_year: undefined }]
                      }))}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm học vấn
                    </button>
                  </div>
                  {cvEditFormData.education?.map((edu, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Trường/Tổ chức</label>
                          <input
                            type="text"
                            value={edu.organization}
                            onChange={(e) => {
                              const newEducation = [...(cvEditFormData.education || [])];
                              newEducation[index] = { ...newEducation[index], organization: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, education: newEducation }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bằng cấp</label>
                          <input
                            type="text"
                            value={edu.degree || ''}
                            onChange={(e) => {
                              const newEducation = [...(cvEditFormData.education || [])];
                              newEducation[index] = { ...newEducation[index], degree: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, education: newEducation }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Chuyên ngành</label>
                          <input
                            type="text"
                            value={edu.major || ''}
                            onChange={(e) => {
                              const newEducation = [...(cvEditFormData.education || [])];
                              newEducation[index] = { ...newEducation[index], major: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, education: newEducation }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Năm tốt nghiệp</label>
                          <input
                            type="number"
                            value={edu.graduation_year || ''}
                            onChange={(e) => {
                              const newEducation = [...(cvEditFormData.education || [])];
                              newEducation[index] = { ...newEducation[index], graduation_year: e.target.value ? parseInt(e.target.value) : undefined };
                              setCvEditFormData(prev => ({ ...prev, education: newEducation }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newEducation = cvEditFormData.education?.filter((_, i) => i !== index) || [];
                          setCvEditFormData(prev => ({ ...prev, education: newEducation }));
                        }}
                        className="mt-3 inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>

                {/* Courses Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Khóa học</h4>
                    <button
                      type="button"
                      onClick={() => setCvEditFormData(prev => ({
                        ...prev,
                        courses: [...(prev.courses || []), { course_name: '', organization: '', finish_date: '' }]
                      }))}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm khóa học
                    </button>
                  </div>
                  {cvEditFormData.courses?.map((course, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tên khóa học</label>
                          <input
                            type="text"
                            value={course.course_name}
                            onChange={(e) => {
                              const newCourses = [...(cvEditFormData.courses || [])];
                              newCourses[index] = { ...newCourses[index], course_name: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, courses: newCourses }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tổ chức</label>
                          <input
                            type="text"
                            value={course.organization || ''}
                            onChange={(e) => {
                              const newCourses = [...(cvEditFormData.courses || [])];
                              newCourses[index] = { ...newCourses[index], organization: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, courses: newCourses }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Ngày hoàn thành</label>
                          <input
                            type="date"
                            value={course.finish_date || ''}
                            onChange={(e) => {
                              const newCourses = [...(cvEditFormData.courses || [])];
                              newCourses[index] = { ...newCourses[index], finish_date: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, courses: newCourses }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newCourses = cvEditFormData.courses?.filter((_, i) => i !== index) || [];
                          setCvEditFormData(prev => ({ ...prev, courses: newCourses }));
                        }}
                        className="mt-3 inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>

                {/* Skills Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Kỹ năng</h4>
                    <button
                      type="button"
                      onClick={() => setCvEditFormData(prev => ({
                        ...prev,
                        skills: [...(prev.skills || []), { skill_name: '', description: '' }]
                      }))}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm kỹ năng
                    </button>
                  </div>
                  {cvEditFormData.skills?.map((skill, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tên kỹ năng</label>
                          <input
                            type="text"
                            value={skill.skill_name}
                            onChange={(e) => {
                              const newSkills = [...(cvEditFormData.skills || [])];
                              newSkills[index] = { ...newSkills[index], skill_name: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, skills: newSkills }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                          <input
                            type="text"
                            value={skill.description || ''}
                            onChange={(e) => {
                              const newSkills = [...(cvEditFormData.skills || [])];
                              newSkills[index] = { ...newSkills[index], description: e.target.value };
                              setCvEditFormData(prev => ({ ...prev, skills: newSkills }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newSkills = cvEditFormData.skills?.filter((_, i) => i !== index) || [];
                          setCvEditFormData(prev => ({ ...prev, skills: newSkills }));
                        }}
                        className="mt-3 inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CV Display Section */}
            {!editingCV && selectedUserCV && !loadingCV && !cvError && (
              <div className="max-w-4xl mx-auto bg-white shadow-2xl border border-gray-200">
                {/* CV Header Section */}
                <div className="bg-white border-b border-red-100 px-8 pt-6 pb-4">
                  {/* Last Updated Information */}
                  {selectedUserCV.updater_name && selectedUserCV.last_updated_at && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-semibold text-red-700">Thông tin cập nhật</span>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>
                          <span className="font-medium">Cập nhật bởi:</span> {selectedUserCV.updater_name} - {selectedUserCV.updater_employee_code}
                        </div>
                        <div>
                          <span className="font-medium">Thời gian:</span> {new Date(selectedUserCV.last_updated_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                      selectedUserCV.status === 'Đã cập nhật'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        selectedUserCV.status === 'Đã cập nhật' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      {selectedUserCV.status}
                    </span>
                  </div>
                </div>

                {/* Check if CV is empty and show appropriate message */}
                {isCVEmpty(selectedUserCV) ? (
                  <div className="p-8 text-center">
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12">
                      <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa khởi tạo CV</h3>
                      <p className="text-gray-500 mb-6">
                        CV của {selectedUser.full_name} chưa có thông tin. Vui lòng yêu cầu cập nhật thông tin để hoàn thiện CV.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleRequestCVUpdate(selectedUser)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                        >
                          Yêu cầu cập nhật CV
                        </button>
                      </div>
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
                      {selectedUserCV.details?.portrait_path ? (
                        <Image
                          src={selectedUserCV.details.portrait_path}
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
                        <h1 className="text-xl font-bold">{selectedUserCV.details?.full_name || selectedUser.full_name}</h1>
                      </div>
                      <div className="text-red-100 text-base font-medium">{selectedUserCV.details?.job_title || selectedUser.roles?.map(role => role.name).join(', ') || 'Chức danh'}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {selectedUserCV.details && (
                    <>
                      {/* Summary Section */}
                      <div className="mb-10">
                        <h2 className="text-xl font-bold text-red-700 mb-4 flex items-center">
                          <div className="w-1 h-6 bg-red-600 mr-3"></div>
                          TÓM TẮT
                        </h2>
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {selectedUserCV.details.summary}
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
                              <div><span className="font-bold">Họ và tên:</span> {selectedUserCV.details.full_name || selectedUser.full_name}</div>
                              {selectedUserCV.details.email && <div><span className="font-bold">Email:</span> {selectedUserCV.details.email}</div>}
                              {selectedUserCV.details.phone && <div><span className="font-bold">SĐT:</span> {selectedUserCV.details.phone}</div>}
                              {selectedUserCV.details.birthday && <div><span className="font-bold">Ngày sinh:</span> {new Date(selectedUserCV.details.birthday).toLocaleDateString('vi-VN')}</div>}
                              {selectedUserCV.details.gender && <div><span className="font-bold">Giới tính:</span> {selectedUserCV.details.gender}</div>}
                              {selectedUserCV.details.address && <div><span className="font-bold">Địa chỉ:</span> {selectedUserCV.details.address}</div>}
                              {!selectedUserCV.details.email && !selectedUserCV.details.phone && (
                                <div><span className="font-bold">Email:</span> {selectedUser.email}<br /><span className="font-bold">Mã NV:</span> {selectedUser.employee_code}<br /><span className="font-bold">Phòng ban:</span> {selectedUser.department?.name || 'Chưa có phòng ban'}</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-black mb-3">Đào tạo</h3>
                            {selectedUserCV.details.education && selectedUserCV.details.education.length > 0 ? (
                              selectedUserCV.details.education.map((edu, index) => (
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
                        {selectedUserCV.details.courses && selectedUserCV.details.courses.length > 0 && (
                          <div className="mt-8">
                            <h3 className="text-lg font-semibold text-red-600 mb-4">
                              Khóa học đã tham gia
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedUserCV.details.courses.map((course, index) => (
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
                          {selectedUserCV.details.skills && selectedUserCV.details.skills.length > 0 ? (
                            selectedUserCV.details.skills.map((skill, index) => (
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
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Yêu cầu cập nhật CV - {selectedUserForUpdate?.full_name}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedUserForDelete && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Xác nhận xóa người dùng
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Bạn có chắc chắn muốn xóa người dùng sau không?
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedUserForDelete.full_name}</p>
                    <p className="text-sm text-gray-500">{selectedUserForDelete.email}</p>
                    <p className="text-sm text-gray-500">Mã NV: {selectedUserForDelete.employee_code}</p>
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
                      <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến người dùng này sẽ bị xóa vĩnh viễn, bao gồm CV, yêu cầu cập nhật và thông tin dự án.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={deletingUser}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingUser ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xóa...
                  </div>
                ) : (
                  'Xóa người dùng'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUserForEdit && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Chỉnh sửa thông tin người dùng - {selectedUserForEdit.full_name}
              </h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Error Message */}
              {editError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Employee Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã nhân viên *
                    </label>
                    <input
                      type="text"
                      value={editFormData.employeeCode}
                      onChange={(e) => handleEditFormChange('employeeCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => handleEditFormChange('fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phòng ban *
                    </label>
                    <select
                      value={editFormData.departmentId}
                      onChange={(e) => handleEditFormChange('departmentId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E60012] focus:border-transparent"
                      required
                    >
                      <option value="">Chọn phòng ban</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Vai trò
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {roles.map(role => (
                      <label key={role.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editFormData.selectedRoles.includes(role.name)}
                          onChange={(e) => handleEditRoleChange(role.name, e.target.checked)}
                          className="rounded border-gray-300 text-[#E60012] focus:ring-[#E60012]"
                        />
                        <span className="text-sm text-gray-700">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
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
        </div>
      )}

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Đăng ký người dùng</h2>
              <button
                onClick={handleCloseRegisterModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingModalData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60012] mx-auto"></div>
                    <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
                  </div>
                </div>
              ) : (
                <BulkUserForm
                  bulkUsers={bulkUsers}
                  departments={departments}
                  roles={roles}
                  loading={registerLoading}
                  error={registerError}
                  onSubmit={handleBulkSubmit}
                  onAddUser={addBulkUser}
                  onRemoveUser={removeBulkUser}
                  onUpdateUser={updateBulkUser}
                  onRoleChange={handleBulkRoleChange}
                  onTablePaste={handleTablePaste}
                  onClearAll={clearAllUsers}
                  onSetDefaultPasswords={setDefaultPasswordForAll}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bulk User Registration Form Component
interface BulkUserFormProps {
  bulkUsers: UserFormData[];
  departments: Department[];
  roles: Role[];
  loading: boolean;
  error: string;
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
  error,
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
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Đăng ký người dùng hàng loạt</h3>
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
              className="inline-flex items-center px-4 py-2 bg-[#E60012] text-white rounded-md hover:bg-[#cc0010] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng ký...' : `Đăng ký ${bulkUsers.length} người dùng`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
