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
