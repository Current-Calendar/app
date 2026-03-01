import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthUser = {
  username: string;
} | null;

type AuthContextValue = {
  user: AuthUser;
  isAuthenticated: boolean;
  loadingAuth: boolean;
  setUser: (u: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "current.auth.user";

async function storageSet(value: string | null) {
  if (Platform.OS === "web") {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  if (value === null) await AsyncStorage.removeItem(STORAGE_KEY);
  else await AsyncStorage.setItem(STORAGE_KEY, value);
}

async function storageGet(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(STORAGE_KEY);
  }
  return await AsyncStorage.getItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // ✅ Rehidratar al arrancar
  useEffect(() => {
    (async () => {
      try {
        const raw = await storageGet();
        if (raw) setUserState(JSON.parse(raw));
      } catch {
        // si hay basura en storage, lo limpiamos
        await storageSet(null);
        setUserState(null);
      } finally {
        setLoadingAuth(false);
      }
    })();
  }, []);

  // ✅ Setter que persiste
  const setUser = (u: AuthUser) => {
    setUserState(u);
    storageSet(u ? JSON.stringify(u) : null);
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loadingAuth,
      setUser,
      logout,
    }),
    [user, loadingAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return ctx;
}