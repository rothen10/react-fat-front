export interface Session {
  token: string;
  role: string;
  nom: string;
  email: string;
}

let session: Session | null = null;
const listeners = new Set<() => void>();
export const getSession = () => session;
export const getToken = () => session?.token ?? null;
export const canManageReservations = (role: string | undefined) => role === 'gerant';
export function setSession(value: Session | null) {
  session = value;
  listeners.forEach((listener) => listener());
}
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}