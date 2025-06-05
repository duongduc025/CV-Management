import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Ensure auth token is set for admin requests
const setAuthToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Admin dashboard statistics interface
export interface AdminDashboardStats {
  totalUsers: number;
  totalCVs: number;
  updatedCVs: number;
  updateRequests: number;
  totalProjects: number;
  totalDepartments: number;
}

// Recent CV update request interface
export interface RecentCVRequest {
  id: string;
  employee_name: string;
  department: string;
  requester: string;
  time: string;
  status: 'Chưa cập nhật' | 'Đã cập nhật' | 'Đã huỷ';
}

// Admin CV update request interface (matches backend structure)
export interface AdminCVUpdateRequest {
  id: string;
  cv_id: string;
  requested_by: string;
  requested_at: string;
  status: 'Đang yêu cầu' | 'Đã xử lý' | 'Đã huỷ';
  is_read?: boolean;
  content?: string;
  // Additional fields from joined tables
  employee_name?: string;
  department?: string;
  requester_name?: string;
}

// API response interfaces
export interface AdminStatsResponse {
  status: string;
  message?: string;
  data: AdminDashboardStats;
}

export interface RecentRequestsResponse {
  status: string;
  message?: string;
  data: RecentCVRequest[];
}

export interface AdminCVRequestsResponse {
  status: string;
  message?: string;
  data: AdminCVUpdateRequest[];
}

// Get admin dashboard statistics
export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  try {
    setAuthToken();
    const response = await axios.get<AdminStatsResponse>(`${API_URL}/general-info/admin-dashboard-stats`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải thống kê dashboard');
    }
    throw new Error('Không thể tải thống kê dashboard. Vui lòng thử lại.');
  }
};


// Get all CV update requests for admin
export const getAllCVRequests = async (): Promise<RecentCVRequest[]> => {
  try {
    setAuthToken();
    // TODO: Replace with actual API call when backend is ready
    // const response = await axios.get<RecentRequestsResponse>(`${API_URL}/admin/cv-requests`);
    // return response.data.data;
    
    return [
      {
        id: '1',
        employee_name: 'Nguyễn Văn A',
        department: 'P.KTCN',
        requester: 'PM Minh',
        time: '2024-06-03 10:30',
        status: 'Chưa cập nhật'
      },
      {
        id: '2',
        employee_name: 'Trần Thị B',
        department: 'BU Mobile',
        requester: 'Lead Hùng',
        time: '2024-06-02 14:15',
        status: 'Đã cập nhật'
      },
      {
        id: '3',
        employee_name: 'Lê Văn C',
        department: 'P.Quản lý chất lượng',
        requester: 'BUL Lan',
        time: '2024-06-01 09:45',
        status: 'Đã huỷ'
      }
    ];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải danh sách yêu cầu cập nhật CV');
    }
    throw new Error('Không thể tải danh sách yêu cầu cập nhật CV. Vui lòng thử lại.');
  }
};

// Get all CV update requests for admin (detailed view)
export const getAllCVUpdateRequestsForAdmin = async (): Promise<AdminCVUpdateRequest[]> => {
  try {
    setAuthToken();
    const response = await axios.get<AdminCVRequestsResponse>(`${API_URL}/requests/admin/all`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải danh sách yêu cầu cập nhật CV');
    }
    throw new Error('Không thể tải danh sách yêu cầu cập nhật CV. Vui lòng thử lại.');
  }
};

// Cancel a CV update request (admin only)
export const cancelCVUpdateRequest = async (requestId: string): Promise<void> => {
  try {
    setAuthToken();
    await axios.put(`${API_URL}/requests/${requestId}/status`, { status: 'Đã huỷ' });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể hủy yêu cầu cập nhật CV');
    }
    throw new Error('Không thể hủy yêu cầu cập nhật CV. Vui lòng thử lại.');
  }
};

// Get all CVs for admin management
export const getAllCVsForAdmin = async () => {
  try {
    setAuthToken();
    // TODO: Replace with actual API call when backend is ready
    // const response = await axios.get(`${API_URL}/admin/cvs`);
    // return response.data.data;

    return [
      {
        id: '1',
        employeeName: 'Nguyễn Văn A',
        email: 'nguyenvana@company.com',
        department: 'P.KTCN',
        position: 'Senior Developer',
        status: 'Đã cập nhật',
        lastUpdatedBy: 'Admin System',
        lastUpdatedAt: '2024-06-01 14:30'
      },
      {
        id: '2',
        employeeName: 'Trần Thị B',
        email: 'tranthib@company.com',
        department: 'BU Mobile',
        position: 'Mobile Developer',
        status: 'Chưa cập nhật',
        lastUpdatedBy: 'PM Minh',
        lastUpdatedAt: '2024-05-28 09:15'
      },
      {
        id: '3',
        employeeName: 'Lê Văn C',
        email: 'levanc@company.com',
        department: 'P.Quản lý chất lượng',
        position: 'QA Engineer',
        status: 'Hủy yêu cầu',
        lastUpdatedBy: 'BUL Lan',
        lastUpdatedAt: '2024-05-25 16:45'
      }
    ];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Không thể tải danh sách CV');
    }
    throw new Error('Không thể tải danh sách CV. Vui lòng thử lại.');
  }
};
