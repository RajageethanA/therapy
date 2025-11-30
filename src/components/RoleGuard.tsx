import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import type { UserRole } from '@/lib/mockData';

interface RoleGuardProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthenticated, loading } = useUser();

  // Show loading spinner or blank while Firebase is checking auth state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the appropriate default dashboard based on user role
    const defaultRoute = user.role === 'therapist' ? '/therapist' : '/';
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
}

export default RoleGuard;
