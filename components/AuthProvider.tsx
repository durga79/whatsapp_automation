"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  _id: string;
  orgId: string;
  email: string;
  name?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  apiKey: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('wexaUser');
    const storedToken = localStorage.getItem('wexaToken');
    const storedApiKey = localStorage.getItem('wexaApiKey');

    if (storedUser && storedToken && storedApiKey) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setApiKey(storedApiKey);
      } catch {
        // Clear invalid data
        localStorage.removeItem('wexaUser');
        localStorage.removeItem('wexaToken');
        localStorage.removeItem('wexaApiKey');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setUser(data.user);
    setToken(data.token);
    setApiKey(data.apiKey);

    localStorage.setItem('wexaUser', JSON.stringify(data.user));
    localStorage.setItem('wexaToken', data.token);
    localStorage.setItem('wexaApiKey', data.apiKey);

    router.push('/');
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    // Don't auto-login after signup - user needs to verify email
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setApiKey(null);
    localStorage.removeItem('wexaUser');
    localStorage.removeItem('wexaToken');
    localStorage.removeItem('wexaApiKey');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, apiKey, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
