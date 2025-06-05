"use client";

import {
  Home,
  FileText,
  MessageSquare,
  Building2,
  FolderOpen,
  Users,
  X,
  Menu
} from 'lucide-react';

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
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

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
                CV Management
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
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`
                  w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200
                  ${isActive
                    ? 'text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
                style={{
                  backgroundColor: isActive ? '#E60012' : 'transparent'
                }}
                title={`Navigate to /admin#${item.id}`}
              >
                <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className={`text-xs truncate ${isActive ? 'text-red-100' : 'text-gray-500'}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* URL Display */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Current URL:</div>
          <div className="text-xs font-mono bg-gray-100 p-2 rounded text-gray-700 break-all">
            /admin#{activeTab}
          </div>
        </div>
      </div>
    </>
  );
}
