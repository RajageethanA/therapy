import { Navigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

export function RoleBasedRedirect() {
  const { user, isAuthenticated, loading } = useUser();

  // Show loading while checking auth state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to appropriate dashboard based on user role
  const defaultRoute = user.role === 'therapist' ? '/therapist' : '/dashboard';
  return <Navigate to={defaultRoute} replace />;
}

export default RoleBasedRedirect;