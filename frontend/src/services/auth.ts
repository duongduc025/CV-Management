import axios from 'axios';
// Import User interface from user service for backward compatibility
import type { User } from './user';

// Make sure the API URL points to the correct backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Log API calls for debugging
axios.interceptors.request.use(request => {
  console.log('Starting Request', request.url);
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', response.status, response.data);
    return response;
  },
  async error => {
    // Check if the error is due to an expired token
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Check if refresh token is expired before using it
        try {
          const payload = JSON.parse(atob(refreshToken.split('.')[1]));
          const currentTime = Date.now() / 1000;

          if (payload.exp < currentTime) {
            throw new Error('Refresh token is expired');
          }
        } catch {
          throw new Error('Invalid refresh token format');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        // Store the new tokens
        const { token, refresh_token } = response.data.data;
        localStorage.setItem('token', token);
        if (refresh_token) {
          localStorage.setItem('refreshToken', refresh_token);
        }

        // Update auth header
        setAuthToken(token);

        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login only if not already on a public page
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setAuthToken(null);

        // Only redirect if not already on login/register/landing page
        const currentPath = window.location.pathname;
        if (!['/login', '/register', '/'].includes(currentPath)) {
          window.location.href = '/login';
        }
      }
    }

    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  employeeCode: string;
  fullName: string;
  email: string;
  password: string;
  departmentId: string;
  roleNames: string[];
}

export type { User };

export interface AuthResponse {
  status: string;
  data: {
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
    token: string;
    refresh_token: string;
  };
}

export interface Department {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
}

// Permission utility functions
export const hasRole = (user: User | null, roleName: string): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some(role => role.name === roleName);
};

export const hasAnyRole = (user: User | null, roleNames: string[]): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some(role => roleNames.includes(role.name));
};

export const isAdmin = (user: User | null): boolean => hasRole(user, 'Admin');
export const isPM = (user: User | null): boolean => hasRole(user, 'PM');
export const isBUL = (user: User | null): boolean => hasRole(user, 'BUL/Lead');
export const isEmployee = (user: User | null): boolean => hasRole(user, 'Employee');

export const canAccessAdmin = (user: User | null): boolean => isAdmin(user);
export const canManageCVs = (user: User | null): boolean => hasAnyRole(user, ['Admin', 'PM', 'BUL/Lead']);

// Set JWT token in axios headers
export const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Register user (now uses mass registration format with single user)
export const register = async (registerData: RegisterData): Promise<{ status: string; message: string }> => {
  try {
    console.log('Sending registration data:', {
      ...registerData,
      password: '[REDACTED]'
    });

    const response = await axios.post(`${API_URL}/auth/register`, {
      users: [{
        employee_code: registerData.employeeCode,
        full_name: registerData.fullName,
        email: registerData.email,
        password: registerData.password,
        department_id: registerData.departmentId,
        role_names: registerData.roleNames,
      }]
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Registration failed');
    }
    throw new Error('Registration failed. Please try again.');
  }
};

// Login user
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);

    // Store tokens
    if (response.data.status === 'success') {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('refreshToken', response.data.data.refresh_token);
      setAuthToken(response.data.data.token);
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Login failed');
    }
    throw new Error('Login failed. Please try again.');
  }
};

// Refresh token
export const refreshToken = async (): Promise<{ token: string; refreshToken?: string }> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refresh_token: refreshToken
    });

    // Store the new tokens
    if (response.data.status === 'success') {
      const newToken = response.data.data.token;
      const newRefreshToken = response.data.data.refresh_token;

      localStorage.setItem('token', newToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      setAuthToken(newToken);

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    }

    throw new Error('Failed to refresh token');
  } catch (error) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    throw error;
  }
};

// Logout user
export const logout = async (): Promise<void> => {
  try {
    // With stateless JWT, we just need to notify the server (optional)
    await axios.post(`${API_URL}/auth/logout`, {});
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setAuthToken(null);
  }
};

// Get current user profile
export const getCurrentUser = async (): Promise<User> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token available');
    }

    // Validate token format and expiration before making API call
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;

      // If token is expired, don't make the API call
      if (payload.exp < currentTime) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setAuthToken(null);
        throw new Error('Token is expired');
      }
    } catch {
      // Invalid token format
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setAuthToken(null);
      throw new Error('Invalid token format');
    }

    setAuthToken(token);
    const response = await axios.get(`${API_URL}/profile`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setAuthToken(null);
    }
    throw error;
  }
};

// Get departments for registration
export const getDepartments = async (): Promise<Department[]> => {
  try {
    console.log('Fetching departments from API');
    const response = await axios.get(`${API_URL}/departments`);

    if (!response.data || !response.data.data) {
      console.error('Unexpected response format:', response.data);
      throw new Error('Invalid response from departments API');
    }

    const departments = response.data.data;
    console.log(`Retrieved ${departments.length} departments`);
    return departments;
  } catch (error) {
    console.error('Error fetching departments:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to load departments: ${error.response.data?.message || error.message}`);
    }
    throw error;
  }
};

// Get roles for registration
export const getRoles = async (): Promise<Role[]> => {
  try {
    console.log('Fetching roles from API');
    const response = await axios.get(`${API_URL}/roles`);

    if (!response.data || !response.data.data) {
      console.error('Unexpected response format:', response.data);
      throw new Error('Invalid response from roles API');
    }

    const roles = response.data.data;
    console.log(`Retrieved ${roles.length} roles`);
    return roles;
  } catch (error) {
    console.error('Error fetching roles:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to load roles: ${error.response.data?.message || error.message}`);
    }
    throw error;
  }
};

