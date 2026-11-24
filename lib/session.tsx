"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type User = { name: string }; // MAYÚSCULAS, máx. 10 caracteres

const STORAGE_KEY = "av_user";

type SessionContextValue = {
  user: User | null;
  signIn: (user: User | null) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as User).name === "string"
    ) {
      return { name: (parsed as User).name };
    }
    return null;
  } catch {
    // localStorage bloqueado o JSON inválido: sin sesión
    return null;
  }
}

function writeStoredUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage no disponible: la sesión vive solo en memoria
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Empieza en null para que el HTML del servidor y el primer render del
  // cliente coincidan; se lee localStorage después del montaje.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readStoredUser());
  }, []);

  // `null` representa al invitado: no hay sesión guardada.
  const signIn = useCallback((next: User | null) => {
    setUser(next);
    writeStoredUser(next);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    writeStoredUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return ctx;
}
