import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { AuthUser, AuthStatus, SignInCredentials, SignUpCredentials } from './types';
import { authService } from './authService';

interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Centralized Firebase Authentication State Observer
  useEffect(() => {
    const unsubscribe = authService.observeAuthState((authUser) => {
      setUser(authUser);
      setStatus(authUser ? 'authenticated' : 'unauthenticated');
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (credentials: SignInCredentials) => {
    setError(null);
    try {
      const authUser = await authService.signIn(credentials);
      setUser(authUser);
      setStatus('authenticated');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      throw err;
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
    setError(null);
    try {
      const authUser = await authService.signUp(credentials);
      setUser(authUser);
      setStatus('authenticated');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await authService.signOut();
      setUser(null);
      setStatus('unauthenticated');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    try {
      await authService.sendPasswordReset(email);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated' && user !== null,
      error,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      clearError,
    }),
    [user, status, error]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
