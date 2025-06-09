"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { isEmployee } from '@/services/auth';
import { createOrUpdateCV, getUserCV, mapParsedDataToCVRequest, type CVCreateRequest, type CV, type CVEducationRequest, type CVCourseRequest, type CVSkillRequest } from '@/services/cv';
import { uploadAndParseCV, validatePDFFile } from '@/services/upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';

import { Upload, CheckCircle, Plus, Trash2, ExternalLink } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';

export default function MyCVPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [existingCV, setExistingCV] = useState<CV | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CVCreateRequest>({
    full_name: '',
    job_title: '',
    summary: '',
    birthday: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    cv_path: '',
    portrait_path: '',
    education: [],
    courses: [],
    skills: [], // No default skills since they're optional
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [checkingCV, setCheckingCV] = useState(true);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to convert date from backend format to HTML date input format
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    } catch {
      return '';
    }
  };

  // Helper function to check if CV is empty/uninitialized
  const isCVEmpty = (cv: CV | null): boolean => {
    if (!cv || !cv.details) return true;

    const details = cv.details;

    // Check if all main fields are empty or null
    const mainFieldsEmpty = !details.full_name?.trim() &&
                           !details.job_title?.trim() &&
                           !details.summary?.trim() &&
                           !details.email?.trim() &&
                           !details.phone?.trim() &&
                           !details.address?.trim() &&
                           !details.birthday &&
                           !details.gender?.trim() &&
                           !details.portrait_path?.trim();

    // Check if education array is empty or all entries are empty
    const educationEmpty = !details.education ||
                          details.education.length === 0 ||
                          details.education.every(edu =>
                            !edu.organization?.trim() &&
                            !edu.degree?.trim() &&
                            !edu.major?.trim() &&
                            !edu.graduation_year
                          );

    // Check if courses array is empty or all entries are empty
    const coursesEmpty = !details.courses ||
                        details.courses.length === 0 ||
                        details.courses.every(course =>
                          !course.course_name?.trim() &&
                          !course.organization?.trim() &&
                          !course.finish_date?.trim()
                        );

    // Check if skills array is empty or all entries are empty
    const skillsEmpty = !details.skills ||
                       details.skills.length === 0 ||
                       details.skills.every(skill =>
                         !skill.skill_name?.trim() &&
                         !skill.description?.trim()
                       );

    return mainFieldsEmpty && educationEmpty && coursesEmpty && skillsEmpty;
  };

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
      } catch {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (imageUrl: string | null) => {
    setFormData(prev => ({
      ...prev,
      portrait_path: imageUrl || ''
    }));
  };

  // Education management functions
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...(prev.education || []), { organization: '', degree: '', major: '', graduation_year: undefined }]
    }));
  };

  const updateEducation = (index: number, field: keyof CVEducationRequest, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      education: (prev.education || []).map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index)
    }));
  };

  // Course management functions
  const addCourse = () => {
    setFormData(prev => ({
      ...prev,
      courses: [...(prev.courses || []), { course_name: '', organization: '', finish_date: '' }]
    }));
  };

  const updateCourse = (index: number, field: keyof CVCourseRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      courses: (prev.courses || []).map((course, i) =>
        i === index ? { ...course, [field]: value } : course
      )
    }));
  };

  const removeCourse = (index: number) => {
    setFormData(prev => ({
      ...prev,
      courses: (prev.courses || []).filter((_, i) => i !== index)
    }));
  };

  // Skill management functions
  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skills: [...(prev.skills || []), { skill_name: '', description: '' }]
    }));
  };

  const updateSkill = (index: number, field: keyof CVSkillRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).map((skill, i) =>
        i === index ? { ...skill, [field]: value } : skill
      )
    }));
  };

  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter((_, i) => i !== index)
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors([]);
    setFormLoading(true);

    // Filter out empty entries before submitting (no validation, just cleanup)
    const cleanedFormData = {
      ...formData,
      education: (formData.education || []).filter(edu => edu.organization.trim() !== ''),
      courses: (formData.courses || []).filter(course => course.course_name.trim() !== ''),
      skills: (formData.skills || []).filter(skill => skill.skill_name.trim() !== '')
    };

    try {
      const response = await createOrUpdateCV(cleanedFormData);
      // The response.data contains {cv: ..., details: ...}, we need to merge them properly
      const cvData: CV = {
        ...response.data.cv,
        details: response.data.details
      };
      setExistingCV(cvData);

      // Check the response message to determine the type of notification
      if (response.message === "Bạn cần cập nhật thêm các trường yêu cầu") {
        // Show yellow warning toast for incomplete CV
        toast.warning(response.message, {
          description: "Vui lòng điền đầy đủ thông tin cá nhân, học vấn và kỹ năng để hoàn thành CV.",
          duration: 5000,
        });
        setSuccess(false);
        setSuccessMessage('');
      } else {
        // Show success notification for complete CV
        toast.success(response.message || 'CV đã được cập nhật thành công!');
        setSuccess(true);
        setSuccessMessage(response.message || 'CV đã được cập nhật thành công!');
      }

      setShowCreateForm(false);

      // Reset form
      setFormData({
        full_name: '',
        job_title: '',
        summary: '',
        birthday: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        cv_path: '',
        portrait_path: '',
        education: [],
        courses: [],
        skills: [], // No default skills
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật CV. Vui lòng thử lại.';
      setError(errorMessage);
      toast.error(errorMessage);
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
      if (result.parsedData) {
        try {
          const mappedData = mapParsedDataToCVRequest(result.parsedData, formData, result.uploadResult.url);

          // Check if we got any meaningful data
          const hasData = mappedData.full_name || mappedData.job_title || mappedData.summary ||
                         mappedData.email || mappedData.phone ||
                         (mappedData.education && mappedData.education.length > 0) ||
                         (mappedData.skills && mappedData.skills.length > 0);

          if (hasData) {
            setFormData(mappedData);
            setSuccess(true);
            setSuccessMessage('CV đã được phân tích và điền vào form thành công!');
          } else {
            setError('CV đã được phân tích nhưng không tìm thấy thông tin hữu ích. Vui lòng kiểm tra định dạng CV và thử lại.');
            // Still set the CV path for reference
            setFormData(prev => ({
              ...prev,
              cv_path: result.uploadResult.url
            }));
          }
        } catch (mappingError) {
          console.error('Error mapping parsed data:', mappingError);
          setError('Có lỗi khi xử lý dữ liệu CV đã phân tích. Vui lòng thử lại.');
          // Still set the CV path for reference
          setFormData(prev => ({
            ...prev,
            cv_path: result.uploadResult.url
          }));
        }
      } else {
        setError('Không thể phân tích thông tin từ CV. Vui lòng kiểm tra file và thử lại.');
        // Still set the CV path for reference if upload was successful
        if (result.uploadResult?.url) {
          setFormData(prev => ({
            ...prev,
            cv_path: result.uploadResult.url
          }));
        }
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
        <p className="text-lg">Đang tải...</p>
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
              <h1 className="text-xl font-bold text-gray-900">CV của tôi</h1>
              <p className="mt-2 text-gray-600">
                Quản lý sơ yếu lý lịch và thông tin nghề nghiệp của bạn.
              </p>
              <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push('/employee/dashboard')}
              >
                ← Trở về
              </Button>
            </div>
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
                    {validationErrors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {validationErrors.map((validationError, index) => (
                          <li key={index}>{validationError}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Existing CV Display */}
            {existingCV && !showCreateForm && (
              <div className="max-w-4xl mx-auto bg-white shadow-2xl border border-gray-200">
                {/* CV Header Section */}
                <div className="bg-white border-b border-red-100 px-8 pt-6 pb-4">
                  {/* Last Updated Information */}
                  {existingCV.updater_name && existingCV.last_updated_at && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-semibold text-red-700">Thông tin cập nhật</span>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>
                          <span className="font-medium">Cập nhật bởi:</span> {existingCV.updater_name} - {existingCV.updater_employee_code}
                        </div>
                        <div>
                          <span className="font-medium">Thời gian:</span> {new Date(existingCV.last_updated_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status and Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                        existingCV.status === 'Đã cập nhật'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          existingCV.status === 'Đã cập nhật' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        {existingCV.status}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {/* View Original CV Button */}
                      {existingCV.details?.cv_path && (
                        <Button
                          onClick={() => window.open(existingCV.details?.cv_path || '', '_blank')}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
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
                              full_name: existingCV.details.full_name || '',
                              job_title: existingCV.details.job_title || '',
                              summary: existingCV.details.summary || '',
                              birthday: formatDateForInput(existingCV.details.birthday),
                              gender: existingCV.details.gender || '',
                              email: existingCV.details.email || '',
                              phone: existingCV.details.phone || '',
                              address: existingCV.details.address || '',
                              cv_path: existingCV.details.cv_path || '',
                              portrait_path: existingCV.details.portrait_path || '',
                              education: existingCV.details.education || [],
                              courses: (existingCV.details.courses || []).map(course => ({
                                ...course,
                                finish_date: formatDateForInput(course.finish_date)
                              })),
                              skills: existingCV.details.skills || [],
                            });
                          }
                          setShowCreateForm(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white border-0 transition-colors"
                        size="sm"
                      >
                        Cập nhật CV
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Check if CV is empty and show appropriate message */}
                {isCVEmpty(existingCV) ? (
                  <div className="p-8 text-center">
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12">
                      <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa khởi tạo CV</h3>
                      <p className="text-gray-500 mb-6">
                        CV của bạn chưa có thông tin. Vui lòng cập nhật thông tin để hoàn thiện CV.
                      </p>
                      <Button
                        onClick={() => {
                          setShowCreateForm(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Bắt đầu tạo CV
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header with Red Accent */}
                    <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-white">
                      <div className="text-center text-2xl font-bold mb-6 tracking-wider">
                        SƠ YẾU LÝ LỊCH
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        {/* Profile Image - First 1/3 */}
                        <div className="col-span-1">
                          {existingCV.details?.portrait_path ? (
                            <Image
                              src={existingCV.details.portrait_path}
                              alt="Profile photo"
                              width={96}
                              height={128}
                              className="w-24 h-32 object-cover border-4 border-white rounded shadow-lg"
                            />
                          ) : (
                            <div className="w-24 h-32 border-4 border-white border-dashed rounded flex items-center justify-center text-white text-xs font-medium bg-red-500/20">
                              Ảnh chân<br />dung
                            </div>
                          )}
                        </div>

                        {/* Name and Title - Remaining 2/3 (Center aligned) */}
                        <div className="col-span-2 flex flex-col justify-center items-center">
                          <div className="bg-white text-red-700 px-4 py-2 mb-3 rounded shadow-lg">
                            <h1 className="text-xl font-bold">{existingCV.details?.full_name}</h1>
                          </div>
                          <div className="text-red-100 text-base font-medium">{existingCV.details?.job_title}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      {existingCV.details && (
                        <>
                          {/* Summary Section */}
                          <div className="mb-10">
                            <h2 className="text-xl font-bold text-red-700 mb-4 flex items-center">
                              <div className="w-1 h-6 bg-red-600 mr-3"></div>
                              TÓM TẮT
                            </h2>
                            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {existingCV.details.summary}
                              </p>
                            </div>
                          </div>

                          {/* General Information Section */}
                          <div className="mb-10">
                            <h2 className="text-xl font-bold text-red-700 mb-6 flex items-center">
                              <div className="w-1 h-6 bg-red-600 mr-3"></div>
                              THÔNG TIN CHUNG
                            </h2>

                            <div className="grid grid-cols-2 gap-12 mb-6">
                              <div>
                                <h3 className="text-sm font-semibold text-black mb-3">Thông tin cá nhân</h3>
                                <div className="bg-red-50 border-l-4 border-red-600 px-3 py-2 text-sm text-black">
                                  {existingCV.details.full_name && <div><span className="font-bold">Họ và tên:</span> {existingCV.details.full_name}</div>}
                                  {existingCV.details.email && <div><span className="font-bold">Email:</span> {existingCV.details.email}</div>}
                                  {existingCV.details.phone && <div><span className="font-bold">SĐT:</span> {existingCV.details.phone}</div>}
                                  {existingCV.details.birthday && <div><span className="font-bold">Ngày sinh:</span> {new Date(existingCV.details.birthday).toLocaleDateString('vi-VN')}</div>}
                                  {existingCV.details.gender && <div><span className="font-bold">Giới tính:</span> {existingCV.details.gender}</div>}
                                  {existingCV.details.address && <div><span className="font-bold">Địa chỉ:</span> {existingCV.details.address}</div>}
                                </div>
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-black mb-3">Đào tạo</h3>
                                {existingCV.details.education && existingCV.details.education.length > 0 ? (
                                  existingCV.details.education.map((edu, index) => (
                                    <div key={index} className="bg-red-50 border-l-4 border-red-600 px-3 py-2 text-sm text-black mb-3">
                                      <div className="font-bold">{edu.organization}</div>
                                      {edu.degree && <div>{edu.degree}</div>}
                                      {edu.major && <div><span className="font-bold">Chuyên ngành:</span> {edu.major}</div>}
                                      {edu.graduation_year && <div><span className="font-bold">Năm tốt nghiệp:</span> {edu.graduation_year}</div>}
                                    </div>
                                  ))
                                ) : (
                                  <div className="bg-red-50 border-l-4 border-red-600 px-3 py-2 text-sm text-black">

                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Courses */}
                            {existingCV.details.courses && existingCV.details.courses.length > 0 && (
                              <div className="mt-8">
                                <h3 className="text-lg font-semibold text-red-600 mb-4">
                                  Khóa học đã tham gia
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {existingCV.details.courses.map((course, index) => (
                                    <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                      <div className="font-bold text-red-700">{course.course_name}</div>
                                      {course.organization && (
                                        <div className="text-gray-600"><span className="font-bold">Tổ chức:</span> {course.organization}</div>
                                      )}
                                      {course.finish_date && (
                                        <div className="text-gray-600">
                                          <span className="font-bold">Hoàn thành:</span> {new Date(course.finish_date).toLocaleDateString('vi-VN')}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Skills Section */}
                          <div className="mb-8">
                            <h2 className="text-xl font-bold text-red-700 mb-6 flex items-center">
                              <div className="w-1 h-6 bg-red-600 mr-3"></div>
                              KỸ NĂNG
                            </h2>
                            <div className="space-y-3">
                              {existingCV.details.skills && existingCV.details.skills.length > 0 ? (
                                existingCV.details.skills.map((skill, index) => (
                                  <div key={index} className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                                      <div className="text-sm text-red-700">
                                    <span className="font-bold">{skill.skill_name}</span>
                                    {skill.description && (
                                      <span className="text-gray-600">: {skill.description}</span>
                                    )}
                                  </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-gray-500 italic text-center py-8">

                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="bg-red-600 p-4 text-center">
                      <div className="text-white text-sm">
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
                        Tải lên CV để tự động điền thông tin
                      </h2>
                      <p className="mt-2 text-gray-600">
                        Tải lên CV hiện tại của bạn ở định dạng PDF để tự động điền vào các trường thông tin bên dưới.
                      </p>
                    </div>
                    {/* Note: CV path handling would need to be implemented differently */}
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
                <div className="mb-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Thông tin CV
                  </h2>
                  <p className="mt-2 text-gray-600">
                    Điền thông tin CV của bạn thủ công hoặc sử dụng tính năng tải lên ở trên để tự động điền.
                    Những trường có <span className="text-red-500">*</span> là những trường thông tin bắt buộc.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập họ và tên của bạn"
                    />
                  </div>

                  <div>
                    <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-2">
                      Chức danh <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="job_title"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ví dụ: Kỹ sư phần mềm, Nhà phân tích dữ liệu"
                    />
                  </div>

                  <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
                      Tóm tắt <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="summary"
                      name="summary"
                      value={formData.summary}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mô tả ngắn gọn về kinh nghiệm và mục tiêu nghề nghiệp của bạn"
                    />
                  </div>

                  {/* Personal Information Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0912345678"
                      />
                    </div>

                    {/* Birthday */}
                    <div>
                      <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
                        Ngày sinh <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="birthday"
                        name="birthday"
                        value={formData.birthday}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                        Giới tính <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Địa chỉ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Địa chỉ hiện tại của bạn"
                    />
                  </div>

                  {/* Portrait Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ảnh chân dung
                    </label>
                    <ImageUpload
                      currentImageUrl={formData.portrait_path}
                      onImageChange={handleImageChange}
                      disabled={formLoading}
                    />
                  </div>



                  {/* Education Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Thông tin đào tạo <span className="text-red-500">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEducation}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm đào tạo
                      </Button>
                    </div>

                    {(formData.education || []).map((edu, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-sm font-medium text-gray-800">Đào tạo {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEducation(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Tổ chức/Trường
                            </label>
                            <input
                              type="text"
                              value={edu.organization}
                              onChange={(e) => updateEducation(index, 'organization', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tên trường/tổ chức"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Bằng cấp
                            </label>
                            <input
                              type="text"
                              value={edu.degree || ''}
                              onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Cử nhân, Thạc sĩ, v.v."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Chuyên ngành
                            </label>
                            <input
                              type="text"
                              value={edu.major || ''}
                              onChange={(e) => updateEducation(index, 'major', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Công nghệ thông tin, Kinh tế, v.v."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Năm tốt nghiệp
                            </label>
                            <input
                              type="number"
                              value={edu.graduation_year || ''}
                              onChange={(e) => updateEducation(index, 'graduation_year', e.target.value ? parseInt(e.target.value) : undefined)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="2024"
                              min="1950"
                              max="2030"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!formData.education || formData.education.length === 0) && (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-md">
                        <p className="text-sm"></p>
                        <p className="text-xs mt-1">Nhấn &quot;Thêm đào tạo&quot; để bắt đầu</p>
                      </div>
                    )}
                  </div>

                  {/* Courses Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Thông tin khóa học
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCourse}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm khóa học
                      </Button>
                    </div>

                    {(formData.courses || []).map((course, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-sm font-medium text-gray-800">Khóa học {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCourse(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Tên khóa học
                            </label>
                            <input
                              type="text"
                              value={course.course_name}
                              onChange={(e) => updateCourse(index, 'course_name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tên khóa học"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Tổ chức
                            </label>
                            <input
                              type="text"
                              value={course.organization || ''}
                              onChange={(e) => updateCourse(index, 'organization', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tổ chức đào tạo"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Ngày hoàn thành
                            </label>
                            <input
                              type="date"
                              value={course.finish_date || ''}
                              onChange={(e) => updateCourse(index, 'finish_date', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!formData.courses || formData.courses.length === 0) && (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-md">
                        <p className="text-sm">Chưa có thông tin khóa học</p>
                        <p className="text-xs mt-1">Nhấn &quot;Thêm khóa học&quot; để bắt đầu</p>
                      </div>
                    )}
                  </div>

                  {/* Skills Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Thông tin kỹ năng <span className="text-red-500">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSkill}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm kỹ năng
                      </Button>
                    </div>

                    {(formData.skills || []).map((skill, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-sm font-medium text-gray-800">Kỹ năng {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSkill(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Tên kỹ năng
                            </label>
                            <input
                              type="text"
                              value={skill.skill_name}
                              onChange={(e) => updateSkill(index, 'skill_name', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="JavaScript, Project Management, v.v."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Mô tả
                            </label>
                            <input
                              type="text"
                              value={skill.description || ''}
                              onChange={(e) => updateSkill(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Mức độ thành thạo, kinh nghiệm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!formData.skills || formData.skills.length === 0) && (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-md">
                        <p className="text-sm"></p>
                        <p className="text-xs mt-1">Nhấn &quot;Thêm kỹ năng&quot; để bắt đầu</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1"
                    >
                      {formLoading ? 'Đang lưu...' : 'Cập nhật CV'}
                    </Button>

                    {existingCV && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                        className="flex-1"
                      >
                        Hủy
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Hoàn thành CV của bạn</h3>
                <p className="text-gray-600 mb-6">
                  Hồ sơ CV của bạn đã được tạo. Vui lòng điền thông tin nghề nghiệp để hoàn thành.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Hoàn thành CV của tôi
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}