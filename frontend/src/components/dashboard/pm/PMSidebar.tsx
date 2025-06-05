"use client";

import { Home, FolderOpen, Users, X } from 'lucide-react';

interface PMSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}

const navigationItems = [
  {
    id: 'home',
    name: 'Trang chủ',
    icon: Home,
    description: 'Tổng quan dự án'
  },
  {
    id: 'projects',
    name: 'Quản lý Dự án',
    icon: FolderOpen,
    description: 'Tạo và quản lý dự án'
  },
  {
    id: 'members',
    name: 'Thành viên',
    icon: Users,
    description: 'Quản lý thành viên nhóm'
  }
];

export default function PMSidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  isMobile
}: PMSidebarProps) {
  return (
    <div
      className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
    >

      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-red-50 text-brand-red border-r-2 border-brand-red'
                      : 'text-brand-gray hover:bg-gray-100 hover:text-brand-gray'
                  }`}
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
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
