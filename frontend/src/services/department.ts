import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Ensure auth token is set for requests
const setAuthToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Department interfaces
export interface Department {
  id: string;
  name: string;
}

export interface DepartmentWithStats {
  id: string;
  name: string;
  member_count: number;
  manager_name: string;
  manager_id: string;
}

export interface DepartmentCreateRequest {
  name: string;
}

export interface DepartmentResponse {
  status: string;
  message?: string;
  data: Department;
}

export interface DepartmentsWithStatsResponse {
  status: string;
  message?: string;
  data: DepartmentWithStats[];
}

// Get all departments with statistics (Admin only)
export const getDepartmentsWithStats = async (): Promise<DepartmentWithStats[]> => {
  try {
    setAuthToken();
    console.log('Fetching departments with statistics');
    const response = await axios.get<DepartmentsWithStatsResponse>(`${API_URL}/admin/departments`);
    console.log('Departments with stats response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching departments with stats:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải danh sách phòng ban');
    }
    throw new Error('Không thể tải danh sách phòng ban. Vui lòng thử lại.');
  }
};

// Create a new department (Admin only)
export const createDepartment = async (departmentData: DepartmentCreateRequest): Promise<Department> => {
  try {
    setAuthToken();
    console.log('Creating department:', departmentData);
    const response = await axios.post<DepartmentResponse>(`${API_URL}/admin/departments`, departmentData);
    console.log('Create department response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating department:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tạo phòng ban');
    }
    throw new Error('Không thể tạo phòng ban. Vui lòng thử lại.');
  }
};

// Update an existing department (Admin only)
export const updateDepartment = async (id: string, departmentData: DepartmentCreateRequest): Promise<Department> => {
  try {
    setAuthToken();
    console.log('Updating department:', id, departmentData);
    const response = await axios.put<DepartmentResponse>(`${API_URL}/admin/departments/${id}`, departmentData);
    console.log('Update department response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating department:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể cập nhật phòng ban');
    }
    throw new Error('Không thể cập nhật phòng ban. Vui lòng thử lại.');
  }
};

// Delete a department (Admin only)
export const deleteDepartment = async (id: string): Promise<void> => {
  try {
    setAuthToken();
    console.log('Deleting department:', id);
    await axios.delete(`${API_URL}/admin/departments/${id}`);
    console.log('Department deleted successfully');
  } catch (error) {
    console.error('Error deleting department:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể xóa phòng ban');
    }
    throw new Error('Không thể xóa phòng ban. Vui lòng thử lại.');
  }
};
