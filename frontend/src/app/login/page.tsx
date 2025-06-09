"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login } from '@/services/auth';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Eye, EyeOff, User, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    console.log('Login page useEffect', authLoading, user);
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is logged in, they will be redirected by useEffect
  if (user) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData);

      // Update the user state in AuthProvider
      if (response.status === 'success') {
        const userData = {
          id: response.data.id,
          employee_code: response.data.employee_code,
          full_name: response.data.full_name,
          email: response.data.email,
          departmentId: response.data.department_id,
          department: response.data.department,
          roles: response.data.roles,
        };
        setUser(userData);

        // Navigate to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Network Background */}
      <div className="absolute inset-0 opacity-20">
        {/* Network Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(220, 38, 38, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220, 38, 38, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-move 20s linear infinite'
        }} />

        {/* Floating Network Nodes */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <div className="absolute top-32 right-20 w-3 h-3 bg-red-300 rounded-full animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute bottom-20 left-32 w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '2s'}} />
        <div className="absolute bottom-40 right-10 w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}} />
        <div className="absolute top-1/2 left-20 w-1 h-1 bg-red-300 rounded-full animate-pulse" style={{animationDelay: '1.5s'}} />
        <div className="absolute top-1/4 right-1/3 w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '2.5s'}} />

        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(220, 38, 38, 0.3)" />
              <stop offset="100%" stopColor="rgba(220, 38, 38, 0.1)" />
            </linearGradient>
          </defs>
          <path d="M 50 50 Q 200 100 350 150" stroke="url(#lineGradient)" strokeWidth="1" fill="none" opacity="0.5">
            <animate attributeName="stroke-dasharray" values="0 100;50 50;100 0" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M 100 200 Q 300 150 500 300" stroke="url(#lineGradient)" strokeWidth="1" fill="none" opacity="0.3">
            <animate attributeName="stroke-dasharray" values="0 100;50 50;100 0" dur="4s" repeatCount="indefinite" />
          </path>
          <path d="M 200 100 Q 400 200 600 50" stroke="url(#lineGradient)" strokeWidth="1" fill="none" opacity="0.4">
            <animate attributeName="stroke-dasharray" values="0 100;50 50;100 0" dur="5s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>

      {/* Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 -left-10 w-32 h-32 border border-red-500/20 rounded-full animate-spin" style={{animationDuration: '20s'}} />
        <div className="absolute bottom-20 -right-10 w-40 h-40 border border-red-400/15 rounded-full animate-spin" style={{animationDuration: '25s', animationDirection: 'reverse'}} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 border border-red-300/10 rotate-45 animate-pulse" />
      </div>

      {/* Subtle Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>

      {/* Login Container */}
      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 px-8 py-6 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Image
                src="/logo.png"
                alt="Viettel Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">Viettel Software</h1>
            <p className="text-red-100 text-sm mt-1">CV Management System</p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="example@viettel.com.vn"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Nhập mật khẩu"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-red-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}