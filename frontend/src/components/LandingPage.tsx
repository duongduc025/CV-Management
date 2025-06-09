import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  const handleLoginClick = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800">
            VDT CV System
          </h1>
        </div>

        {/* Description */}
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Hệ thống quản lý CV chuyên nghiệp
        </p>

        {/* Login Button */}
        <button
          onClick={handleLoginClick}
          className="group bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-red-700 transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Đăng nhập
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}