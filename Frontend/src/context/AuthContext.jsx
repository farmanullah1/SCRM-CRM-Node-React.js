import React, { createContext, useContext, useState, useEffect } from "react";
import {
  loginUser,
  signupUser,
  getCurrentUser,
  verify2FALogin,
  verify2FARecovery,
  loginWithGoogle as loginWithGoogleRequest,
  logoutUser
} from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("crm_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("crm_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return undefined;

    // Access changes are resolved server-side per request. Refresh the cached
    // profile periodically and whenever the workspace regains focus so the
    // navigation and controls follow a grant or revocation without a reload.
    const refreshPermissions = () => {
      if (document.visibilityState === "visible") refreshUser();
    };
    const interval = window.setInterval(refreshPermissions, 5000);
    window.addEventListener("focus", refreshPermissions);
    document.addEventListener("visibilitychange", refreshPermissions);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshPermissions);
      document.removeEventListener("visibilitychange", refreshPermissions);
    };
  }, [token]);

  useEffect(() => {
    const verifyAuth = async () => {
      const savedToken = localStorage.getItem("crm_token");
      if (savedToken) {
        try {
          const data = await getCurrentUser();
          setUser(data.user);
          localStorage.setItem("crm_user", JSON.stringify(data.user));
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    if (data.twoFactorRequired) {
      return data; // Requires 2FA verification step
    }
    localStorage.setItem("crm_token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("crm_refresh_token", data.refreshToken);
    }
    localStorage.setItem("crm_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    try {
      const me = await getCurrentUser();
      setUser(me.user);
      localStorage.setItem("crm_user", JSON.stringify(me.user));
    } catch {
      // The session is still valid; permissions arrive on the next /auth/me refresh.
    }
    return data;
  };

  const establishSession = async (data) => {
    localStorage.setItem("crm_token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("crm_refresh_token", data.refreshToken);
    }
    localStorage.setItem("crm_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    try {
      const me = await getCurrentUser();
      setUser(me.user);
      localStorage.setItem("crm_user", JSON.stringify(me.user));
    } catch {
      // Keep the authenticated session; permissions are hydrated on reload.
    }
    return data;
  };

  const complete2FA = async (tempToken, otpCode) => {
    const data = await verify2FALogin({ tempToken, otpCode });
    return establishSession(data);
  };

  const completeRecovery = async (tempToken, recoveryCode) => {
    const data = await verify2FARecovery({ tempToken, recoveryCode });
    return establishSession(data);
  };

  const loginWithGoogle = async (credential, termsAccepted = false) => {
    const data = await loginWithGoogleRequest({ credential, termsAccepted });
    if (data.twoFactorRequired) return data;
    return establishSession(data);
  };

  const signup = async (name, email, password, phone, company_name, title, extras = {}) => {
    const data = await signupUser({ name, email, password, phone, company_name, title, ...extras });
    localStorage.setItem("crm_token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("crm_refresh_token", data.refreshToken);
    }
    localStorage.setItem("crm_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    try {
      const me = await getCurrentUser();
      setUser(me.user);
      localStorage.setItem("crm_user", JSON.stringify(me.user));
    } catch {
      // Signup succeeded even if the permission hydration request failed.
    }
    return data;
  };

  const refreshUser = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      localStorage.setItem("crm_user", JSON.stringify(data.user));
      return data.user;
    } catch (e) {
      return null;
    }
  };

  const logout = async () => {
    let serverRevoked = false;
    try {
      if (localStorage.getItem("crm_token")) {
        await logoutUser();
        serverRevoked = true;
      }
    } catch {
      serverRevoked = false;
    }
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_refresh_token");
    localStorage.removeItem("crm_user");
    setToken(null);
    setUser(null);
    return { serverRevoked };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        complete2FA,
        completeRecovery,
        loginWithGoogle,
        signup,
        refreshUser,
        logout,
        loading,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
