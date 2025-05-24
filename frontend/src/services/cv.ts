import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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
