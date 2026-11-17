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

function cacheUser(user) {
  if (user) {
    localStorage.setItem("crm_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("crm_user");
  }
}

function clearLegacyTokens() {
  localStorage.removeItem("crm_token");
  localStorage.removeItem("crm_refresh_token");
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("crm_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      cacheUser(null);
    };
    window.addEventListener("scrm:session-expired", onSessionExpired);
    return () => window.removeEventListener("scrm:session-expired", onSessionExpired);
  }, []);

  useEffect(() => {
    let active = true;
    clearLegacyTokens();

    const verifyAuth = async () => {
      try {
        const data = await getCurrentUser();
        if (!active) return;
        setUser(data.user);
        cacheUser(data.user);
      } catch {
        if (!active) return;
        setUser(null);
        cacheUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    verifyAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    // Permissions are re-resolved by the API on every request. Refresh the
    // cached profile so navigation and controls follow grants/revocations.
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
  }, [user?.id]);

  const establishSession = async (data) => {
    setUser(data.user);
    cacheUser(data.user);
    try {
      const me = await getCurrentUser();
      setUser(me.user);
      cacheUser(me.user);
    } catch {
      // The cookie session is valid; permissions hydrate on the next request.
    }
    return data;
  };

  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    if (data.twoFactorRequired) return data;
    return establishSession(data);
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
    return establishSession(data);
  };

  const refreshUser = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      cacheUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  };

  const logout = async () => {
    let serverRevoked = false;
    try {
      const result = await logoutUser();
      serverRevoked = result?.revoked !== false;
    } catch {
      serverRevoked = false;
    }
    clearLegacyTokens();
    cacheUser(null);
    setUser(null);
    return { serverRevoked };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        complete2FA,
        completeRecovery,
        loginWithGoogle,
        signup,
        refreshUser,
        logout,
        loading,
        isAuthenticated: Boolean(user)
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
