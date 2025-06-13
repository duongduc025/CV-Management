"use client";

import { useState, useEffect } from 'react';
import { User } from '@/services/auth';
import PMSidebar from './PMSidebar';
import PMMainContent from './PMMainContent';

interface PMDashboardLayoutProps {
  user: User;
}

export default function PMDashboardLayout({ user }: PMDashboardLayoutProps) {
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
      <PMSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0  bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
       

        {/* Main content area */}
        <main className="flex-1 overflow-hidden w-full">
          <PMMainContent activeTab={activeTab} user={user} />
        </main>
      </div>
    </div>
  );
}
