/**
 * AuthContext.tsx — Local JWT Authentication Context
 * UPDATED: Added Microsoft Login support and isLoggingIn state for the UI.
 */
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type UserRole = 'SuperAdmin' | 'Admin' | 'Manager' | 'Assignee';

export interface UserProfile {
  id:           number;
  email:         string;
  name:          string;
  role:          UserRole;
  department?:   string;
  employeeCode?: string;
}

export interface AuthContextType {
  user:           UserProfile | null;
  isLoading:      boolean;
  isLoggingIn:    boolean; // NEW
  // Role helpers
  isSuperAdmin:   boolean;
  isAdmin:        boolean;
  isManager:      boolean;
  isAssignee:     boolean;
  canManageUsers: boolean;   // SuperAdmin only
  canCreateFeedback: boolean; // SuperAdmin + Admin + Manager
  // Auth actions
  login:  (email: string, password: string) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>; // NEW
  logout: () => void;
  getToken: () => string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// ─────────────────────────────────────────────
// Token storage helpers
// ─────────────────────────────────────────────
const TOKEN_KEY = 'fms_auth_token';
const USER_KEY  = 'fms_auth_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeAuth(token: string, user: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete apiClient.defaults.headers.common['Authorization'];
}

// ─────────────────────────────────────────────
// AuthProvider
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<UserProfile | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // NEW STATE

  // Restore session from localStorage on mount
  useEffect(() => {
    const token    = getStoredToken();
    const userJson = localStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const storedUser = JSON.parse(userJson) as UserProfile;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(storedUser);
      } catch {
        clearAuth();
      }
    }
    setLoading(false);
  }, []);

  // Normalize the login user response
  const normalizeUser = (rawUser: any): UserProfile => ({
    id:           rawUser.id,
    email:        rawUser.email,
    name:         rawUser.name || rawUser.fullName || rawUser.employee?.fullName || '',
    role:         rawUser.role,
    department:   rawUser.department || rawUser.employee?.department || undefined,
    employeeCode: rawUser.employeeCode || rawUser.employee?.employeeCode || undefined,
  });

  // Local Login
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoggingIn(true);
    try {
      const { data } = await apiClient.post<{ token: string; user: any }>(
        '/api/auth/login',
        { email, password }
      );
      const normalizedUser = normalizeUser(data.user);
      storeAuth(data.token, normalizedUser);
      setUser(normalizedUser);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  // Microsoft Login
  const loginWithMicrosoft = useCallback(async (): Promise<void> => {
    setIsLoggingIn(true);
    try {
      // Redirect to your backend Microsoft Auth endpoint
      const env = (import.meta as any).env;
      const BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:3001';
      window.location.href = `${BASE_URL}/api/auth/microsoft`;
    } catch (error) {
      console.error("Microsoft redirection failed", error);
      setIsLoggingIn(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const getToken = useCallback(() => getStoredToken(), []);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isAdmin      = user?.role === 'Admin';
  const isManager    = user?.role === 'Manager';
  const isAssignee   = user?.role === 'Assignee';

  return (
    <AuthContext.Provider value={{
      user, 
      isLoading,
      isLoggingIn, // EXPORTED
      isSuperAdmin, 
      isAdmin, 
      isManager, 
      isAssignee,
      canManageUsers:    isSuperAdmin,
      canCreateFeedback: isSuperAdmin || isAdmin || isManager,
      login, 
      loginWithMicrosoft, // EXPORTED
      logout, 
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}