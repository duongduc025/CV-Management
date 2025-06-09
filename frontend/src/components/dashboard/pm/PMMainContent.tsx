"use client";

import { User } from '@/services/auth';
import PMHomeTab from './PMHomeTab';
import PMProjectsTab from './PMProjectsTab';
import PMMembersTab from './PMMembersTab';
import PMCVRequestsTab from './PMCVRequestsTab';


interface PMMainContentProps {
  activeTab: string;
  user: User;
}

export default function PMMainContent({ activeTab, user }: PMMainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <PMHomeTab user={user} />;
      case 'projects':
        return <PMProjectsTab />;
      case 'members':
        return <PMMembersTab />;
      case 'cv-requests':
        return <PMCVRequestsTab />;
      default:
        return <PMHomeTab user={user} />;
    }
  };

  return (
    <div className="h-full w-full overflow-auto">
      {renderContent()}
    </div>
  );
}
