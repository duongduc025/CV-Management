"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { isEmployee } from '@/services/auth';
import { createOrUpdateCV, getUserCV, mapParsedDataToCVRequest, type CVCreateRequest, type CV } from '@/services/cv';
import { uploadAndParseCV, validatePDFFile } from '@/services/upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import ImageUpload from '@/components/ImageUpload';
import { Upload, CheckCircle, ExternalLink } from 'lucide-react';

export default function MyCVPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [existingCV, setExistingCV] = useState<CV | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CVCreateRequest>({
    ho_ten: '',
    chuc_danh: '',
    anh_chan_dung: '',
    tom_tat: '',
    thong_tin_ca_nhan: '',
    thong_tin_dao_tao: '',
    thong_tin_khoa_hoc: '',
    thong_tin_ki_nang: '',
    cv_path: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [checkingCV, setCheckingCV] = useState(true);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // If user is loaded but doesn't have Employee access, redirect to main dashboard
    if (!loading && user && !isEmployee(user)) {
      router.push('/dashboard');
      return;
    }
  }, [loading, user, router]);

  useEffect(() => {
    // Check if user already has a CV
    const checkExistingCV = async () => {
      if (!user) return;

      try {
        setCheckingCV(true);
        const cv = await getUserCV();
        setExistingCV(cv);
        setShowCreateForm(false);
      } catch (error) {
        // If CV doesn't exist, show create form
        console.log('No existing CV found, showing create form');
        setExistingCV(null);
        setShowCreateForm(true);
      } finally {
        setCheckingCV(false);
      }
    };

    if (user && isEmployee(user)) {
      checkExistingCV();
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (imageUrl: string | null) => {
    setFormData(prev => ({
      ...prev,
      anh_chan_dung: imageUrl || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    try {
      const savedCV = await createOrUpdateCV(formData);
      setExistingCV(savedCV);
      setSuccess(true);
      setSuccessMessage('CV updated successfully!');
      setShowCreateForm(false);

      // Reset form
      setFormData({
        ho_ten: '',
        chuc_danh: '',
        anh_chan_dung: '',
        tom_tat: '',
        thong_tin_ca_nhan: '',
        thong_tin_dao_tao: '',
        thong_tin_khoa_hoc: '',
        thong_tin_ki_nang: '',
        cv_path: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update CV. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate PDF file using service function
      const validationError = validatePDFFile(file);
      if (validationError) {
        setError(validationError);
        setCvFile(null);
        return;
      }

      setCvFile(file);
      setError('');
      setSuccess(false); // Reset success state
      setSuccessMessage('');
    }
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Validate PDF file using service function
      const validationError = validatePDFFile(file);
      if (validationError) {
        setError(validationError);
        setCvFile(null);
        return;
      }

      setCvFile(file);
      setError('');
      setSuccess(false); // Reset success state
      setSuccessMessage('');
    }
  };

  // Handle upload and parse CV using service
  const handleUploadAndParse = async () => {
    if (!cvFile) {
      setError('Vui lòng chọn file PDF trước');
      return;
    }

    setUploadLoading(true);
    setError('');

    try {
      // Step 1: Upload and parse CV using service
      setSuccessMessage('Đang tải file lên server...');
      setParseLoading(true);
      setSuccessMessage('Đang phân tích CV...');

      const result = await uploadAndParseCV(cvFile);

      // Step 2: Populate form with parsed data
      if (result.parsedData && result.parsedData.data) {
        const mappedData = mapParsedDataToCVRequest(result.parsedData.data, formData, result.uploadResult.url);
        setFormData(mappedData);

        setSuccess(true);
        setSuccessMessage('CV đã được phân tích và điền vào form thành công!');
      } else {
        setError('Không thể phân tích thông tin từ CV. Vui lòng kiểm tra file và thử lại.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý CV');
    } finally {
      setUploadLoading(false);
      setParseLoading(false);
    }
  };

  if (loading || checkingCV) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSwitcherNavbar />

      <main>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My CV</h1>
              <p className="mt-2 text-gray-600">
                Manage your curriculum vitae and professional information.
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      {successMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Existing CV Display */}
            {existingCV && !showCreateForm && (
              <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
                {/* Status and Action Buttons */}
                <div className="flex justify-between items-center mb-6">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    existingCV.status === 'Đã cập nhật'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {existingCV.status}
                  </span>
                  <div className="flex gap-2">
                    {/* View Original CV Button */}
                    {existingCV.details?.cv_path && (
                      <Button
                        onClick={() => window.open(existingCV.details?.cv_path || '', '_blank')}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Xem CV gốc
                      </Button>
                    )}
                    {/* Edit CV Button */}
                    <Button
                      onClick={() => {
                        // Pre-populate form with existing CV data
                        if (existingCV?.details) {
                          setFormData({
                            ho_ten: existingCV.details.ho_ten || '',
                            chuc_danh: existingCV.details.chuc_danh || '',
                            anh_chan_dung: existingCV.details.anh_chan_dung || '',
                            tom_tat: existingCV.details.tom_tat || '',
                            thong_tin_ca_nhan: existingCV.details.thong_tin_ca_nhan || '',
                            thong_tin_dao_tao: existingCV.details.thong_tin_dao_tao || '',
                            thong_tin_khoa_hoc: existingCV.details.thong_tin_khoa_hoc || '',
                            thong_tin_ki_nang: existingCV.details.thong_tin_ki_nang || '',
                            cv_path: existingCV.details.cv_path || '',
                          });
                        }
                        setShowCreateForm(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cập nhật CV
                    </Button>
                  </div>
                </div>

                {existingCV.details && (
                  <>
                    {/* Header */}
                    <div className="mb-10">
                      <div className="text-left text-sm text-gray-500 mb-6">SƠ YẾU LÝ LỊCH</div>

                      <div className="grid grid-cols-3 gap-6">
                        {/* Profile Image - First 1/3 */}
                        <div className="col-span-1">
                          {existingCV.details.anh_chan_dung ? (
                            <img
                              src={existingCV.details.anh_chan_dung}
                              alt="Profile photo"
                              className="w-24 h-32 object-cover border-2 border-gray-300 rounded"
                            />
                          ) : (
                            <div className="w-24 h-32 border-2 border-gray-300 flex items-center justify-center text-gray-500 text-xs">
                              Ảnh chân<br />dung
                            </div>
                          )}
                        </div>

                        {/* Name and Title - Remaining 2/3 (Center aligned) */}
                        <div className="col-span-2 flex flex-col justify-center items-center">
                          <div className="bg-yellow-300 px-4 py-2 mb-3">
                            <h1 className="text-xl font-bold text-black">{existingCV.details.ho_ten}</h1>
                          </div>
                          <div className="text-red-500 text-base font-medium">{existingCV.details.chuc_danh}</div>
                        </div>
                      </div>
                    </div>

                    {/* TÓM TẮT Section */}
                    <div className="mb-10">
                      <h2 className="text-lg font-bold text-black mb-4 border-b border-gray-400 pb-2">TÓM TẮT</h2>
                      <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                        {existingCV.details.tom_tat}
                      </div>
                    </div>

                    {/* THÔNG TIN CHUNG Section */}
                    <div className="mb-10">
                      <h2 className="text-lg font-bold text-black mb-4 border-b border-gray-400 pb-2">THÔNG TIN CHUNG</h2>

                      <div className="grid grid-cols-2 gap-12 mb-6">
                        <div>
                          <h3 className="text-sm font-semibold text-black mb-3">Thông tin cá nhân</h3>
                          <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                            {existingCV.details.thong_tin_ca_nhan}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-black mb-3">Đào tạo</h3>
                          <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                            {existingCV.details.thong_tin_dao_tao}
                          </div>
                        </div>
                      </div>

                      {existingCV.details.thong_tin_khoa_hoc && (
                        <div className="mb-4">
                          <div className="text-sm text-black mb-2">Thông tin khóa học đã tham gia:</div>
                          <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                            {existingCV.details.thong_tin_khoa_hoc}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* KỸ NĂNG Section */}
                    <div className="mb-8">
                      <h2 className="text-lg font-bold text-black mb-4 border-b border-gray-400 pb-2">KỸ NĂNG</h2>
                      <div className="bg-yellow-300 inline-block px-3 py-2 text-sm font-medium text-black whitespace-pre-line">
                        {existingCV.details.thong_tin_ki_nang}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CV Upload Section - Separate Card */}
            {showCreateForm && (
              <Card className="p-6 mb-6">
                <div className="mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Upload CV for Auto-Fill
                      </h2>
                      <p className="mt-2 text-gray-600">
                        Upload your existing CV in PDF format to automatically populate the form fields below.
                      </p>
                    </div>
                    {/* Show current CV link if exists */}
                    {formData.cv_path && (
                      <Button
                        onClick={() => window.open(formData.cv_path || '', '_blank')}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        CV hiện tại
                      </Button>
                    )}
                  </div>
                </div>

                {/* CV Upload Area */}
                <div className="mb-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50 transition-colors flex flex-col items-center justify-center min-h-[120px] ${
                      error ? 'border-red-300' : 'border-blue-300'
                    }`}
                    onClick={!uploadLoading && !parseLoading ? handleUploadAreaClick : undefined}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileChange}
                    />

                    {uploadLoading || parseLoading ? (
                      <>
                        <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm font-medium">
                          {uploadLoading ? 'Đang tải file lên...' : 'Đang phân tích CV...'}
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className={`h-8 w-8 mx-auto mb-2 ${error ? 'text-red-500' : 'text-blue-500'}`} />
                        <p className="text-sm font-medium mb-1">
                          {cvFile ? cvFile.name : 'Kéo và thả hoặc click để chọn file PDF'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Chỉ hỗ trợ file PDF, tối đa 10MB
                        </p>
                        {cvFile && (
                          <div className="mt-2 py-1 px-2 bg-green-100 text-green-800 rounded-full text-xs font-semibold inline-flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" /> File đã chọn
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Upload and Parse Button */}
                  {cvFile && !uploadLoading && !parseLoading && (
                    <div className="mt-4 text-center">
                      <Button
                        onClick={handleUploadAndParse}
                        disabled={uploadLoading || parseLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Tải lên và Phân tích CV
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Edit CV Form - Separate Card */}
            {showCreateForm && (
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    CV Information
                  </h2>
                  <p className="mt-2 text-gray-600">
                    Fill in your professional information manually or use the upload feature above to auto-populate these fields.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="ho_ten" className="block text-sm font-medium text-gray-700 mb-2">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      id="ho_ten"
                      name="ho_ten"
                      value={formData.ho_ten}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập họ và tên của bạn"
                    />
                  </div>

                  <div>
                    <label htmlFor="chuc_danh" className="block text-sm font-medium text-gray-700 mb-2">
                      Chức danh *
                    </label>
                    <input
                      type="text"
                      id="chuc_danh"
                      name="chuc_danh"
                      value={formData.chuc_danh}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ví dụ: Kỹ sư phần mềm, Nhà phân tích dữ liệu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ảnh chân dung
                    </label>
                    <ImageUpload
                      currentImageUrl={formData.anh_chan_dung}
                      onImageChange={handleImageChange}
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="tom_tat" className="block text-sm font-medium text-gray-700 mb-2">
                      Tóm tắt *
                    </label>
                    <textarea
                      id="tom_tat"
                      name="tom_tat"
                      value={formData.tom_tat}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mô tả ngắn gọn về kinh nghiệm và mục tiêu nghề nghiệp của bạn"
                    />
                  </div>

                  <div>
                    <label htmlFor="thong_tin_ca_nhan" className="block text-sm font-medium text-gray-700 mb-2">
                      Thông tin cá nhân *
                    </label>
                    <textarea
                      id="thong_tin_ca_nhan"
                      name="thong_tin_ca_nhan"
                      value={formData.thong_tin_ca_nhan}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email, số điện thoại, địa chỉ, ngày sinh, v.v."
                    />
                  </div>

                  <div>
                    <label htmlFor="thong_tin_dao_tao" className="block text-sm font-medium text-gray-700 mb-2">
                      Thông tin đào tạo *
                    </label>
                    <textarea
                      id="thong_tin_dao_tao"
                      name="thong_tin_dao_tao"
                      value={formData.thong_tin_dao_tao}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Trường đại học, bằng cấp, năm tốt nghiệp, v.v."
                    />
                  </div>

                  <div>
                    <label htmlFor="thong_tin_khoa_hoc" className="block text-sm font-medium text-gray-700 mb-2">
                      Thông tin khóa học
                    </label>
                    <textarea
                      id="thong_tin_khoa_hoc"
                      name="thong_tin_khoa_hoc"
                      value={formData.thong_tin_khoa_hoc}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Các chứng chỉ, khóa học bổ sung, v.v."
                    />
                  </div>

                  <div>
                    <label htmlFor="thong_tin_ki_nang" className="block text-sm font-medium text-gray-700 mb-2">
                      Thông tin kỹ năng *
                    </label>
                    <textarea
                      id="thong_tin_ki_nang"
                      name="thong_tin_ki_nang"
                      value={formData.thong_tin_ki_nang}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ngôn ngữ lập trình, công nghệ, kỹ năng mềm, v.v."
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1"
                    >
                      {formLoading ? 'Saving...' : 'Update CV'}
                    </Button>

                    {existingCV && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Card>
            )}

            {/* Show message if CV exists but has no details */}
            {!existingCV && !showCreateForm && !checkingCV && (
              <Card className="p-8 text-center">
                <div className="mb-6">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Your CV</h3>
                <p className="text-gray-600 mb-6">
                  Your CV profile has been created. Please fill in your professional information to complete it.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Complete My CV
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}