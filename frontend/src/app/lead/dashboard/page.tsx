"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUsers, hasAnyRole, type User } from '@/services/auth';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LeadDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Check if user has BUL/Lead or PM role
    if (!loading && user) {
      const hasLeadRole = hasAnyRole(user, ['BUL/Lead', 'PM']);

      if (!hasLeadRole) {
        router.push('/dashboard');
        return;
      }
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && hasAnyRole(user, ['BUL/Lead', 'PM'])) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoadingData(true);
      setError('');
      const usersData = await getUsers();
      setTeamMembers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const getUserRoleType = (user: User | null): string => {
    if (!user?.roles) return 'Unknown';
    if (user.roles.some(r => r.name === 'BUL/Lead')) return 'BUL/Lead';
    if (user.roles.some(r => r.name === 'PM')) return 'PM';
    return 'Leader';
  };

  const getWelcomeMessage = (roleType: string): string => {
    switch (roleType) {
      case 'BUL/Lead':
        return 'Manage your team and oversee department activities.';
      case 'PM':
        return 'Coordinate projects and manage team resources.';
      default:
        return 'Lead your team and drive success.';
    }
  };

  const getGradientColors = (roleType: string): string => {
    switch (roleType) {
      case 'BUL/Lead':
        return 'from-green-600 to-green-800';
      case 'PM':
        return 'from-blue-600 to-blue-800';
      default:
        return 'from-purple-600 to-purple-800';
    }
  };

  if (loading || isLoadingData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  const roleType = getUserRoleType(user);
  const employeeCount = teamMembers.filter(m => m.roles?.some(r => r.name === 'Employee')).length;
  const leaderCount = teamMembers.filter(m => m.roles?.some(r => ['PM', 'BUL/Lead'].includes(r.name))).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSwitcherNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className={`bg-gradient-to-r ${getGradientColors(roleType)} rounded-lg p-6 text-white mb-8`}>
          <h1 className="text-3xl font-bold mb-2">{roleType} Dashboard</h1>
          <p className="text-lg opacity-90">
            Welcome back, {user.full_name}! {getWelcomeMessage(roleType)}
          </p>
          <div className="mt-4 flex items-center space-x-4 text-sm opacity-80">
            <span>Department: {user.department?.name || 'Not assigned'}</span>
            <span>•</span>
            <span>Employee Code: {user.employee_code}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Team Members */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{teamMembers.length}</div>
              <p className="text-xs text-gray-600 mb-4">Total team members</p>
              <Link href="/lead/member">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Team
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* CV Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CV Management</CardTitle>
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">--</div>
              <p className="text-xs text-gray-600 mb-4">Pending CV reviews</p>
              <Button variant="outline" size="sm" className="w-full">
                Review CVs
              </Button>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">--</div>
              <p className="text-xs text-gray-600 mb-4">Active projects</p>
              <Button variant="outline" size="sm" className="w-full">
                View Projects
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Composition */}
          <Card>
            <CardHeader>
              <CardTitle>Team Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Employees</span>
                  </div>
                  <span className="text-sm font-bold">{employeeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Leaders</span>
                  </div>
                  <span className="text-sm font-bold">{leaderCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <span className="text-sm font-bold">{teamMembers.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Team member data loaded</p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dashboard accessed</p>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">More activities will appear here</p>
                    <p className="text-xs text-gray-400">Future</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/lead/member" className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium text-center">Team Members</span>
              </Link>

              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg opacity-50">
                <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-center">CV Reviews</span>
                <span className="text-xs text-gray-400">Coming Soon</span>
              </div>

              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg opacity-50">
                <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm font-medium text-center">Projects</span>
                <span className="text-xs text-gray-400">Coming Soon</span>
              </div>

              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg opacity-50">
                <svg className="w-8 h-8 text-yellow-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-center">Reports</span>
                <span className="text-xs text-gray-400">Coming Soon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}