import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/wathaciSupabaseClient";
import { Navigate } from "react-router-dom";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      const { data, error: sessionError } = await supabaseClient.auth.getSession();
      if (!isMounted) return;
      if (sessionError) {
        setError(sessionError.message);
      }
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    initSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-4 text-gray-600">Checking authentication...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthProvider;
