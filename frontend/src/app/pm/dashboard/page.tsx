"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { isPM } from '@/services/auth';
import PMDashboard from '@/components/dashboard/pm/PM';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';

export default function PMDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // If user is loaded but doesn't have PM access, redirect to main dashboard
    if (!loading && user && !isPM(user)) {
      router.push('/dashboard');
      return;
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg">Loading Project Manager dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  if (!isPM(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-red mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access the Project Manager dashboard.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-brand-red text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSwitcherNavbar />

      <main className="w-full">
        <PMDashboard user={user} />
      </main>
    </div>
  );
}