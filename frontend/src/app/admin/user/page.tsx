"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { canAccessAdmin } from '@/services/auth';
import AdminDashboard from '@/components/dashboard/admin/user/Admin';
import LoadingSpinner from '@/components/LoadingSpinner';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';

export default function AdminUserPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !canAccessAdmin(user))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading admin dashboard..." />
      </div>
    );
  }

  if (!user || !canAccessAdmin(user)) {
    return null; // Will be redirected by useEffect
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <RoleSwitcherNavbar />
  
        <main className="w-full">
          <AdminDashboard user={user} />
        </main>
      </div>
    );
}