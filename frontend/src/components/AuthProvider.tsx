"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, logout, type User } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ['/', '/login', '/register'];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a token before trying to get user data
        const token = localStorage.getItem('token');
        if (!token) {
          // No token, user is not logged in
          setUser(null);
          setError(null);
          setLoading(false);
          return;
        }

        // We have a token, try to get user data
        const userData = await getCurrentUser();
        setUser(userData);
        setError(null);
      } catch (err) {
        setUser(null);

        // Only redirect to login if not already on a public page
        if (!publicRoutes.includes(pathname)) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      router.push('/login');
    } catch (err) {
      setError('Logout failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setUser,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}