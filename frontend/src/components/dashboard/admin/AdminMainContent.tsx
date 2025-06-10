"use client";

import React, { useEffect, useState } from 'react';
import AdminHomeTab from './AdminHomeTab';
import AdminRequestsTab from './AdminRequestsTab';
import AdminDepartmentsTab from './AdminDepartmentsTab';
import AdminProjectsTab from './AdminProjectsTab';
import AdminUsersTab from './AdminUsersTab';

interface AdminMainContentProps {
  activeTab: string;
}

export default function AdminMainContent({ activeTab }: AdminMainContentProps) {
  // Use state to track current component to avoid re-renders
  const [currentTab, setCurrentTab] = useState<React.ReactElement>(<AdminHomeTab />);
  
  useEffect(() => {
    // Update component based on activeTab
    switch (activeTab) {
      case 'dashboard':
        setCurrentTab(<AdminHomeTab />);
        break;
      case 'requests':
        setCurrentTab(<AdminRequestsTab />);
        break;
      case 'departments':
        setCurrentTab(<AdminDepartmentsTab />);
        break;
      case 'projects':
        setCurrentTab(<AdminProjectsTab />);
        break;
      case 'users':
        setCurrentTab(<AdminUsersTab />);
        break;
      default:
        setCurrentTab(<AdminHomeTab />);
    }
  }, [activeTab]);

  return (
    <div className="h-full overflow-auto">
      {currentTab}
    </div>
  );
}
