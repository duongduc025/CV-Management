"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useRoleScope } from '@/contexts/RoleScopeContext';
import NotificationIcon from '@/components/NotificationIcon';

interface RoleConfig {
  name: string;
  displayName: string;
  color: string;
  bgColor: string;
  hoverColor: string;
  dashboardPath: string;
  description: string;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  'Admin': {
    name: 'Admin',
    displayName: 'Quản trị viên',
    color: 'text-brand-red',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-100',
    dashboardPath: '/admin',
    description: 'Quản trị toàn hệ thống'
  },
  'PM': {
    name: 'PM',
    displayName: 'Quản lý dự án',
    color: 'text-brand-red',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-100',
    dashboardPath: '/pm/dashboard',
    description: 'Dành cho PM'
  },
  'BUL/Lead': {
    name: 'BUL/Lead',
    displayName: 'Quản lý đơn vị',
    color: 'text-brand-green',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-100',
    dashboardPath: '/bulorlead/dashboard',
    description: 'Dành cho BUL/Lead'
  },
  'Employee': {
    name: 'Employee',
    displayName: 'Cá nhân',
    color: 'text-brand-gray',
    bgColor: 'bg-gray-50',
    hoverColor: 'hover:bg-gray-100',
    dashboardPath: '/employee/dashboard',
    description: 'Quản lý thông tin cá nhân'
  }
};

export default function RoleSwitcherNavbar() {
  const { user, logout } = useAuth();
  const { currentRole, availableRoles, switchRole } = useRoleScope();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user || !currentRole) {
    return null;
  }

  const handleRoleSwitch = (role: typeof availableRoles[0]) => {
    switchRole(role);
    setIsDropdownOpen(false);

    // Navigate to the appropriate dashboard for the selected role
    const roleConfig = ROLE_CONFIGS[role.name];
    if (roleConfig) {
      router.push(roleConfig.dashboardPath);
    }
  };



  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and current role */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <Image
                src="/logo.png"
                alt="VDT CV System Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="text-xl font-bold text-brand-red">CV - Management</span>
            </Link>
          </div>

          {/* Center - Role Switcher */}
          {availableRoles.length > 1 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                <span>Danh sách Dashboard</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
                      Dashboard khả dụng
                    </div>
                    {availableRoles.map((role) => {
                      const roleConfig = ROLE_CONFIGS[role.name];

                      return (
                        <button
                          key={role.id}
                          onClick={() => handleRoleSwitch(role)}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors `}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {roleConfig?.displayName || role.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {roleConfig?.description || 'Role description'}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right side - Navigation and user actions */}
          <div className="flex items-center space-x-4">
            {/* Notification Icon */}
            <NotificationIcon />

            {/* User Info */}
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                {user.full_name}
              </div>
              <button
                onClick={() => logout()}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
