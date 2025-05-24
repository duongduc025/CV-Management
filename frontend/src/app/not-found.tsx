'use client';

import React, { useState, useEffect } from 'react';

const NotFoundPage: React.FC = () => {
  const [glitchText, setGlitchText] = useState('404');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Glitch effect for 404 text
    const glitchInterval = setInterval(() => {
      const glitchChars = ['4', '0', '4', '█', '▓', '▒', '░'];
      const randomText = Array.from({ length: 3 }, () => 
        glitchChars[Math.floor(Math.random() * glitchChars.length)]
      ).join('');
      
      setGlitchText(randomText);
      
      setTimeout(() => setGlitchText('404'), 100);
    }, 2000);

    // Mouse tracking for interactive effects
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearInterval(glitchInterval);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0">
        <div 
          className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
          style={{
            left: `${mousePosition.x}%`,
            top: `${mousePosition.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        ></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating error symbols */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute text-white opacity-20 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
            fontSize: `${12 + Math.random() * 8}px`
          }}
        >
          {['?', '!', 'X', '/', '*', '#'][Math.floor(Math.random() * 6)]}
        </div>
      ))}

      {/* Main content */}
      <div className="relative z-10 text-center p-8 max-w-2xl">
        {/* 404 Text with glitch effect */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4 animate-pulse font-mono tracking-wider">
            {glitchText}
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-purple-400 to-blue-400 mx-auto animate-pulse"></div>
        </div>

        {/* Error message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-4 animate-fade-in">
            Trang không tìm thấy
          </h2>
          <p className="text-purple-200 text-lg mb-2">
            Có vẻ như bạn đã lạc vào vũ trụ số...
          </p>
          <p className="text-purple-300 text-base">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
        </div>

        {/* Animated broken link icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-400 border-dashed rounded-full flex items-center justify-center animate-spin-slow">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-ping"></div>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
              !
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleGoHome}
            className="group relative px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          >
            <span className="relative z-10">🏠 Về Trang Chủ</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <button
            onClick={handleGoBack}
            className="group relative px-8 py-3 bg-transparent border-2 border-purple-400 rounded-full text-purple-300 font-semibold hover:bg-purple-400 hover:text-white transition-all duration-300 transform hover:scale-105"
          >
            <span className="relative z-10">← Quay Lại</span>
          </button>
        </div>

        {/* Fun suggestions */}
        <div className="mt-12 text-purple-200 text-sm">
          <p className="mb-2">💡 Có thể bạn đang tìm:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-purple-800 bg-opacity-50 rounded-full text-xs hover:bg-opacity-70 cursor-pointer transition-all">
              Trang chủ
            </span>
            <span className="px-3 py-1 bg-purple-800 bg-opacity-50 rounded-full text-xs hover:bg-opacity-70 cursor-pointer transition-all">
              Liên hệ
            </span>
            <span className="px-3 py-1 bg-purple-800 bg-opacity-50 rounded-full text-xs hover:bg-opacity-70 cursor-pointer transition-all">
              Về chúng tôi
            </span>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 animate-pulse"></div>

      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-in;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;