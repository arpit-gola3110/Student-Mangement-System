import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { initCsrfToken, resetCsrfToken, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const refreshInFlightRef = useRef(null);

  const refreshUser = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const promise = (async () => {
      try {
        await initCsrfToken();
        const res = await api.get('/auth/me');
        const currentUser = res?.data?.user || null;
        if (mountedRef.current) {
          setUser(currentUser);
        }
        return currentUser;
      } catch {
        if (mountedRef.current) {
          setUser(null);
        }
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Register 401 session-expiration handler
    setUnauthorizedHandler(() => {
      if (mountedRef.current) {
        setUser(null);
      }
    });

    const restoreSession = async () => {
      try {
        await refreshUser();
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mountedRef.current = false;
      setUnauthorizedHandler(null);
    };
  }, [refreshUser]);

  const login = async (email, password) => {
    await initCsrfToken();
    const res = await api.post('/auth/login', { email, password });
    const authenticatedUser = res?.data?.user;
    if (!authenticatedUser) {
      throw new Error('Invalid authentication response from server');
    }
    if (mountedRef.current) {
      setUser(authenticatedUser);
    }
    return authenticatedUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear local state even if backend logout encounters a network failure
    } finally {
      resetCsrfToken();
      await initCsrfToken(true).catch(() => {});
      if (mountedRef.current) {
        setUser(null);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
