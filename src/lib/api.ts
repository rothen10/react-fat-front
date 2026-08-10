import {
  mapClient,
  mapClientsStats,
  mapDashboard,
  mapDettes,
  mapLogement,
  mapReservation,
  periodeApi,
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
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Certaines routes NestJS renvoient { data: [...] } ou { items: [...] }. */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o["data"])) return o["data"] as T;
    if (Array.isArray(o["items"])) return o["items"] as T;
    if (o["data"] && typeof o["data"] === "object") return o["data"] as T;
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
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message) message = Array.isArray(body.message) ? body.message[0]! : body.message;
    } catch {
      /* corps non JSON */
    }
    throw new HttpError(res.status, message);
  }
  apiOffline = false;
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? unwrap<T>(JSON.parse(text)) : (undefined as T)) as T;
}

/** Tente l'appel API, et retombe sur le magasin de démonstration en cas d'échec réseau. */
async function withFallback<T>(call: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await call();
  } catch (e) {
    if (e instanceof HttpError && e.status !== 401) throw e;
    apiOffline = true;
    return fallback();
  }
}

const qs = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v);
  return entries.length
    ? `?${new URLSearchParams(entries as [string, string][]).toString()}`
    : "";
};

async function fetchReservations(params: Record<string, string | undefined> = {}): Promise<
  Reservation[]
> {
  const list = await req<ApiReservation[]>(`/reservations${qs(params)}`);
  return (Array.isArray(list) ? list : []).map(mapReservation);
}

async function fetchLogements(params: Record<string, string | undefined> = {}): Promise<
  Logement[]
> {
  const list = await req<ApiLogement[]>(`/logements${qs(params)}`);
  return (Array.isArray(list) ? list : []).map(mapLogement);
}

async function fetchClients(search?: string): Promise<Client[]> {
  const list = await req<ApiClient[]>(`/clients${qs({ search })}`);
  return (Array.isArray(list) ? list : []).map(mapClient);
}

/** Retrouve un client par téléphone (recherche unifiée), sinon le crée. */
async function ensureClient(c: {
  nom_complet: string;
  telephone: string;
  piece_identite_1?: string | undefined;
  date_naissance?: string | undefined;
}): Promise<string> {
  if (c.telephone) {
    const trouves = await fetchClients(c.telephone).catch(() => [] as Client[]);
    const exact = trouves.find((x) => x.telephone === c.telephone);
    if (exact) return exact.id;
  }
  const cree = await req<ApiClient>("/clients", {
    method: "POST",
    body: JSON.stringify({
      nomPrenoms: c.nom_complet,
      telephone: c.telephone,
      ...(c.piece_identite_1 ? { cni: c.piece_identite_1 } : {}),
      ...(c.date_naissance ? { dateNaissance: c.date_naissance } : {}),
    }),
  });
  return mapClient(cree).id;
}

