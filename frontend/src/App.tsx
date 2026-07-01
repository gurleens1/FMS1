/**
 * App.tsx — Root application component
 * CHANGED: Removed MSAL/Azure AD, MockAuthProvider, DemoApp
 * NEW: Single AuthProvider with JWT, role-based routing, PrivateRoute guard
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/common/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { OverviewPage } from './pages/OverviewPage';
import { FeedbackListPage } from './pages/FeedbackListPage';
import { FeedbackFormPage } from './pages/FeedbackFormPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { CategoryManagementPage } from './pages/CategoryManagementPage';
import { VoiceBoxCategoriesPage } from './pages/VoiceBoxCategoriesPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { PrivateRoute } from './components/common/PrivateRoute';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,
      retry:               1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/login"            element={<LoginPage />} />
            <Route path="/forgot-password"  element={<ForgotPasswordPage />} />

            {/* ── Protected routes (requires auth) ── */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppShell />}>
                <Route path="/"                element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"       element={<DashboardPage />} />
                <Route path="/overview"        element={<OverviewPage />} />
                <Route path="/feedback"        element={<FeedbackListPage />} />
                <Route path="/feedback/new"    element={<FeedbackFormPage />} />
                <Route path="/feedback/:id"    element={<TicketDetailPage />} />
                {/* SuperAdmin + Admin only */}
                <Route path="/category-management" element={<CategoryManagementPage />} />
                <Route path="/voicebox-categories" element={<VoiceBoxCategoriesPage />} />
                <Route path="/user-management" element={<UserManagementPage />} />
              </Route>
            </Route>

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
