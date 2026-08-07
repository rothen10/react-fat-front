import { demoApi } from "./demo-store";
import type {
  Client,
  ClientStat,
  DashboardStats,
  Dette,
  Logement,
  Reservation,
} from "./types";

export const API_URL = (import.meta.env["VITE_API_URL"] as string) ?? "http://localhost:3001";

/** Vrai lorsque l'API locale n'a pas répondu : l'app bascule sur les données de démo. */
export let apiOffline = false;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("kn_token") : null;
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  apiOffline = false;
  return (await res.json()) as T;
}

/** Tente l'appel API, et retombe sur le magasin de démonstration en cas d'échec réseau. */
async function withFallback<T>(call: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await call();
  } catch {
    apiOffline = true;
    return fallback();
  }
}

export const api = {
  listLogements: () =>
    withFallback(() => req<Logement[]>("/logements"), () => demoApi.logements()),

  getLogement: (id: string) =>
    withFallback(
      () => req<Logement>(`/logements/${id}`),
      () => demoApi.logement(id) as Logement,
    ),

  updateLogement: (id: string, patch: Partial<Logement>) =>
    withFallback(
      () => req<Logement>(`/logements/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
      () => demoApi.updateLogement(id, patch) as Logement,
    ),

  calendrier: (id: string, mois: string) =>
    withFallback(
      () => req<Reservation[]>(`/logements/${id}/calendrier?mois=${mois}`),
      () => demoApi.reservationsLogement(id),
    ),

  createReservation: (payload: Record<string, unknown>) =>
    withFallback(
      () => req<Reservation>("/reservations", { method: "POST", body: JSON.stringify(payload) }),
      () => demoApi.createReservation(payload as never),
    ),

  updateReservation: (id: string, patch: Partial<Reservation>) =>
    withFallback(
      () => req<Reservation>(`/reservations/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
      () => demoApi.updateReservation(id, patch) as Reservation,
    ),

  deleteReservation: (id: string) =>
    withFallback(
      () => req<void>(`/reservations/${id}`, { method: "DELETE" }),
      () => demoApi.deleteReservation(id),
    ),

  annulerReservation: (id: string) =>
    withFallback(
      () => req<Reservation>(`/reservations/${id}/annuler`, { method: "POST" }),
      () => demoApi.updateReservation(id, { statut: "annulee" }) as Reservation,
    ),

  addPaiement: (id: string, p: { montant: number; date_paiement: string; agent: string }) =>
    withFallback(
      () =>
        req<Reservation>(`/reservations/${id}/paiements`, {
          method: "POST",
          body: JSON.stringify(p),
        }),
      () => demoApi.addPaiement(id, p) as Reservation,
    ),

  stats: (periode: string) =>
    withFallback(
      () => req<DashboardStats>(`/dashboard/stats?periode=${periode}`),
      () => demoApi.stats(periode),
    ),

  dettes: () => withFallback(() => req<Dette[]>("/dashboard/dettes"), () => demoApi.dettes()),

  clients: () => withFallback(() => req<Client[]>("/clients"), () => demoApi.clients()),

  clientsStats: () =>
    withFallback(() => req<ClientStat[]>("/dashboard/clients"), () => demoApi.clientsStats()),

  login: (email: string, password: string) =>
    withFallback(
      () =>
        req<{ token: string; role: "gerant" | "proprietaire"; nom_complet?: string }>(
          "/auth/login",
          { method: "POST", body: JSON.stringify({ email, password }) },
        ),
      () => ({
        token: "demo-token",
        role: email.toLowerCase().startsWith("proprietaire")
          ? ("proprietaire" as const)
          : ("gerant" as const),
        nom_complet: email.split("@")[0] ?? "Utilisateur",
      }),
    ),
};

export const fcfa = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
