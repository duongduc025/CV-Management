"use client";

import { User } from '@/services/auth';
import PMDashboardLayout from './PMDashboardLayout';

interface PMDashboardProps {
  user: User;
}

export default function PMDashboard({ user }: PMDashboardProps) {
  return <PMDashboardLayout user={user} />;
}