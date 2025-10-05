import { useEffect, type ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { setAuthToken } from '../api/client';
import { useAuth } from '../state/AuthContext';

export const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setAuthToken(token ?? null);
  }, [token]);

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
