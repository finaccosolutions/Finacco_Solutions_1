import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const [authState, setAuthState] = useState({
    checked: false,
    isAuthenticated: false,
    isAdmin: false,
  });
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Check if user is authenticated
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        // 2. If admin route, check admin status (customize this logic)
        let isAdmin = false;
        if (session && adminOnly) {
          const { data: { user } } = await supabase.auth.getUser();
          // Example admin check - adjust based on your auth system
          isAdmin = user?.email?.endsWith('@finaccosolutions.com') || false;
        }

        setAuthState({
          checked: true,
          isAuthenticated: !!session,
          isAdmin,
        });
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState({
          checked: true,
          isAuthenticated: false,
          isAdmin: false,
        });
      }
    };

    checkAuth();
  }, [adminOnly]);

  if (!authState.checked) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !authState.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;