import React, { useState, useEffect } from 'react';

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
        return prev + 15; // Use fixed increment instead of random
      });
    }, 200);

    // Animate loading dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-gray via-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{backgroundColor: '#E60012'}}></div>
        <div className="absolute top-3/4 right-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000" style={{backgroundColor: '#83C21E'}}></div>
        <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-gray-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating particles - only render on client to prevent hydration mismatch */}
      {isClient && [...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white rounded-full opacity-30 animate-ping"
          style={{
            left: `${(i * 17 + 10) % 90 + 5}%`, // Deterministic positioning
            top: `${(i * 23 + 15) % 80 + 10}%`, // Deterministic positioning
            animationDelay: `${(i % 6) * 0.5}s`, // Deterministic delay
            animationDuration: `${2 + (i % 3)}s` // Deterministic duration
          }}
        ></div>
      ))}

      {/* Main loading container */}
      <div className="relative z-10 text-center p-8">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-2xl animate-bounce" style={{background: 'linear-gradient(to right, #E60012, #83C21E)'}}>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <div className="w-6 h-6 rounded-full animate-spin" style={{background: 'linear-gradient(to right, #E60012, #83C21E)'}}></div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 animate-fade-in">
            VDT CV System
          </h1>
          <p className="text-gray-300 text-lg">Đang tải nội dung{dots}</p>
        </div>

        {/* Spinner */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-400 border-opacity-30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent rounded-full animate-spin" style={{borderTopColor: '#E60012', borderRightColor: '#E60012'}}></div>
            <div className="absolute top-2 left-2 w-12 h-12 border-4 border-transparent rounded-full animate-spin animation-reverse" style={{borderTopColor: '#83C21E', borderRightColor: '#83C21E'}}></div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-80 max-w-full mx-auto mb-6">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Tiến độ</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 bg-opacity-50 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: 'linear-gradient(to right, #E60012, #83C21E)'
              }}
            >
              <div className="h-full bg-white bg-opacity-20 animate-pulse"></div>
            </div>
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
        .animation-reverse {
          animation-direction: reverse;
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LoadingPage;
