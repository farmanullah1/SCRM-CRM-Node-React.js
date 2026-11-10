import React, { createContext, useContext, useState, useEffect } from "react";
import { loginUser, signupUser, getCurrentUser, verify2FALogin } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("crm_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("crm_token"));
  const [loading, setLoading] = useState(true);

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
    return data;
  };

  const complete2FA = async (tempToken, otpCode) => {
    const data = await verify2FALogin({ tempToken, otpCode });
    localStorage.setItem("crm_token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("crm_refresh_token", data.refreshToken);
    }
    localStorage.setItem("crm_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await signupUser({ name, email, password });
    localStorage.setItem("crm_token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("crm_refresh_token", data.refreshToken);
    }
    localStorage.setItem("crm_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
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

  const logout = () => {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_refresh_token");
    localStorage.removeItem("crm_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        complete2FA,
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
