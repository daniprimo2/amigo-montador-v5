import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AssemblerDashboard from '@/components/dashboard/assembler-dashboard';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export default function AssemblerDashboardPage() {
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
    <DashboardLayout userType="montador">
      <AssemblerDashboard onLogout={handleLogout} />
    </DashboardLayout>
  );
}
