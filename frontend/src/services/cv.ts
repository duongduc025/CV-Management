import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Ensure auth token is set for CV requests
const setAuthToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Education interface matching backend structure
export interface CVEducation {
  id?: string;
  cv_id?: string;
  organization: string;
  degree?: string;
  major?: string;
  graduation_year?: number;
}

export interface CVEducationRequest {
  organization: string;
  degree?: string;
  major?: string;
  graduation_year?: number;
}

// Course interface matching backend structure
export interface CVCourse {
  id?: string;
  cv_id?: string;
  course_name: string;
  organization?: string;
  finish_date?: string;
}

export interface CVCourseRequest {
  course_name: string;
  organization?: string;
  finish_date?: string;
}

// Skill interface matching backend structure
export interface CVSkill {
  id?: string;
  cv_id?: string;
  skill_name: string;
  description?: string;
}

export interface CVSkillRequest {
  skill_name: string;
  description?: string;
}

// CV Detail interface matching backend structure
export interface CVDetail {
  id?: string;
  cv_id?: string;
  full_name: string;
  job_title: string;
  summary: string;
  birthday?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  cv_path?: string;
  portrait_path?: string;
  created_at?: string;
  // Related data
  education?: CVEducation[];
  courses?: CVCourse[];
  skills?: CVSkill[];
}

export interface CV {
  id?: string;
  user_id?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  status?: string;
  details?: CVDetail;
  updater_name?: string;
  updater_employee_code?: string;
}

export interface CVCreateRequest {
  full_name: string;
  job_title: string;
  summary: string;
  birthday?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  cv_path?: string;
  portrait_path?: string;
  education?: CVEducationRequest[];
  courses?: CVCourseRequest[];
  skills?: CVSkillRequest[];
}

export interface CVResponse {
  status: string;
  message?: string;
  data: CV;
}

