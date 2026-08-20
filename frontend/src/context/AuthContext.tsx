"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, LoginRequest } from "@/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  });
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(() => token !== null);

  useEffect(() => {
    let active = true;

    if (token && !user) {
      api
        .getMe()
        .then((userData) => {
          if (active) {
            setUser(userData);
          }
        })
        .catch(() => {
          if (active) {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          if (active) {
            setIsInitializing(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [token, user]);

  const login = async (credentials: LoginRequest) => {
    const res = await api.login(credentials);
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    setIsInitializing(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setIsInitializing(false);
  };

  const isLoading = token !== null && isInitializing;
  const isAdmin = user?.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
