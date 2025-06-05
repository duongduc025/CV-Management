"use client";

import { User } from '@/services/auth';
import BULDashboardLayout from './BULDashboardLayout';

interface BULDashboardProps {
  user: User;
}

export default function BULDashboard({ user }: BULDashboardProps) {
  return <BULDashboardLayout user={user} />;
}