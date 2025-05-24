"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { isEmployee } from '@/services/auth';
import { createOrUpdateCV, getUserCV, type CVCreateRequest, type CV } from '@/services/cv';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import ImageUpload from '@/components/ImageUpload';

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
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [checkingCV, setCheckingCV] = useState(true);

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
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update CV. Please try again.');
    } finally {
      setFormLoading(false);
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
                {/* Status and Edit Button */}
                <div className="flex justify-between items-center mb-6">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    existingCV.status === 'Đã cập nhật'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {existingCV.status}
                  </span>
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

            {/* Edit CV Form */}
            {showCreateForm && (
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit CV
                  </h2>
                  <p className="mt-2 text-gray-600">
                    Update your professional information and CV details.
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