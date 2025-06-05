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
    <div className="min-h-screen bg-gradient-to-br from-brand-gray via-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0">
        <div
          className="absolute w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
          style={{
            left: `${mousePosition.x}%`,
            top: `${mousePosition.y}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#E60012'
          }}
        ></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000" style={{backgroundColor: '#83C21E'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gray-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
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
          <h1 className="text-9xl font-bold text-transparent bg-clip-text mb-4 animate-pulse font-mono tracking-wider" style={{backgroundImage: 'linear-gradient(to right, #E60012, #83C21E)'}}>
            {glitchText}
          </h1>
          <div className="h-1 w-32 mx-auto animate-pulse" style={{background: 'linear-gradient(to right, #E60012, #83C21E)'}}></div>
        </div>

        {/* Error message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-4 animate-fade-in">
            Trang không tìm thấy
          </h2>
          <p className="text-gray-300 text-lg mb-2">
            Có vẻ như bạn đã lạc vào vũ trụ số...
          </p>
          <p className="text-gray-400 text-base">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
        </div>

        {/* Animated broken link icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-dashed rounded-full flex items-center justify-center animate-spin-slow" style={{borderColor: '#E60012'}}>
              <div className="w-8 h-8 rounded-full animate-ping" style={{background: 'linear-gradient(to right, #E60012, #83C21E)'}}></div>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-red rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
              !
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleGoHome}
            className="group relative px-8 py-3 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            style={{background: 'linear-gradient(to right, #E60012, #83C21E)'}}
          >
            <span className="relative z-10">🏠 Về Trang Chủ</span>
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{background: 'linear-gradient(to right, #B8000E, #6BA01A)'}}></div>
          </button>

          <button
            onClick={handleGoBack}
            className="group relative px-8 py-3 bg-transparent border-2 rounded-full text-gray-300 font-semibold hover:text-white transition-all duration-300 transform hover:scale-105"
            style={{borderColor: '#E60012'}}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E60012'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span className="relative z-10">← Quay Lại</span>
          </button>
        </div>

        {/* Fun suggestions */}
        <div className="mt-12 text-gray-300 text-sm">
          <p className="mb-2">💡 Có thể bạn đang tìm:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-gray-800 bg-opacity-50 rounded-full text-xs hover:bg-opacity-70 cursor-pointer transition-all">
              Trang chủ
            </span>
            <span className="px-3 py-1 bg-gray-800 bg-opacity-50 rounded-full text-xs hover:bg-opacity-70 cursor-pointer transition-all">
              Liên hệ
            </span>
            <span className="px-3 py-1 bg-gray-800 bg-opacity-50 rounded-full text-xs hover:bg-opacity-70 cursor-pointer transition-all">
              Về chúng tôi
            </span>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 animate-pulse" style={{background: 'linear-gradient(to right, #E60012, #83C21E)'}}></div>

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