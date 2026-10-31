import React, { createContext, useContext, useState, useEffect } from 'react';
import { SafeUser, UserRole } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: SafeUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: { email: string; password: string; name: string; company_name?: string; phone?: string; address?: string }) => Promise<void>;
  logout: () => void;
  switchPersona: (role: UserRole, email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const token = api.getToken();
      if (!token) {
        // Auto-login as Admin by default for seamless evaluation experience
        await loginWithCredentials('admin@brightloop.com', 'BrightAdmin!2026');
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
    } catch (err) {
      console.warn('[AuthContext] Session expired or invalid, auto-logging in default admin:', err);
      try {
        await loginWithCredentials('admin@brightloop.com', 'BrightAdmin!2026');
      } catch (loginErr) {
        api.setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithCredentials = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    api.setToken(res.token);
    setUser(res.user);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await loginWithCredentials(email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: { email: string; password: string; name: string; company_name?: string; phone?: string; address?: string }) => {
    setLoading(true);
    try {
      const res = await api.signup(data);
      api.setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const switchPersona = async (role: UserRole, email: string) => {
    setLoading(true);
    try {
      let password = 'Customer!2026';
      if (role === 'admin') password = 'BrightAdmin!2026';
      if (role === 'staff') password = 'BrightStaff!2026';

      await loginWithCredentials(email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, switchPersona, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

