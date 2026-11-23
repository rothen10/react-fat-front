import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, setSession, subscribeSession, type Session } from "./session";

interface AuthCtx {
  session: Session | null;
  ready: boolean;
  signIn: (s: Session) => void;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({ session: null, ready: false, signIn: () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, updateSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    // Remove credentials persisted by earlier frontend versions; never restore them.
    localStorage.removeItem("kn_session");
    localStorage.removeItem("kn_token");
    updateSession(getSession());
    setReady(true);
    return subscribeSession(() => {
      updateSession(getSession());
      void qc.cancelQueries();
      qc.clear();
    });
  }, [qc]);
  const value = useMemo<AuthCtx>(() => ({
    session, ready,
    signIn: (s) => setSession(s),
    signOut: async () => {
      await qc.cancelQueries();
      qc.clear();
      setSession(null);
    },
  }), [session, ready, qc]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
