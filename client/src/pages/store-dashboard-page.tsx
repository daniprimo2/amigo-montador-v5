import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import StoreDashboard from '@/components/dashboard/store-dashboard';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export default function StoreDashboardPage() {
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/');
      },
    });
  };

  return (
    <DashboardLayout userType="lojista">
      <StoreDashboard onLogout={handleLogout} />
    </DashboardLayout>
  );
}
