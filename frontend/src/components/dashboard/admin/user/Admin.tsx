"use client";

import { User } from '@/services/auth';
import AdminDashboardLayout from './AdminDashboardLayout';

interface AdminDashboardProps {
  user: User;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  return <AdminDashboardLayout user={user} />;
}
