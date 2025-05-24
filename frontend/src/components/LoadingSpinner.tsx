import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = 'Loading...', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClasses = {
    sm: 'gap-2 text-sm',
    md: 'gap-3 text-base',
    lg: 'gap-4 text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]} ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-indigo-200 border-opacity-30 rounded-full`}></div>
        <div className={`absolute top-0 left-0 ${sizeClasses[size]} border-4 border-transparent border-t-indigo-500 border-r-indigo-500 rounded-full animate-spin`}></div>
      </div>
      {message && (
        <p className="text-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
