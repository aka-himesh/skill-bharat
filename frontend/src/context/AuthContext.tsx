/**
 * AuthContext — Provides login/logout state and token management.
 *
 * Uses the backend's PIN+password auth at POST /api/auth/login.
 * Stores the JWT in localStorage and exposes it via context.
 */
import React, { createContext, useContext, useState, useCallback } from "react";
import { login as apiLogin, setToken, clearToken, getToken, type LoginPayload, type ApiError } from "../services/api";

interface AuthContextValue {
  /** Whether the user has a token stored */
  isLoggedIn: boolean;
  /** Perform login; returns true on success */
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  /** Clear the token */
  logout: () => void;
  /** The raw token (for display/debug) */
  token: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  login: async () => ({ success: false }),
  logout: () => {},
  token: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());

  // Auto-login with demo credentials if no session exists yet
  React.useEffect(() => {
    if (!token) {
      apiLogin({ pin: "26246", password: "zeroone" })
        .then((res) => {
          if (res.access_token) {
            setToken(res.access_token);
            setTokenState(res.access_token);
          }
        })
        .catch(() => { /* silent fallback */ });
    }
  }, [token]);

  const handleLogin = useCallback(async (payload: LoginPayload) => {
    try {
      const res = await apiLogin(payload);
      setToken(res.access_token);
      setTokenState(res.access_token);
      return { success: true };
    } catch (err) {
      const apiErr = err as ApiError;
      return { success: false, error: apiErr.detail ?? apiErr.message ?? "Login failed" };
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        login: handleLogin,
        logout: handleLogout,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
