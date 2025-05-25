import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export interface UploadImageResponse {
  url: string;
  original_name: string;
  size: number;
  width: number;
  height: number;
  aspect_ratio: string;
}

export interface UploadResponse {
  status: string;
  message?: string;
  data: UploadImageResponse;
}

export interface UploadPDFResponse {
  url: string;
  original_name: string;
  size: number;
  content_type: string;
}

export interface ParseCVResponse {
  status: string;
  file_path: string;
  data: any;
}

// Upload CV profile photo (optimized for CV photos)
export const uploadCVPhoto = async (file: File): Promise<UploadImageResponse> => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post(`${API_URL}/upload/cv-photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('CV photo upload error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to upload CV photo');
    }
    throw new Error('Failed to upload CV photo. Please try again.');
  }
};

// Upload PDF file for CV parsing
export const uploadPDFFile = async (file: File): Promise<UploadPDFResponse> => {
  try {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await axios.post(`${API_URL}/upload/pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('PDF upload error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to upload PDF file');
    }
    throw new Error('Failed to upload PDF file. Please try again.');
  }
};



// Parse CV from uploaded file
export const parseCVFromFile = async (fileUrl: string): Promise<ParseCVResponse> => {
  try {
    const response = await axios.post(`${API_URL}/ai/parse-cv`, {
      file_path: fileUrl
    });

    return response.data;
  } catch (error) {
    console.error('CV parsing error:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to parse CV');
    }
    throw new Error('Failed to parse CV. Please try again.');
  }
};

// Upload and parse CV in one function
export const uploadAndParseCV = async (file: File): Promise<any> => {
  try {
    // Step 1: Upload PDF file
    const uploadResult = await uploadPDFFile(file);

    // Step 2: Parse CV from uploaded file
    const parseResult = await parseCVFromFile(uploadResult.url);

    return {
      uploadResult,
      parseResult,
      parsedData: parseResult.data
    };
  } catch (error) {
    console.error('Upload and parse CV error:', error);
    throw error;
  }
};

// Validate image file
export const validateImageFile = (file: File): string | null => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Please select a valid image file (JPG, PNG, GIF, or WebP)';
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return 'File size must be less than 10MB';
  }

  return null; // No validation errors
};

// Validate PDF file
export const validatePDFFile = (file: File): string | null => {
  // Check file type
  if (file.type !== 'application/pdf') {
    return 'Chỉ chấp nhận file PDF để phân tích CV';
  }

  // Check file size (5MB max for CV parsing)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return 'File quá lớn, tối đa 5MB';
  }

  return null; // No validation errors
};
