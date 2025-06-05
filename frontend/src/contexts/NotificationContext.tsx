"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { sseService } from '@/services/sse';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  status?: 'Đang yêu cầu' | 'Đã xử lý' | 'Đã huỷ';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initialize with CV requests and setup SSE
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    if (user) {
      // Fetch CV update requests from backend
      const fetchCVRequests = async () => {
        try {
          const { getCVUpdateRequests } = await import('@/services/cv');
          const cvRequests = await getCVUpdateRequests();

          // Convert CV requests to notifications format, handle null/undefined case
          const cvNotifications: Notification[] = (cvRequests || []).map((request: any) => ({
            id: request.id,
            title: request.title || 'Yêu cầu cập nhật CV',
            message: request.message || `${request.requester_name} đã yêu cầu bạn cập nhật CV.`,
            type: 'warning' as const,
            read: request.is_read !== undefined ? request.is_read : (request.read || false), // Use is_read from backend, fallback to read, default to false
            createdAt: request.requested_at,
            status: request.status
          }));

          setNotifications(cvNotifications);
        } catch (error) {
          console.error('Failed to fetch CV requests:', error);
          // Fallback to empty notifications on error
          setNotifications([]);
        }
      };

      fetchCVRequests();

      // Setup SSE connection for real-time notifications
      const handleSSENotification = (notificationData: any) => {
        console.log('Adding real-time notification to UI:', notificationData);
        // Use the actual request_id from the SSE data if available, otherwise generate a temporary ID
        const notificationId = notificationData.request_id || `sse-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const newNotification: Notification = {
          ...notificationData,
          id: notificationId,
          createdAt: new Date().toISOString(),
          read: false
        };

        setNotifications(prev => {
          console.log('Current notifications count:', prev.length);
          const updated = [newNotification, ...prev];
          console.log('Updated notifications count:', updated.length);
          return updated;
        });

        // Show browser notification if permission is granted (client-side only)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(notificationData.title, {
            body: notificationData.message,
            icon: '/favicon.ico'
          });
        }
      };

      sseService.setNotificationCallback(handleSSENotification);

      // Request notification permission (client-side only)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      }

      // Connect to SSE
      sseService.connect().then(() => {
        console.log('SSE connected successfully for user:', user.id);
      }).catch((error) => {
        console.error('Failed to connect to SSE:', error);
      });

      // Cleanup on unmount
      return () => {
        sseService.disconnect();
      };
    } else {
      // User logged out, disconnect SSE
      sseService.disconnect();
    }
  }, [user]);

  const addNotification = (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    // Check if this is a temporary SSE ID (starts with 'sse-') or a real CV request ID
    const isTemporaryId = id.startsWith('sse-');

    try {
      // Only call backend API for real CV request IDs
      if (!isTemporaryId) {
        const { markCVRequestAsRead } = await import('@/services/cv');
        await markCVRequestAsRead(id);
      }

      // Update local state for both temporary and real IDs
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Still update local state even if backend call fails
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      // Call backend API to mark all as read
      const { markAllCVRequestsAsRead } = await import('@/services/cv');
      await markAllCVRequestsAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Still update local state even if backend call fails
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
