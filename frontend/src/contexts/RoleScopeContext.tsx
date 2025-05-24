"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface Role {
  id: string;
  name: string;
}

interface RoleScopeContextType {
  currentRole: Role | null;
  availableRoles: Role[];
  switchRole: (role: Role) => void;
  isLoading: boolean;
}

const RoleScopeContext = createContext<RoleScopeContextType | undefined>(undefined);

export function RoleScopeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && user.roles) {
      setAvailableRoles(user.roles);
      
      const rolesPriority = ['Admin', 'PM', 'BUL/Lead', 'Employee'];
      let defaultRole = user.roles[0]; 
      
      for (const priorityRole of rolesPriority) {
        const foundRole = user.roles.find(role => role.name === priorityRole);
        if (foundRole) {
          defaultRole = foundRole;
          break;
        }
      }
      
      setCurrentRole(defaultRole);
      setIsLoading(false);
    } else {
      setAvailableRoles([]);
      setCurrentRole(null);
      setIsLoading(false);
    }
  }, [user]);

  const switchRole = (role: Role) => {
    setCurrentRole(role);
  };

  const value = {
    currentRole,
    availableRoles,
    switchRole,
    isLoading,
  };

  return (
    <RoleScopeContext.Provider value={value}>
      {children}
    </RoleScopeContext.Provider>
  );
}

export function useRoleScope() {
  const context = useContext(RoleScopeContext);
  if (context === undefined) {
    throw new Error('useRoleScope must be used within a RoleScopeProvider');
  }
  return context;
}
