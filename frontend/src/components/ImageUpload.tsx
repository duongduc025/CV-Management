"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadCVPhoto, validateImageFile } from '@/services/upload';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({
  currentImageUrl,
  onImageChange,
  disabled = false,
  className = ""
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload file
      const uploadResult = await uploadCVPhoto(file);

      // Clean up object URL
      URL.revokeObjectURL(objectUrl);

      // Update with actual uploaded URL
      setPreviewUrl(uploadResult.url);
      onImageChange(uploadResult.url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image Preview */}
      <div className="flex justify-center">
        <div className="relative">
          {previewUrl ? (
            <div className="relative group">
              <Image
                src={previewUrl}
                alt="Profile photo"
                width={128}
                height={160}
                className="w-32 h-40 object-cover border-2 border-gray-300 rounded-lg shadow-sm"
              />
              {!disabled && (
                <div className="absolute inset-0  bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={triggerFileSelect}
                    disabled={uploading}
                    className="text-xs"
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div
              className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-gray-400 transition-colors"
              onClick={!disabled ? triggerFileSelect : undefined}
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-xs text-center">
                Ảnh chân<br />dung
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      {!previewUrl && !disabled && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={triggerFileSelect}
            disabled={uploading}
            className="text-sm"
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Status */}
      {uploading && (
        <div className="text-center">
          <div className="inline-flex items-center text-sm text-blue-600">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading image...
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Help Text */}
      {!disabled && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Supported formats: JPG, PNG, GIF, WebP (max 10MB)
            <br />
            Recommended: 3:4 aspect ratio for best results
          </p>
        </div>
      )}
    </div>
  );
}
