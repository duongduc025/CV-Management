import axios from 'axios';
// Import user functions from user service
import { getUsers as getAllUsers, getUserById } from './user';

const API_URL =  'http://localhost:8080/api';

// Interfaces based on backend models
export interface User {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department_id?: string;
  department?: {
    id: string;
    name: string;
  };
  roles?: Array<{
    id: string;
    name: string;
  }>;
}

export interface Member {
  project_id: string;
  user_id: string;
  user?: User;
  role_in_project?: string;
  joined_at?: string;
  left_at?: string;
}

export interface Project {
  id?: string;
  name: string;
  start_date?: string;
  end_date?: string;
  members?: Member[];
}

export interface ProjectCreateRequest {
  name: string;
  start_date?: string;
  end_date?: string;
}

export interface ProjectResponse {
  status: string;
  message?: string;
  data: Project;
}

export interface ProjectsResponse {
  status: string;
  message?: string;
  data: Project[];
}

export interface MemberResponse {
  status: string;
  message?: string;
  data: Member;
}

// Get all projects
export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await axios.get(`${API_URL}/projects`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải danh sách dự án');
    }
    throw new Error('Không thể tải danh sách dự án. Vui lòng thử lại.');
  }
};

// Get project by ID
export const getProjectById = async (id: string): Promise<Project> => {
  try {
    const response = await axios.get(`${API_URL}/projects/${id}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải thông tin dự án');
    }
    throw new Error('Không thể tải thông tin dự án. Vui lòng thử lại.');
  }
};

// Create a new project
export const createProject = async (projectData: ProjectCreateRequest): Promise<Project> => {
  try {
    console.log('Tạo dự án mới với dữ liệu:', projectData);
    const response = await axios.post(`${API_URL}/projects`, projectData);
    console.log('Phản hồi tạo dự án:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Lỗi tạo dự án:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tạo dự án');
    }
    throw new Error('Không thể tạo dự án. Vui lòng thử lại.');
  }
};

// Update an existing project
export const updateProject = async (id: string, projectData: Partial<ProjectCreateRequest>): Promise<Project> => {
  try {
    console.log('Cập nhật dự án với ID:', id, 'dữ liệu:', projectData);
    const response = await axios.put(`${API_URL}/projects/${id}`, projectData);
    console.log('Phản hồi cập nhật dự án:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Lỗi cập nhật dự án:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể cập nhật dự án');
    }
    throw new Error('Không thể cập nhật dự án. Vui lòng thử lại.');
  }
};

// Delete a project
export const deleteProject = async (id: string): Promise<void> => {
  try {
    console.log('Xóa dự án với ID:', id);
    await axios.delete(`${API_URL}/projects/${id}`);
    console.log('Đã xóa dự án thành công');
  } catch (error) {
    console.error('Lỗi xóa dự án:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể xóa dự án');
    }
    throw new Error('Không thể xóa dự án. Vui lòng thử lại.');
  }
};

// Add member to project
export const addProjectMember = async (projectId: string, memberData: {
  user_id: string;
  role_in_project?: string;
}): Promise<Member> => {
  try {
    console.log('Thêm thành viên vào dự án:', projectId, 'dữ liệu:', memberData);
    const response = await axios.post(`${API_URL}/projects/${projectId}/members`, memberData);
    console.log('Phản hồi thêm thành viên:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Lỗi thêm thành viên:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể thêm thành viên vào dự án');
    }
    throw new Error('Không thể thêm thành viên vào dự án. Vui lòng thử lại.');
  }
};

// Remove member from project
export const removeProjectMember = async (projectId: string, userId: string): Promise<void> => {
  try {
    console.log('Xóa thành viên khỏi dự án:', projectId, 'user ID:', userId);
    await axios.delete(`${API_URL}/projects/${projectId}/members/${userId}`);
    console.log('Đã xóa thành viên khỏi dự án thành công');
  } catch (error) {
    console.error('Lỗi xóa thành viên:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể xóa thành viên khỏi dự án');
    }
    throw new Error('Không thể xóa thành viên khỏi dự án. Vui lòng thử lại.');
  }
};

// Update member role in project
export const updateProjectMemberRole = async (
  projectId: string,
  userId: string,
  roleData: { role_in_project: string }
): Promise<Member> => {
  try {
    console.log('Cập nhật vai trò thành viên:', projectId, userId, roleData);
    const response = await axios.put(`${API_URL}/projects/${projectId}/members/${userId}`, roleData);
    console.log('Phản hồi cập nhật vai trò:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Lỗi cập nhật vai trò thành viên:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể cập nhật vai trò thành viên');
    }
    throw new Error('Không thể cập nhật vai trò thành viên. Vui lòng thử lại.');
  }
};


export { getAllUsers, getUserById };

// Interface for member with project information
export interface MemberWithProject extends Member {
  project_name: string;
}

// Get all members of all projects (PM only)
export const getAllMembersOfAllProjects = async (): Promise<MemberWithProject[]> => {
  try {
    const response = await axios.get(`${API_URL}/projects/members`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải danh sách thành viên dự án');
    }
    throw new Error('Không thể tải danh sách thành viên dự án. Vui lòng thử lại.');
  }
};