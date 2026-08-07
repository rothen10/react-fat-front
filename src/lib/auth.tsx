import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role } from "./types";

interface Session {
  token: string;
  role: Role;
  nom: string;
  email: string;
}

interface AuthCtx {
  session: Session | null;
  ready: boolean;
  signIn: (s: Session) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  ready: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("kn_session");
    if (raw) {
      try {
        setSession(JSON.parse(raw) as Session);
      } catch {
        localStorage.removeItem("kn_session");
      }
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      ready,
      signIn: (s) => {
        localStorage.setItem("kn_session", JSON.stringify(s));
        localStorage.setItem("kn_token", s.token);
        setSession(s);
      },
      signOut: () => {
        localStorage.removeItem("kn_session");
        localStorage.removeItem("kn_token");
        setSession(null);
      },
    }),
    [session, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
