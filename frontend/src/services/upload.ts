import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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
