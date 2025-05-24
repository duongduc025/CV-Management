"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useRoleScope } from '@/contexts/RoleScopeContext';

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
    displayName: 'Administrator',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    hoverColor: 'hover:bg-purple-200',
    dashboardPath: '/admin',
    description: 'Full system administration'
  },
  'PM': {
    name: 'PM',
    displayName: 'Project Manager',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    hoverColor: 'hover:bg-blue-200',
    dashboardPath: '/pm/dashboard',
    description: 'Project management tools'
  },
  'BUL/Lead': {
    name: 'BUL/Lead',
    displayName: 'Business Unit Lead',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    hoverColor: 'hover:bg-green-200',
    dashboardPath: '/bulorlead/dashboard',
    description: 'Team leadership dashboard'
  },
  'Employee': {
    name: 'Employee',
    displayName: 'Employee',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    hoverColor: 'hover:bg-indigo-200',
    dashboardPath: '/employee/dashboard',
    description: 'Personal workspace'
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

  const currentRoleConfig = ROLE_CONFIGS[currentRole.name];

  const handleRoleSwitch = (role: typeof availableRoles[0]) => {
    switchRole(role);
    setIsDropdownOpen(false);
    
    // Navigate to the appropriate dashboard for the selected role
    const roleConfig = ROLE_CONFIGS[role.name];
    if (roleConfig) {
      router.push(roleConfig.dashboardPath);
    }
  };

  const handleDashboardNavigation = () => {
    if (currentRoleConfig) {
      router.push(currentRoleConfig.dashboardPath);
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and current role */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              VDT CV System
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
                <span>Dashboard List</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
                      Available Dashboard
                    </div>
                    {availableRoles.map((role) => {
                      const roleConfig = ROLE_CONFIGS[role.name];
                      const isActive = currentRole.id === role.id;
                      
                      return (
                        <button
                          key={role.id}
                          onClick={() => handleRoleSwitch(role)}
                          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                            isActive 
                              ? `${roleConfig?.bgColor} ${roleConfig?.color}` 
                              : `hover:bg-gray-100 text-gray-700`
                          }`}
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
                            {isActive && (
                              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
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

            {/* Profile Link */}
            <Link
              href="/employee/account"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Profile
            </Link>

            {/* User Info */}
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                {user.full_name}
              </div>
              <button
                onClick={() => logout()}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
