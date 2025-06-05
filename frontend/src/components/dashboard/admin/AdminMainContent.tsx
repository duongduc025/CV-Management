"use client";

import { User } from '@/services/auth';

interface AdminMainContentProps {
  activeTab: string;
  user: User;
}

export default function AdminMainContent({ activeTab, user }: AdminMainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        // Import dynamically to avoid module resolution issues
        const AdminHomeTab = require('./AdminHomeTab').default;
        return <AdminHomeTab user={user} />;
      case 'requests':
        const AdminRequestsTab = require('./AdminRequestsTab').default;
        return <AdminRequestsTab user={user} />;
      case 'departments':
        const AdminDepartmentsTab = require('./AdminDepartmentsTab').default;
        return <AdminDepartmentsTab user={user} />;
      case 'projects':
        const AdminProjectsTab = require('./AdminProjectsTab').default;
        return <AdminProjectsTab user={user} />;
      case 'users':
        const AdminUsersTab = require('./AdminUsersTab').default;
        return <AdminUsersTab user={user} />;
      default:
        const DefaultAdminHomeTab = require('./AdminHomeTab').default;
        return <DefaultAdminHomeTab user={user} />;
    }
  };

  return (
    <div className="h-full overflow-auto">
      {renderContent()}
    </div>
  );
}
