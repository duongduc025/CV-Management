"use client";

import {
  Home,
  MessageSquare,
  Building2,
  FolderOpen,
  Users,
  X,
  Menu
} from 'lucide-react';
import Link from 'next/link';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}

const navigationItems = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: Home,
    description: 'Tổng quan hệ thống'
  },
  {
    id: 'requests',
    name: 'Yêu cầu cập nhật',
    icon: MessageSquare,
    description: 'Yêu cầu cập nhật CV'
  },
  {
    id: 'departments',
    name: 'Phòng ban',
    icon: Building2,
    description: 'Quản lý phòng ban'
  },
  {
    id: 'projects',
    name: 'Dự án',
    icon: FolderOpen,
    description: 'Quản lý dự án'
  },
  {
    id: 'users',
    name: 'Người dùng',
    icon: Users,
    description: 'Quản lý người dùng'
  }
];

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  isMobile
}: AdminSidebarProps) {


  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-30 lg:hidden bg-white p-2 rounded-md shadow-md"
          style={{ color: '#E60012' }}
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? 'fixed' : 'relative'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isMobile ? 'z-30' : 'z-10'}
          w-70 bg-white shadow-lg transition-transform duration-300 ease-in-out
          flex flex-col h-full
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center">
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#E60012' }}>
                Admin
              </h1>
            </div>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <li key={item.id}>
                  <Link
                    href={`#${item.id}`}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-red-50 text-brand-red border-r-2 border-brand-red'
                        : 'text-brand-gray hover:bg-gray-100 hover:text-brand-gray'
                    }`}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (isMobile) {
                        setSidebarOpen(false);
                      }
                    }}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-brand-red' : 'text-gray-500'}`} />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isActive ? 'text-brand-red' : 'text-brand-gray'}`}>
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