export const api = {
  listLogements: () => withFallback(() => fetchLogements(), () => demoApi.logements()),

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
            body: JSON.stringify({
              ...(patch.nom ? { nom: patch.nom } : {}),
              ...(patch.type ? { type: patch.type } : {}),
              ...(patch.disposition ? { disposition: patch.disposition } : {}),
              ...(patch.tarif_nuit != null ? { tarifNuit: patch.tarif_nuit } : {}),
              ...(patch.statut ? { statut: patch.statut } : {}),
              ...(patch.equipements ? { equipements: patch.equipements } : {}),
            }),
          }),
        ),
      () => demoApi.updateLogement(id, patch) as Logement,
    ),

  /** GET /logements/{id}/calendrier?month=YYYY-MM */
  calendrier: (id: string, mois: string) =>
    withFallback(
      async () => {
        const list = await req<ApiReservation[]>(
          `/logements/${id}/calendrier${qs({ month: mois })}`,
        );
        return (Array.isArray(list) ? list : []).map(mapReservation);
      },
      () => demoApi.reservationsLogement(id),
    ),

  createReservation: (payload: Record<string, unknown>) =>
    withFallback(
      async () => {
        const client = payload["client"] as Parameters<typeof ensureClient>[0] | undefined;
        const clientId =
          (payload["client_id"] as string | undefined) ??
          (await ensureClient(
            client ?? {
              nom_complet: String(payload["client_nom"] ?? "Client"),
              telephone: String(payload["client_telephone"] ?? ""),
            },
          ));

        const created = await req<ApiReservation>("/reservations", {
          method: "POST",
          body: JSON.stringify({
            logementId: payload["logement_id"],
            clientId,
            dateDebut: payload["date_arrivee"],
            dateFin: payload["date_depart"],
            ...(payload["nombre_personnes"]
              ? { personnes: Number(payload["nombre_personnes"]) }
              : {}),
            ...(payload["motif"] ? { motif: String(payload["motif"]) } : {}),
            ...(payload["provenance"] ? { provenance: String(payload["provenance"]) } : {}),
            ...(payload["destination"] ? { destination: String(payload["destination"]) } : {}),
            statut: payload["statut"] === "en_attente" ? "en_attente" : "confirmee",
          }),
        });

        const reservation = mapReservation(created);
        const avance = Number(payload["montant_verse"] ?? 0);
        if (avance > 0 && reservation.id) {
          await req("/paiements", {
            method: "POST",
            body: JSON.stringify({ reservationId: reservation.id, montant: avance }),
          }).catch(() => undefined);
          return mapReservation(await req<ApiReservation>(`/reservations/${reservation.id}`));
        }
        return reservation;
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
              ...(patch.date_arrivee ? { dateDebut: patch.date_arrivee } : {}),
              ...(patch.date_depart ? { dateFin: patch.date_depart } : {}),
              ...(patch.statut
                ? { statut: patch.statut === "terminee" ? "confirmee" : patch.statut }
                : {}),
              ...(patch.motif ? { motif: patch.motif } : {}),
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

  /** POST /reservations/{id}/annuler */
  annulerReservation: (id: string) =>
    withFallback(
      async () =>
        mapReservation(await req<ApiReservation>(`/reservations/${id}/annuler`, { method: "POST" })),
      () => demoApi.updateReservation(id, { statut: "annulee" }) as Reservation,
    ),

  addPaiement: (id: string, p: { montant: number; date_paiement: string; agent: string }) =>
    withFallback(
      async () => {
        await req("/paiements", {
          method: "POST",
          body: JSON.stringify({
            reservationId: id,
            montant: p.montant,
            mode: "especes",
            datePaiement: new Date(p.date_paiement).toISOString(),
          }),
        });
        return mapReservation(await req<ApiReservation>(`/reservations/${id}`));
      },
      () => demoApi.addPaiement(id, p) as Reservation,
    ),

  /** GET /dashboard/summary?period=day|week|month|year */
  stats: (periode: string) =>
    withFallback(
      async () => {
        const [brut, reservations, logements] = await Promise.all([
          req<ApiDashboard>(`/dashboard/summary?period=${periodeApi(periode)}`).catch(
            () => ({}) as ApiDashboard,
          ),
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

  clients: (search?: string) =>
    withFallback(() => fetchClients(search), () => demoApi.clients()),

  clientsStats: () =>
    withFallback(
      async () => {
        const [clients, reservations] = await Promise.all([fetchClients(), fetchReservations()]);
        return mapClientsStats(clients, reservations);
      },
      () => demoApi.clientsStats(),
    ) as Promise<ClientStat[]>,

  /** POST /auth/login — corps { username, password }, réponse { access_token, ... }. */
  login: async (identifiant: string, password: string) => {
    try {
      const r = await req<{
        token?: string;
        access_token?: string;
        role?: "gerant" | "proprietaire";
        user?: { role?: "gerant" | "proprietaire"; nom?: string; username?: string };
        nom_complet?: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: identifiant, password }),
      });
      const token = r.access_token ?? r.token ?? "";
      if (!token) throw new HttpError(401, "Jeton absent de la réponse");
      return {
        token,
        role: (r.role ?? r.user?.role ?? "gerant") as "gerant" | "proprietaire",
        nom_complet: r.nom_complet ?? r.user?.nom ?? r.user?.username ?? identifiant,
      };
    } catch (e) {
      // Identifiants refusés par l'API : on ne bascule pas en démo.
      if (e instanceof HttpError) throw e;
      apiOffline = true;
      return {
        token: "demo-token",
        role: identifiant.toLowerCase().startsWith("proprietaire")
          ? ("proprietaire" as const)
          : ("gerant" as const),
        nom_complet: identifiant.split("@")[0] ?? "Utilisateur",
      };
    }
  },
};

export const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
