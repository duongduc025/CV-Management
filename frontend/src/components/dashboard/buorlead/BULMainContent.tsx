"use client";

import { User } from '@/services/auth';
import BULHomeTab from './BULHomeTab';
import BULMembersTab from './BULMembersTab';


interface BULMainContentProps {
  activeTab: string;
  user: User;
}

export default function BULMainContent({ activeTab, user }: BULMainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <BULHomeTab user={user} />;
      case 'members':
        return <BULMembersTab user={user} />;
      default:
        return <BULHomeTab user={user} />;
    }
  };

  return (
    <div className="h-full w-full overflow-auto">
      {renderContent()}
    </div>
  );
}
