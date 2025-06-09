import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';

const LoadingPage: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag to prevent hydration mismatch
    setIsClient(true);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 12; // Slightly slower for smoother animation
      });
    }, 300);

    // Animate loading dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 600);

    return () => {
      clearInterval(progressInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
      {/* Subtle background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-red-100 rounded-full opacity-30 animate-pulse" style={{animationDelay: '0s'}}></div>
        <div className="absolute bottom-32 right-32 w-24 h-24 bg-green-100 rounded-full opacity-25 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-gray-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-red-50 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Main loading container */}
      <div className="relative z-10 text-center p-8">
        {/* Logo matching landing page style */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 animate-fade-in">
            VDT CV System
          </h1>
        </div>

        {/* Loading message */}
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Đang tải hệ thống{dots}
        </p>

        {/* Modern loading spinner */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-red-200 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Progress bar with clean design */}
        <div className="w-96 max-w-full mx-auto mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-3">
            <span className="font-medium">Tiến độ tải</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out shadow-sm bg-gradient-to-r from-red-500 to-red-600"
              style={{
                width: `${Math.min(progress, 100)}%`
              }}
            >
              <div className="h-full bg-white bg-opacity-30 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Loading status */}
        <div className="text-sm text-gray-500 space-y-1">
          <p className="animate-pulse">Đang khởi tạo ứng dụng...</p>
          {progress > 30 && (
            <p className="animate-fade-in">Đang tải dữ liệu người dùng...</p>
          )}
          {progress > 60 && (
            <p className="animate-fade-in">Đang chuẩn bị giao diện...</p>
          )}
          {progress > 90 && (
            <p className="animate-fade-in text-green-600 font-medium">Hoàn tất!</p>
          )}
        </div>
      </div>

      {/* Floating elements for subtle animation */}
      {isClient && [...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-red-300 rounded-full opacity-40 animate-float"
          style={{
            left: `${(i * 12 + 15) % 85 + 10}%`,
            top: `${(i * 15 + 20) % 70 + 15}%`,
            animationDelay: `${(i % 4) * 0.8}s`,
            animationDuration: `${3 + (i % 2)}s`
          }}
        ></div>
      ))}

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.8s ease-in;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingPage;
