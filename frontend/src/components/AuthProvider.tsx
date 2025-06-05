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
        const refreshToken = localStorage.getItem('refreshToken');

        if (!token) {
          // No token, user is not logged in
          setUser(null);
          setError(null);
          setLoading(false);
          return;
        }

        // Check if token is expired before making API call
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Date.now() / 1000;

          // If token is expired and we don't have a refresh token, clear everything
          if (payload.exp < currentTime && !refreshToken) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setError(null);
            setLoading(false);
            return;
          }
        } catch (tokenParseError) {
          // Invalid token format, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setError(null);
          setLoading(false);
          return;
        }

        // We have a valid token, try to get user data
        const userData = await getCurrentUser();
        setUser(userData);
        setError(null);
      } catch (err) {
        // Clear tokens on authentication error
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
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