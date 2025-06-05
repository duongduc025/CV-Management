"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import AdminSidebar from './AdminSidebar';
import AdminMainContent from './AdminMainContent';

interface AdminDashboardLayoutProps {
  user: User;
}

export default function AdminDashboardLayout({ user }: AdminDashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Main content area */}
        <main className="flex-1 overflow-hidden w-full">
          <AdminMainContent activeTab={activeTab} user={user} setActiveTab={setActiveTab} />
        </main>
      </div>
    </div>
  );
}
