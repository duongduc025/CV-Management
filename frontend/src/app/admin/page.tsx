"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { canAccessAdmin } from '@/services/auth';
import AdminDashboard from '@/components/dashboard/Admin';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import Link from 'next/link';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // If user is loaded but doesn't have admin access, redirect to dashboard
    if (!loading && user && !canAccessAdmin(user)) {
      router.push('/dashboard');
      return;
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg">Loading admin panel...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  if (!canAccessAdmin(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-red mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access the admin panel.</p>
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

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <AdminDashboard user={user} />
          </div>
        </div>
      </main>
    </div>
  );
}