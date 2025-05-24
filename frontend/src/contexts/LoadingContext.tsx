"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import LoadingPage from '@/components/LoadingPage';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  showGlobalLoading: (message?: string) => void;
  hideGlobalLoading: () => void;
  loadingMessage: string;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const showGlobalLoading = (message: string = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideGlobalLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setLoading,
        showGlobalLoading,
        hideGlobalLoading,
        loadingMessage,
      }}
    >
      {children}
      {isLoading && <LoadingPage />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
