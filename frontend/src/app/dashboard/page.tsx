"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useRoleScope } from '@/contexts/RoleScopeContext';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { currentRole } = useRoleScope();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Function to redirect to the appropriate role-specific dashboard for single-role users
  useEffect(() => {
    if (!loading && user && user.roles && user.roles.length === 1) {
      const singleRole = user.roles[0].name;
      if (singleRole === 'Admin') {
        router.push('/admin');
        return;
      } else if (singleRole === 'PM') {
        router.push('/pm/dashboard');
        return;
      } else if (singleRole === 'BUL/Lead') {
        router.push('/bulorlead/dashboard');
        return;
      } else if (singleRole === 'Employee') {
        router.push('/employee/dashboard');
        return;
      }
      // Only multi-role users stay on main dashboard
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Đang tải bảng điều khiển..." />
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  // Function to render the appropriate dashboard based on current role scope
  const renderDashboard = () => {
    // If no current role is selected, show role selection interface
    if (!currentRole || (user.roles && user.roles.length > 1)) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-brand-gray mb-4">Chọn dashboard </h2>
            <p className="text-gray-600 mb-6">
              Bạn có nhiều vai trò. Chọn bảng điều khiển mà bạn muốn truy cập:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {user.roles?.map((role) => {
                let href = '/dashboard';
                let bgColor = 'bg-gray-100';
                let textColor = 'text-gray-800';
                let description = '';

                switch (role.name) {
                  case 'Admin':
                    href = '/admin';
                    bgColor = 'bg-red-50';
                    textColor = 'text-brand-red';
                    description = 'Quản trị hệ thống toàn diện';
                    break;
                  case 'PM':
                    href = '/pm/dashboard';
                    bgColor = 'bg-red-50';
                    textColor = 'text-brand-red';
                    description = 'Quản lý dự án';
                    break;
                  case 'BUL/Lead':
                    href = '/bulorlead/dashboard';
                    bgColor = 'bg-green-50';
                    textColor = 'text-brand-green';
                    description = 'Quản lý đơn vị';
                    break;
                  case 'Employee':
                    href = '/employee/dashboard';
                    bgColor = 'bg-gray-50';
                    textColor = 'text-brand-gray';
                    description = 'Quản lý thông tin cá nhân';
                    break;
                }

                return (
                  <Link
                    key={role.id}
                    href={href}
                    className={`${bgColor} ${textColor} p-4 rounded-lg hover:shadow-md transition-shadow block`}
                  >
                    <h3 className="font-semibold text-lg mb-2">{role.name}</h3>
                    <p className="text-sm opacity-75">{description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSwitcherNavbar />

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {renderDashboard()}
          </div>
        </div>
      </main>
    </div>
  );
}