// Get current user's CV
export const getUserCV = async (): Promise<CV> => {
  try {
    setAuthToken(); // Ensure auth token is set
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
    setAuthToken(); // Ensure auth token is set
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
export const createOrUpdateCV = async (cvData: CVCreateRequest): Promise<{data: {cv: CV, details: CVDetail}, message: string}> => {
  try {
    setAuthToken(); // Ensure auth token is set
    console.log('Creating/updating CV with data:', cvData);
    const response = await axios.post(`${API_URL}/cv`, cvData);
    console.log('CV create/update response:', response.data);
    return {
      data: response.data.data, // This contains {cv: ..., details: ...}
      message: response.data.message
    };
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

// Delete CV - clears all CV data and sets status to "Chưa cập nhật" (Admin only)
export const deleteCVByUserId = async (userId: string): Promise<{message: string}> => {
  try {
    setAuthToken(); // Ensure auth token is set
    console.log('Deleting CV data for user:', userId);
    const response = await axios.delete(`${API_URL}/cv/user/${userId}`);
    console.log('CV delete response:', response.data);
    return {
      message: response.data.message || 'Đã xóa CV thành công'
    };
  } catch (error) {
    console.error('CV delete error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to delete CV');
    }
    throw new Error('Failed to delete CV. Please try again.');
  }
};

// Admin update CV for any user (Admin only)
export const adminUpdateCV = async (userId: string, cvData: CVCreateRequest): Promise<{data: {cv: CV, details: CVDetail}, message: string}> => {
  try {
    setAuthToken(); // Ensure auth token is set
    console.log('Admin updating CV for user:', userId, 'with data:', cvData);
    const response = await axios.put(`${API_URL}/cv/user/${userId}`, cvData);
    console.log('Admin CV update response:', response.data);
    return {
      data: response.data.data, // This contains {cv: ..., details: ...}
      message: response.data.message
    };
  } catch (error) {
    console.error('Admin CV update error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to update CV');
    }
    throw new Error('Failed to update CV. Please try again.');
  }
};

// Alias for backward compatibility
export const getCVByUserID = getUserCVByUserId;
export const getCVById = getUserCVByUserId;

// Helper function to parse personal info string into structured data
const parsePersonalInfo = (personalInfoString: string) => {
  const info = {
    birthday: '',
    gender: '',
    email: '',
    phone: '',
    address: ''
  };

  if (!personalInfoString) return info;

  // Extract email
  const emailMatch = personalInfoString.match(/email[:\s]*([^\s,;]+@[^\s,;]+)/i);
  if (emailMatch) info.email = emailMatch[1];

  // Extract phone
  const phoneMatch = personalInfoString.match(/(?:sđt|phone|điện thoại)[:\s]*([0-9\-\+\s\(\)]+)/i);
  if (phoneMatch) info.phone = phoneMatch[1].trim();

  // Extract birthday
  const birthdayMatch = personalInfoString.match(/(?:ngày sinh|birthday|sinh)[:\s]*([0-9\/\-\.]+)/i);
  if (birthdayMatch) info.birthday = birthdayMatch[1];

  // Extract gender
  const genderMatch = personalInfoString.match(/(?:giới tính|gender)[:\s]*(nam|nữ|male|female)/i);
  if (genderMatch) info.gender = genderMatch[1];

  // Extract address (usually the longest remaining text)
  const addressMatch = personalInfoString.match(/(?:địa chỉ|address)[:\s]*([^,;]+)/i);
  if (addressMatch) info.address = addressMatch[1].trim();

  return info;
};

// Helper function to parse education data into structured format
const parseEducation = (educationString: string): CVEducationRequest[] => {
  if (!educationString) return [];

  // Split by common separators and parse each education entry
  const entries = educationString.split(/[;|\n]/).filter(entry => entry.trim());

  return entries.map(entry => {
    const education: CVEducationRequest = {
      organization: '',
      degree: '',
      major: '',
      graduation_year: undefined
    };

    // Extract year
    const yearMatch = entry.match(/(\d{4})/);
    if (yearMatch) education.graduation_year = parseInt(yearMatch[1]);

    // Extract organization (usually the first part or after specific keywords)
    const orgMatch = entry.match(/(?:trường|university|college|học viện)[:\s]*([^,;]+)/i) ||
                    entry.match(/^([^,;]+)/);
    if (orgMatch) education.organization = orgMatch[1].trim();

    // Extract degree
    const degreeMatch = entry.match(/(?:bằng|degree|cử nhân|thạc sĩ|tiến sĩ)[:\s]*([^,;]+)/i);
    if (degreeMatch) education.degree = degreeMatch[1].trim();

    // Extract major
    const majorMatch = entry.match(/(?:chuyên ngành|major|ngành)[:\s]*([^,;]+)/i);
    if (majorMatch) education.major = majorMatch[1].trim();

    return education;
  }).filter(edu => edu.organization); // Only return entries with organization
};

// Helper function to parse skills data into structured format
const parseSkills = (skillsString: string): CVSkillRequest[] => {
  if (!skillsString) return [];

  // Split by common separators
  const skills = skillsString.split(/[,;|\n]/).filter(skill => skill.trim());

  return skills.map(skill => ({
    skill_name: skill.trim(),
    description: ''
  }));
};

// Helper function to map parsed CV data to CVCreateRequest format
export const mapParsedDataToCVRequest = (parsedData: Record<string, unknown>, existingData?: CVCreateRequest, cvPath?: string): CVCreateRequest => {

  // Parse personal info if it's a string
  const personalInfo = typeof parsedData.personal_info === 'string'
    ? parsePersonalInfo(parsedData.personal_info)
    : {
        birthday: '',
        gender: '',
        email: '',
        phone: '',
        address: ''
      };

  // Handle education data - check if it's already in the correct format
  let educationData: CVEducationRequest[] = [];
  if (parsedData.education && Array.isArray(parsedData.education)) {
    educationData = (parsedData.education as Array<Record<string, unknown>>).map((edu) => ({
      organization: (edu.organization as string) || (edu.school as string) || (edu.university as string) || '',
      degree: (edu.degree as string) || '',
      major: (edu.major as string) || (edu.field_of_study as string) || '',
      graduation_year: (edu.graduation_year as number) || undefined
    }));
  } else if (parsedData.education || parsedData.thong_tin_dao_tao) {
    educationData = parseEducation((parsedData.education as string) || (parsedData.thong_tin_dao_tao as string) || '');
  }

  // Handle courses data - check if it's already in the correct format
  let coursesData: CVCourseRequest[] = [];
  if (parsedData.courses && Array.isArray(parsedData.courses)) {
    coursesData = (parsedData.courses as Array<Record<string, unknown>>).map((course) => ({
      course_name: (course.course_name as string) || (course.name as string) || (course as unknown as string) || '',
      organization: (course.organization as string) || '',
      finish_date: (course.finish_date as string) || (course.date as string) || ''
    }));
  }

  // Handle skills data - check if it's already in the correct format
  let skillsData: CVSkillRequest[] = [];
  if (parsedData.skills && Array.isArray(parsedData.skills)) {
    skillsData = (parsedData.skills as Array<Record<string, unknown>>).map((skill) => ({
      skill_name: (skill.skill_name as string) || (skill.name as string) || (skill as unknown as string) || '',
      description: (skill.description as string) || ''
    }));
  } else if (parsedData.skills || parsedData.thong_tin_ki_nang) {
    skillsData = parseSkills((parsedData.skills as string) || (parsedData.thong_tin_ki_nang as string) || '');
  }

  return {
    full_name: (parsedData.full_name as string) || (parsedData.name as string) || (parsedData.ho_ten as string) || existingData?.full_name || '',
    job_title: (parsedData.job_title as string) || (parsedData.title as string) || (parsedData.position as string) || (parsedData.chuc_danh as string) || existingData?.job_title || '',
    summary: (parsedData.summary as string) || (parsedData.objective as string) || (parsedData.tom_tat as string) || existingData?.summary || '',
    birthday: personalInfo.birthday || (parsedData.birthday as string) || existingData?.birthday || '',
    gender: personalInfo.gender || (parsedData.gender as string) || existingData?.gender || '',
    email: personalInfo.email || (parsedData.email as string) || existingData?.email || '',
    phone: personalInfo.phone || (parsedData.phone as string) || existingData?.phone || '',
    address: personalInfo.address || (parsedData.address as string) || existingData?.address || '',
    cv_path: cvPath || (parsedData.cv_path as string) || existingData?.cv_path || '',
    portrait_path: (parsedData.portrait_path as string) || existingData?.portrait_path || '',
    education: educationData,
    courses: coursesData,
    skills: skillsData
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

// Extended CV Update Request interface for sent requests (includes employee info)
export interface SentCVUpdateRequest extends CVUpdateRequest {
  employee_name: string;
  employee_code: string;
  department: string;
  content?: string;
}

export interface CVUpdateRequestResponse {
  status: string;
  message?: string;
  data: CVUpdateRequest;
}

// Create a CV update request
export const createCVUpdateRequest = async (cvId: string, content?: string): Promise<{ data: CVUpdateRequest; message: string; status?: string }> => {
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
      message: response.data.message || 'Yêu cầu cập nhật CV đã được tạo thành công',
      status: response.data.status // Include the status so components can handle error messages appropriately
    };
  } catch (error) {
    console.error('CV update request error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to create CV update request');
    }
    throw new Error('Failed to create CV update request. Please try again.');
  }
};

// Get CV update requests (received by user)
export const getCVUpdateRequests = async (): Promise<CVUpdateRequest[]> => {
  try {
    setAuthToken(); // Ensure auth token is set
    const response = await axios.get(`${API_URL}/requests`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch CV update requests');
    }
    throw new Error('Failed to fetch CV update requests. Please try again.');
  }
};

// Get CV update requests sent by user
export const getSentCVUpdateRequests = async (): Promise<CVUpdateRequest[]> => {
  try {
    setAuthToken(); // Ensure auth token is set
    const response = await axios.get(`${API_URL}/requests/sent`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch sent CV update requests');
    }
    throw new Error('Failed to fetch sent CV update requests. Please try again.');
  }
};

// Get CV update requests sent by PM (only to users in managed projects)
export const getSentCVUpdateRequestsPM = async (): Promise<SentCVUpdateRequest[]> => {
  try {
    setAuthToken(); // Ensure auth token is set
    const response = await axios.get(`${API_URL}/requests/sent/pm`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch sent CV update requests for PM');
    }
    throw new Error('Failed to fetch sent CV update requests for PM. Please try again.');
  }
};

// Get CV update requests sent by BUL (only to users in same Business Unit)
export const getSentCVUpdateRequestsBUL = async (): Promise<SentCVUpdateRequest[]> => {
  try {
    setAuthToken(); // Ensure auth token is set
    const response = await axios.get(`${API_URL}/requests/sent/bul`);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch sent CV update requests for BUL');
    }
    throw new Error('Failed to fetch sent CV update requests for BUL. Please try again.');
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

// Cancel a CV update request
export const cancelCVUpdateRequest = async (requestId: string): Promise<void> => {
  try {
    setAuthToken(); // Ensure auth token is set
    console.log('Cancelling CV update request:', requestId);
    const response = await axios.put(`${API_URL}/requests/${requestId}/status`, { status: 'Đã huỷ' });
    console.log('Cancel request response:', response.data);
  } catch (error) {
    console.error('Cancel CV update request error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to cancel CV update request');
    }
    throw new Error('Failed to cancel CV update request. Please try again.');
  }
};
