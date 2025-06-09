"use client";

import Link from 'next/link';
import { User } from '@/services/auth';

interface MyProfileProps {
  user: User;
}

export default function Employee({ user }: MyProfileProps) {
  return (
    <div className="space-y-6">
      <div 
        className="rounded-lg p-6 text-white"
        style={{ 
          background: 'linear-gradient(to right, #E60012, #B8000E)' 
        }}
      >
        <h2 className="text-2xl font-bold mb-2">Employee Dashboard</h2>
        <p className="text-red-100">
          Chào mừng trở lại, {user.full_name}! Quản lý hồ sơ và cập nhật thông tin của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My CV */}
        <div 
          className="rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <div className="flex items-center mb-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#E6001220' }}
            >
              <svg 
                className="w-6 h-6" 
                style={{ color: '#E60012' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold ml-3" style={{ color: '#333333' }}>CV của tôi</h3>
          </div>
          <p className="mb-4" style={{ color: '#666666' }}>Quản lý và cập nhật sơ yếu lý lịch của bạn</p>
          <Link
            href="/employee/mycv"
            className="inline-flex items-center px-4 py-2 text-white rounded-md transition-colors hover:opacity-90"
            style={{ backgroundColor: '#83C21E' }}
          >
            Quản lý CV
          </Link>
        </div>

        {/* My Account */}
        <div 
          className="rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <div className="flex items-center mb-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#E6001220' }}
            >
              <svg 
                className="w-6 h-6" 
                style={{ color: '#E60012' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold ml-3" style={{ color: '#333333' }}>Tài khoản của tôi</h3>
          </div>
          <p className="mb-4" style={{ color: '#666666' }}>Xem và cập nhật thông tin cá nhân của bạn</p>
          <Link
            href="/employee/account"
            className="inline-flex items-center px-4 py-2 text-white rounded-md transition-colors hover:opacity-90"
            style={{ backgroundColor: '#83C21E' }}
          >
            Xem tài khoản
          </Link>
        </div>

        {/* Notifications */}
        <div 
          className="rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <div className="flex items-center mb-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#E6001220' }}
            >
              <svg 
                className="w-6 h-6" 
                style={{ color: '#E60012' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM16 3h5v5h-5V3zM4 3h6v6H4V3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold ml-3" style={{ color: '#333333' }}>Thông báo</h3>
          </div>
          <p className="mb-4" style={{ color: '#666666' }}>Xem thông báo và cập nhật của bạn</p>
          <Link
            href="/employee/notifications"
            className="inline-flex items-center px-4 py-2 text-white rounded-md transition-colors hover:opacity-90"
            style={{ backgroundColor: '#83C21E' }}
          >
            Xem thông báo
          </Link>
        </div>
      </div>
    </div>
  );
}