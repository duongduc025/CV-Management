import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Ensure auth token is set for CV requests
const setAuthToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export interface CVDetail {
  id?: string;
  cv_id?: string;
  ho_ten: string;
  chuc_danh: string;
  anh_chan_dung?: string;
  tom_tat: string;
  thong_tin_ca_nhan: string;
  thong_tin_dao_tao: string;
  thong_tin_khoa_hoc?: string;
  thong_tin_ki_nang: string;
  cv_path?: string;
}

export interface CV {
  id?: string;
  user_id?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  status?: string;
  details?: CVDetail;
}

export interface CVCreateRequest {
  ho_ten: string;
  chuc_danh: string;
  anh_chan_dung?: string;
  tom_tat: string;
  thong_tin_ca_nhan: string;
  thong_tin_dao_tao: string;
  thong_tin_khoa_hoc?: string;
  thong_tin_ki_nang: string;
  cv_path?: string;
}

export interface CVResponse {
  status: string;
  message?: string;
  data: CV;
}

// Get current user's CV
export const getUserCV = async (): Promise<CV> => {
  try {
    const response = await axios.get(`${API_URL}/cv/me`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch CV');
    }
    throw new Error('Failed to fetch CV. Please try again.');
  }
};

// Get CV by user ID (for PM/BUL access)
export const getUserCVByUserId = async (userId: string): Promise<CV> => {
  try {
    const response = await axios.get(`${API_URL}/cv/user/${userId}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch user CV');
    }
    throw new Error('Failed to fetch user CV. Please try again.');
  }
};

// Create a new CV or update existing CV
export const createOrUpdateCV = async (cvData: CVCreateRequest): Promise<CV> => {
  try {
    console.log('Creating/updating CV with data:', cvData);
    const response = await axios.post(`${API_URL}/cv`, cvData);
    console.log('CV create/update response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('CV create/update error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to save CV');
    }
    throw new Error('Failed to save CV. Please try again.');
  }
};

// Alias for backward compatibility
export const createCV = createOrUpdateCV;

// Get CV by User ID (for PM/BUL access)
export const getCVByUserID = async (userID: string): Promise<CV> => {
  try {
    const response = await axios.get(`${API_URL}/cv/user/${userID}`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch CV');
    }
    throw new Error('Failed to fetch CV. Please try again.');
  }
};

// Alias for backward compatibility
export const getCVById = getCVByUserID;

// Helper function to map parsed CV data to CVCreateRequest format
export const mapParsedDataToCVRequest = (parsedData: any, existingData?: CVCreateRequest, cvPath?: string): CVCreateRequest => {
  return {
    ho_ten: parsedData.ho_ten || parsedData.name || parsedData.full_name || existingData?.ho_ten || '',
    chuc_danh: parsedData.chuc_danh || parsedData.title || parsedData.position || existingData?.chuc_danh || '',
    anh_chan_dung: existingData?.anh_chan_dung || '', // Keep existing image
    tom_tat: parsedData.tom_tat || parsedData.summary || parsedData.objective || existingData?.tom_tat || '',
    thong_tin_ca_nhan: parsedData.thong_tin_ca_nhan || parsedData.personal_info || parsedData.contact || existingData?.thong_tin_ca_nhan || '',
    thong_tin_dao_tao: parsedData.thong_tin_dao_tao || parsedData.education || parsedData.academic || existingData?.thong_tin_dao_tao || '',
    thong_tin_khoa_hoc: parsedData.thong_tin_khoa_hoc || parsedData.courses || parsedData.certifications || existingData?.thong_tin_khoa_hoc || '',
    thong_tin_ki_nang: parsedData.thong_tin_ki_nang || parsedData.skills || parsedData.technical_skills || existingData?.thong_tin_ki_nang || '',
    cv_path: cvPath || existingData?.cv_path || '', // Save the uploaded CV path
  };
};

// CV Update Request interfaces
export interface CVUpdateRequest {
  id: string;
  cv_id: string;
  requested_by: string;
  requested_at: string;
  status: 'Đang yêu cầu' | 'Đã xử lý' | 'Đã huỷ';
  is_read?: boolean;
}

export interface CVUpdateRequestResponse {
  status: string;
  message?: string;
  data: CVUpdateRequest;
}

// Create a CV update request
export const createCVUpdateRequest = async (cvId: string, content?: string): Promise<{ data: CVUpdateRequest; message: string }> => {
  try {
    setAuthToken(); // Ensure auth token is set
    console.log('Creating CV update request for CV ID:', cvId, 'with content:', content);
    const requestData: { cv_id: string; content?: string } = { cv_id: cvId };
    if (content && content.trim()) {
      requestData.content = content.trim();
    }
    const response = await axios.post(`${API_URL}/requests`, requestData);
    console.log('CV update request response:', response.data);
    return {
      data: response.data.data,
      message: response.data.message || 'Yêu cầu cập nhật CV đã được tạo thành công'
    };
  } catch (error) {
    console.error('CV update request error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to create CV update request');
    }
    throw new Error('Failed to create CV update request. Please try again.');
  }
};

// Get CV update requests
export const getCVUpdateRequests = async (): Promise<CVUpdateRequest[]> => {
  try {
    const response = await axios.get(`${API_URL}/requests`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch CV update requests');
    }
    throw new Error('Failed to fetch CV update requests. Please try again.');
  }
};

// Mark a specific CV update request as read
export const markCVRequestAsRead = async (requestId: string): Promise<void> => {
  try {
    setAuthToken(); // Ensure auth token is set
    console.log('Marking CV request as read:', requestId);
    const response = await axios.put(`${API_URL}/requests/${requestId}/read`);
    console.log('Mark as read response:', response.data);
  } catch (error) {
    console.error('Mark CV request as read error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to mark request as read');
    }
    throw new Error('Failed to mark request as read. Please try again.');
  }
};

// Mark all CV update requests as read
export const markAllCVRequestsAsRead = async (): Promise<{ updated_count: number }> => {
  try {
    setAuthToken(); // Ensure auth token is set
    console.log('Marking all CV requests as read');
    const response = await axios.put(`${API_URL}/requests/mark-all-read`);
    console.log('Mark all as read response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Mark all CV requests as read error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to mark all requests as read');
    }
    throw new Error('Failed to mark all requests as read. Please try again.');
  }
};
