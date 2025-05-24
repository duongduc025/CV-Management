"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import RoleSwitcherNavbar from '@/components/RoleSwitcherNavbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Mock notifications data
    if (user) {
      setNotifications([
        {
          id: '1',
          title: 'CV Updated Successfully',
          message: 'Your CV has been updated and is now available for review.',
          type: 'success',
          read: false,
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          title: 'Profile Completion Required',
          message: 'Please complete your profile information to ensure accurate records.',
          type: 'warning',
          read: true,
          createdAt: '2024-01-14T14:20:00Z'
        },
        {
          id: '3',
          title: 'Welcome to the System',
          message: 'Welcome! Please take a moment to set up your profile and CV.',
          type: 'info',
          read: true,
          createdAt: '2024-01-13T09:00:00Z'
        }
      ]);
    }
  }, [loading, user, router]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <div className="bg-green-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="bg-yellow-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-blue-100 p-2 rounded-full">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg">Loading notifications...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="mt-2 text-gray-600">
                Stay updated with your latest notifications and system updates.
              </p>
            </div>

            {/* Filter and Actions */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex space-x-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                >
                  All ({notifications.length})
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  onClick={() => setFilter('unread')}
                  size="sm"
                >
                  Unread ({unreadCount})
                </Button>
              </div>
              
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={markAllAsRead}
                  size="sm"
                >
                  Mark All as Read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM16 3h5v5h-5V3zM4 3h6v6H4V3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
                  </h3>
                  <p className="text-gray-600">
                    {filter === 'unread' 
                      ? 'You\'re all caught up! No unread notifications at the moment.'
                      : 'You don\'t have any notifications yet.'
                    }
                  </p>
                </Card>
              ) : (
                filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`p-4 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-4">
                      {getTypeIcon(notification.type)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8">
              <Button
                variant="outline"
                onClick={() => router.push('/employee/profile')}
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
