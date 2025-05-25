"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import LandingPage from '@/components/LandingPage';
import LoadingPage from '@/components/LoadingPage';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingPage />;
  }

  // If user is logged in, they will be redirected by useEffect
  if (user) {
    return null;
  }

  return <LandingPage />;
}
