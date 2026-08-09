import {
  mapClient,
  mapClientsStats,
  mapDashboard,
  mapDettes,
  mapLogement,
  mapReservation,
  type ApiClient,
  type ApiDashboard,
  type ApiLogement,
  type ApiReservation,
} from "./api-dto";
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

/** Erreur renvoyée par l'API (par opposition à une panne réseau). */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Certaines routes NestJS renvoient { data: [...] } ou { items: [...] }. */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o["data"])) return o["data"] as T;
    if (Array.isArray(o["items"])) return o["items"] as T;
  }
  return payload as T;
}

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
  if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText}`);
  apiOffline = false;
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? unwrap<T>(JSON.parse(text)) : (undefined as T)) as T;
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

async function fetchReservations(params?: Record<string, string>): Promise<Reservation[]> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const list = await req<ApiReservation[]>(`/reservations${qs}`);
  return (list ?? []).map(mapReservation);
}

async function fetchLogements(): Promise<Logement[]> {
  const list = await req<ApiLogement[]>("/logements");
  return (list ?? []).map(mapLogement);
}

async function fetchClients(): Promise<Client[]> {
  const list = await req<ApiClient[]>("/clients");
  return (list ?? []).map(mapClient);
}

/** Retrouve un client par téléphone/CNI, sinon le crée. */
async function ensureClient(c: {
  nom_complet: string;
  telephone: string;
  piece_identite_1?: string | undefined;
  nationalite?: string | undefined;
  profession?: string | undefined;
}): Promise<string> {
  if (c.telephone) {
    const trouves = await req<ApiClient[]>(
      `/clients?telephone=${encodeURIComponent(c.telephone)}`,
    ).catch(() => [] as ApiClient[]);
    const exact = (trouves ?? []).find((x) => (x.telephone ?? "") === c.telephone);
    if (exact) return exact.id;
  }
  const cree = await req<ApiClient>("/clients", {
    method: "POST",
    body: JSON.stringify({
      nom: c.nom_complet,
      telephone: c.telephone,
      ...(c.piece_identite_1 ? { cni: c.piece_identite_1 } : {}),
    }),
  });
  return cree.id;
}

export const api = {
  listLogements: () => withFallback(fetchLogements, () => demoApi.logements()),

  getLogement: (id: string) =>
    withFallback(
      async () => mapLogement(await req<ApiLogement>(`/logements/${id}`)),
      () => demoApi.logement(id) as Logement,
    ),

  updateLogement: (id: string, patch: Partial<Logement>) =>
    withFallback(
      async () =>
        mapLogement(
          await req<ApiLogement>(`/logements/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          }),
        ),
      () => demoApi.updateLogement(id, patch) as Logement,
    ),

  calendrier: (id: string, mois: string) =>
    withFallback(
      () => fetchReservations({ logement_id: id, mois }),
      () => demoApi.reservationsLogement(id),
    ),

  createReservation: (payload: Record<string, unknown>) =>
    withFallback(
      async () => {
        const client = payload["client"] as Parameters<typeof ensureClient>[0] | undefined;
        const clientId =
          (payload["client_id"] as string | undefined) ??
          (client
            ? await ensureClient(client)
            : await ensureClient({
                nom_complet: String(payload["client_nom"] ?? "Client"),
                telephone: String(payload["client_telephone"] ?? ""),
              }));

        const created = await req<ApiReservation>("/reservations", {
          method: "POST",
          body: JSON.stringify({
            logement_id: payload["logement_id"],
            client_id: clientId,
            date_arrivee: payload["date_arrivee"],
            date_depart: payload["date_depart"],
            statut: payload["statut"] === "en_attente" ? "en_attente" : "confirmee",
            ...(payload["motif"] ? { notes: String(payload["motif"]) } : {}),
          }),
        });

        const avance = Number(payload["montant_verse"] ?? 0);
        if (avance > 0) {
          await req(`/paiements`, {
            method: "POST",
            body: JSON.stringify({
              reservation_id: created.id,
              montant: avance,
              mode: "especes",
              date_paiement: new Date().toISOString(),
            }),
          }).catch(() => undefined);
        }
        return mapReservation(await req<ApiReservation>(`/reservations/${created.id}`));
      },
      () => demoApi.createReservation(payload as never),
    ),

  updateReservation: (id: string, patch: Partial<Reservation>) =>
    withFallback(
      async () =>
        mapReservation(
          await req<ApiReservation>(`/reservations/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
              ...(patch.date_arrivee ? { date_arrivee: patch.date_arrivee } : {}),
              ...(patch.date_depart ? { date_depart: patch.date_depart } : {}),
              ...(patch.statut
                ? { statut: patch.statut === "terminee" ? "confirmee" : patch.statut }
                : {}),
              ...(patch.motif ? { notes: patch.motif } : {}),
            }),
          }),
        ),
      () => demoApi.updateReservation(id, patch) as Reservation,
    ),

  deleteReservation: (id: string) =>
    withFallback(
      () => req<void>(`/reservations/${id}`, { method: "DELETE" }),
      () => demoApi.deleteReservation(id),
    ),

  annulerReservation: (id: string) =>
    withFallback(
      async () =>
        mapReservation(
          await req<ApiReservation>(`/reservations/${id}/annuler`, { method: "PATCH" }),
        ),
      () => demoApi.updateReservation(id, { statut: "annulee" }) as Reservation,
    ),

  addPaiement: (id: string, p: { montant: number; date_paiement: string; agent: string }) =>
    withFallback(
      async () => {
        await req("/paiements", {
          method: "POST",
          body: JSON.stringify({
            reservation_id: id,
            montant: p.montant,
            mode: "especes",
            date_paiement: new Date(p.date_paiement).toISOString(),
          }),
        });
        return mapReservation(await req<ApiReservation>(`/reservations/${id}`));
      },
      () => demoApi.addPaiement(id, p) as Reservation,
    ),

  stats: (periode: string) =>
    withFallback(
      async () => {
        const [brut, reservations, logements] = await Promise.all([
          req<ApiDashboard>(`/dashboard/stats?periode=${periode}`).catch(() => ({}) as ApiDashboard),
          fetchReservations(),
          fetchLogements(),
        ]);
        return mapDashboard(brut, reservations, logements, periode);
      },
      () => demoApi.stats(periode),
    ) as Promise<DashboardStats>,

  dettes: () =>
    withFallback(
      async () => {
        const [reservations, logements] = await Promise.all([
          fetchReservations(),
          fetchLogements(),
        ]);
        return mapDettes(reservations, logements);
      },
      () => demoApi.dettes(),
    ) as Promise<Dette[]>,

  clients: () => withFallback(fetchClients, () => demoApi.clients()),

  clientsStats: () =>
    withFallback(
      async () => {
        const [clients, reservations] = await Promise.all([fetchClients(), fetchReservations()]);
        return mapClientsStats(clients, reservations);
      },
      () => demoApi.clientsStats(),
    ) as Promise<ClientStat[]>,

  login: async (email: string, password: string) => {
    try {
        const r = await req<{
          token?: string;
          access_token?: string;
          role?: "gerant" | "proprietaire";
          user?: { role?: "gerant" | "proprietaire"; nom?: string; email?: string };
          nom_complet?: string;
        }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        const token = r.access_token ?? r.token ?? "";
        if (!token) throw new Error("Jeton absent");
        return {
          token,
          role: (r.role ?? r.user?.role ?? "gerant") as "gerant" | "proprietaire",
          nom_complet: r.nom_complet ?? r.user?.nom ?? email.split("@")[0],
        };
    } catch (e) {
      // Identifiants refusés par l'API : on ne bascule pas en démo.
      if (e instanceof HttpError) throw e;
      apiOffline = true;
      return {
        token: "demo-token",
        role: email.toLowerCase().startsWith("proprietaire")
          ? ("proprietaire" as const)
          : ("gerant" as const),
        nom_complet: email.split("@")[0] ?? "Utilisateur",
      };
    }
  },
};

export const fcfa = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
