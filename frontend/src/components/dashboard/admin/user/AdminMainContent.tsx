"use client";

import { User } from '@/services/auth';
import AdminHomeTab from './AdminHomeTab';
import AdminRegisterTab from './AdminRegisterTab';
import AdminMembersTab from './AdminMembersTab';

interface AdminMainContentProps {
  activeTab: string;
  user: User;
  setActiveTab: (tab: string) => void;
}

export default function AdminMainContent({ activeTab, user, setActiveTab }: AdminMainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <AdminHomeTab user={user} onNavigateToTab={setActiveTab} />;
      case 'register':
        return <AdminRegisterTab user={user} />;
      case 'members':
        return <AdminMembersTab user={user} />;
      default:
        return <AdminHomeTab user={user} />;
    }
  };

  return (
    <div className="h-full w-full overflow-auto">
      {renderContent()}
    </div>
  );
}
