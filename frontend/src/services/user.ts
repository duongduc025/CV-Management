import axios from 'axios';

// Make sure the API URL points to the correct backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface User {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  departmentId?: string;
  department?: {
    id: string;
    name: string;
  };
  roles?: Array<{
    id: string;
    name: string;
  }>;
  projects?: string[]; // List of project names
}

export interface PaginatedUsersResponse {
  users: User[];
  current_page: number;
  total_pages: number;
  total_users: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// User management functions for admin and authorized users
export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await axios.get(`${API_URL}/users`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch users');
    }
    throw new Error('Failed to fetch users. Please try again.');
  }
};

// Get paginated users (Admin only)
export const getUsersPaginated = async (page: number = 1): Promise<PaginatedUsersResponse> => {
  try {
    // Set auth token for authenticated requests
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get(`${API_URL}/users/paginated?page=${page}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch paginated users');
    }
    throw new Error('Failed to fetch paginated users. Please try again.');
  }
};

export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await axios.get(`${API_URL}/users/${id}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch user');
    }
    throw new Error('Failed to fetch user. Please try again.');
  }
};

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  try {
    const response = await axios.post(`${API_URL}/users`, userData);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to create user');
    }
    throw new Error('Failed to create user. Please try again.');
  }
};

export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  try {
    const response = await axios.put(`${API_URL}/users/${id}`, userData);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to update user');
    }
    throw new Error('Failed to update user. Please try again.');
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/users/${id}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to delete user');
    }
    throw new Error('Failed to delete user. Please try again.');
  }
};

// Additional user-related functions can be added here
export const getUsersInDepartment = async (departmentId: string): Promise<User[]> => {
  try {
    // Set auth token for authenticated requests
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get(`${API_URL}/users/department/${departmentId}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch users in department');
    }
    throw new Error('Failed to fetch users in department. Please try again.');
  }
};

export const getUsersInProject = async (projectId: string): Promise<User[]> => {
  try {
    const response = await axios.get(`${API_URL}/users/project/${projectId}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch users in project');
    }
    throw new Error('Failed to fetch users in project. Please try again.');
  }
};