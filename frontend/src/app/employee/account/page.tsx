"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { logout } from '@/services/auth';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function MyAccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [loading, user, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg">Loading account information...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSwitcherNavbar />

      <main>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
              <p className="mt-2 text-gray-600">
                View and manage your account information and settings.
              </p>
            </div>

            {/* Account Information */}
            <Card className="mb-6">
              <div className="px-4 py-5 sm:px-6 bg-blue-600 text-white rounded-t-lg">
                <h3 className="text-lg leading-6 font-medium">
                  Account Information
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-blue-100">
                  Your personal details and work information
                </p>
              </div>

              <div className="border-t border-gray-200">
                <dl>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Full name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {user.full_name}
                    </dd>
                  </div>

                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Employee Code
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {user.employee_code}
                    </dd>
                  </div>

                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Email address
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {user.email}
                    </dd>
                  </div>

                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Department
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {user.department?.name || 'Not assigned'}
                    </dd>
                  </div>

                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">
                      Roles
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {user.roles?.map(role => role.name).join(', ') || 'No roles assigned'}
                    </dd>
                  </div>
                </dl>
              </div>
            </Card>

            {/* Account Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                    <p className="text-sm text-gray-600">Update your account password for security</p>
                  </div>
                  <Button variant="outline" disabled>
                    Coming Soon
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Update Profile</h4>
                    <p className="text-sm text-gray-600">Edit your personal information</p>
                  </div>
                  <Button variant="outline" disabled>
                    Coming Soon
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h4 className="text-sm font-medium text-red-900">Sign Out</h4>
                    <p className="text-sm text-red-600">Sign out of your account</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={() => router.push('/employee/dashboard')}
              >
                ← Back to My Profile
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
