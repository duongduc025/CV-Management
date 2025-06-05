import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Ensure auth token is set for requests
const setAuthToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Department info interface
export interface DepartmentInfo {
  id: string;
  name: string;
  member_count: number;
}

// Project management info interface
export interface ProjectManagementInfo {
  total_project_count: number;
  projects_not_started: number;
  projects_in_progress: number;
  projects_ended: number;
  total_member_count: number;
}

// API response interfaces
export interface DepartmentInfoResponse {
  status: string;
  message?: string;
  data: {
    department: DepartmentInfo;
  };
}

export interface ProjectManagementInfoResponse {
  status: string;
  message?: string;
  data: {
    project_management: ProjectManagementInfo;
  };
}

// Get department general info
export const getDepartmentInfo = async (): Promise<DepartmentInfo> => {
  try {
    setAuthToken();
    const response = await axios.get<DepartmentInfoResponse>(`${API_URL}/general-info/department`);
    return response.data.data.department;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải thông tin phòng ban');
    }
    throw new Error('Không thể tải thông tin phòng ban. Vui lòng thử lại.');
  }
};

// Get project management general info
export const getProjectManagementInfo = async (): Promise<ProjectManagementInfo> => {
  try {
    setAuthToken();
    const response = await axios.get<ProjectManagementInfoResponse>(`${API_URL}/general-info/project-management`);
    return response.data.data.project_management;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải thông tin quản lý dự án');
    }
    throw new Error('Không thể tải thông tin quản lý dự án. Vui lòng thử lại.');
  }
};
