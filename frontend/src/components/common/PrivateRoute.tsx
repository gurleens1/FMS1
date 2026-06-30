/**
 * PrivateRoute.tsx — Auth guard component
 * NEW: Redirects to /login if not authenticated
 */
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function PrivateRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show branded loading spinner while checking auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#E32200' }}>
            <i className="fa-solid fa-comments text-white text-2xl" />
          </div>
          <i className="fa-solid fa-circle-notch fa-spin text-brand-600 text-2xl" />
          <p className="text-gray-500 text-sm mt-2">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
