import {
  mapClient,
  mapClientsStats,
  mapDashboard,
  mapDettes,
  mapLogement,
  mapNotification,
  mapPaiement,
  mapReservation,
  periodeApi,
  type ApiClient,
  type ApiDashboard,
  type ApiLogement,
  type ApiPaiement,
  type ApiReservation,
  type Brut,
} from "./api-dto";

import type {
  Client,
  ClientStat,
  DashboardStats,
  Dette,
  Logement,
  NotificationItem,
  Paiement,
  Reservation,
} from "./types";

import {
  HEURE_ARRIVEE_DEFAUT,
  HEURE_DEPART_DEFAUT,
  combiner,
} from "./dates";

/**
 * URL de l'API backend.
 *
 * Tu peux la définir dans ton fichier .env :
 *
 * VITE_API_URL=https://ton-api.com
 *
 * Si VITE_API_URL n'est pas défini,
 * l'URL suivante sera utilisée.
 */
export const API_URL =
  (import.meta.env["VITE_API_URL"] as string) ??
  "https://kn-residence-api.vercel.app";

/**
 * Indique si l'API est actuellement inaccessible
 * à cause d'une erreur réseau.
 *
 * IMPORTANT :
 * Cette variable sert uniquement à informer l'interface.
 * Elle ne déclenche AUCUN fallback vers des données de démo.
 */
export let apiOffline = false;

/**
 * Erreur HTTP renvoyée par l'API.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Certaines routes NestJS peuvent retourner :
 *
 * { data: [...] }
 * { items: [...] }
 * { data: {...} }
 *
 * Cette fonction récupère automatiquement
 * le contenu utile de la réponse.
 */
function unwrap<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const o =
      payload as Record<string, unknown>;

    if (Array.isArray(o["data"])) {
      return o["data"] as T;
    }

    if (Array.isArray(o["items"])) {
      return o["items"] as T;
    }

    if (
      o["data"] &&
      typeof o["data"] === "object"
    ) {
      return o["data"] as T;
    }
  }

  return payload as T;
}

/**
 * Fonction centrale pour toutes les requêtes API.
 *
 * Toutes les données de l'application passent
 * par cette fonction.
 *
 * Il n'y a volontairement plus aucun fallback
 * vers demo-store.
 */
async function req<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("kn_token")
      : null;

  try {
    const res = await fetch(
      `${API_URL}/api${path}`,
      {
        ...init,
        headers: {
          "Content-Type":
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),

          ...(init?.headers ?? {}),
        },
      },
    );

    /**
     * Gestion des erreurs HTTP.
     */
    if (!res.ok) {
      let message =
        `${res.status} ${res.statusText}`;

      try {
        const body =
          (await res.json()) as {
            message?: string | string[];
          };

        if (body?.message) {
          message =
            Array.isArray(
              body.message,
            )
              ? body.message[0]!
              : body.message;
        }
      } catch {
        /**
         * Le serveur a renvoyé une réponse
         * qui n'est pas du JSON.
         */
      }

      throw new HttpError(
        res.status,
        message,
      );
    }

    /**
     * La connexion fonctionne.
     */
    apiOffline = false;

    /**
     * Pas de contenu.
     */
    if (res.status === 204) {
      return undefined as T;
    }

    /**
     * Lecture de la réponse.
     */
    const text =
      await res.text();

    if (!text) {
      return undefined as T;
    }

    return unwrap<T>(
      JSON.parse(text),
    );
  } catch (error) {
    /**
     * Une erreur HTTP reste une erreur HTTP.
     *
     * Une erreur réseau active simplement
     * apiOffline.
     *
     * Dans aucun cas nous ne retournons
     * des données de démonstration.
     */
    if (
      !(error instanceof HttpError)
    ) {
      apiOffline = true;
    }

    throw error;
  }
}

/**
 * Construction des paramètres GET.
 */
const qs = (
  params: Record<
    string,
    string | undefined
  >,
) => {
  const entries =
    Object.entries(params).filter(
      ([, value]) => value,
    );

  if (!entries.length) {
    return "";
  }

  return `?${new URLSearchParams(
    entries as [
      string,
      string,
    ][],
  ).toString()}`;
};

/**
 * Récupère les réservations
 * depuis le backend.
 */
async function fetchReservations(
  params: Record<
    string,
    string | undefined
  > = {},
): Promise<Reservation[]> {
  const list =
    await req<ApiReservation[]>(
      `/reservations${qs(params)}`,
    );

  return (
    Array.isArray(list)
      ? list
      : []
  ).map(mapReservation);
}

/**
 * Récupère les logements
 * depuis le backend.
 */
async function fetchLogements(
  params: Record<
    string,
    string | undefined
  > = {},
): Promise<Logement[]> {
  const list =
    await req<ApiLogement[]>(
      `/logements${qs(params)}`,
    );

  return (
    Array.isArray(list)
      ? list
      : []
  ).map(mapLogement);
}

/**
 * Récupère les clients
 * depuis le backend.
 */
async function fetchClients(
  search?: string,
): Promise<Client[]> {
  const list =
    await req<ApiClient[]>(
      `/clients${qs({ search })}`,
    );

  return (
    Array.isArray(list)
      ? list
      : []
  ).map(mapClient);
}

/**
 * Transforme un client frontend
 * vers le format attendu par
 * l'API NestJS.
 */
function clientBody(
  c: Partial<Client>,
): Record<string, unknown> {
  return {
    ...(c.nom_complet !== undefined
      ? {
          nomPrenoms:
            c.nom_complet,
        }
      : {}),

    ...(c.telephone !== undefined
      ? {
          telephone:
            c.telephone,
        }
      : {}),

    ...(c.piece_identite_1 !==
    undefined
      ? {
          cni:
            c.piece_identite_1,
        }
      : {}),

    ...(c.date_naissance
      ? {
          dateNaissance:
            c.date_naissance,
        }
      : {}),

    ...(c.nationalite !==
    undefined
      ? {
          nationalite:
            c.nationalite,
        }
      : {}),

    ...(c.profession !==
    undefined
      ? {
          profession:
            c.profession,
        }
      : {}),

    ...(c.residence_cameroun !==
    undefined
      ? {
          adresse:
            c.residence_cameroun,
        }
      : {}),
  };
}

/**
 * Recherche un client par téléphone.
 *
 * Si le client existe déjà dans la base,
 * son ID est réutilisé.
 *
 * Sinon, un nouveau client est créé
 * dans la vraie base via l'API.
 */
async function ensureClient(
  c: {
    nom_complet: string;
    telephone: string;
    piece_identite_1?:
      | string
      | undefined;
    date_naissance?:
      | string
      | undefined;
  },
): Promise<string> {
  if (c.telephone) {
    const trouves =
      await fetchClients(
        c.telephone,
      );

    const exact =
      trouves.find(
        (x) =>
          x.telephone ===
          c.telephone,
      );

    if (exact) {
      return exact.id;
    }
  }

  const cree =
    await req<ApiClient>(
      "/clients",
      {
        method: "POST",

        body: JSON.stringify({
          nomPrenoms:
            c.nom_complet,

          telephone:
            c.telephone,

          ...(c.piece_identite_1
            ? {
                cni:
                  c.piece_identite_1,
              }
            : {}),

          ...(c.date_naissance
            ? {
                dateNaissance:
                  c.date_naissance,
              }
            : {}),
        }),
      },
    );

  return mapClient(cree).id;
}

/**
 * API de l'application.
 *
 * Toutes les méthodes utilisent
 * exclusivement le backend.
 */
export const api = {
  /**
   * ============================
   * LOGEMENTS
   * ============================
   */

  listLogements: () =>
    fetchLogements(),

  getLogement: async (
    id: string,
  ) => {
    const logement =
      await req<ApiLogement>(
        `/logements/${id}`,
      );

    return mapLogement(
      logement,
    );
  },

  updateLogement: async (
    id: string,
    patch: Partial<Logement>,
  ) => {
    const logement =
      await req<ApiLogement>(
        `/logements/${id}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            ...(patch.nom
              ? {
                  nom: patch.nom,
                }
              : {}),

            ...(patch.type
              ? {
                  type: patch.type,
                }
              : {}),

            ...(patch.disposition
              ? {
                  disposition:
                    patch.disposition,
                }
              : {}),

            ...(patch.tarif_nuit !=
            null
              ? {
                  tarifNuit:
                    patch.tarif_nuit,
                }
              : {}),

            ...(patch.statut
              ? {
                  statut:
                    patch.statut,
                }
              : {}),

            ...(patch.equipements
              ? {
                  equipements:
                    patch.equipements,
                }
              : {}),
          }),
        },
      );

    return mapLogement(
      logement,
    );
  },

  /**
   * GET
   * /logements/{id}/calendrier
   * ?month=YYYY-MM
   */
  calendrier: async (
    id: string,
    mois: string,
  ) => {
    const list =
      await req<ApiReservation[]>(
        `/logements/${id}/calendrier${qs(
          {
            month: mois,
          },
        )}`,
      );

    return (
      Array.isArray(list)
        ? list
        : []
    ).map(mapReservation);
  },

  /**
   * ============================
   * RESERVATIONS
   * ============================
   */

  createReservation: async (
    payload: Record<
      string,
      unknown
    >,
  ) => {
    const client =
      payload["client"] as
        | Parameters<
            typeof ensureClient
          >[0]
        | undefined;

    const clientId =
      (payload[
        "client_id"
      ] as string | undefined) ??
      (await ensureClient(
        client ?? {
          nom_complet:
            String(
              payload[
                "client_nom"
              ] ??
                "Client",
            ),

          telephone:
            String(
              payload[
                "client_telephone"
              ] ?? "",
            ),
        },
      ));

    const created =
      await req<ApiReservation>(
        "/reservations",
        {
          method: "POST",

          body: JSON.stringify({
            logementId:
              payload[
                "logement_id"
              ],

            clientId,

            dateDebut: combiner(
              String(payload["date_arrivee"]),
              String(
                payload["heure_arrivee"] ??
                  HEURE_ARRIVEE_DEFAUT,
              ),
            ),

            dateFin: combiner(
              String(payload["date_depart"]),
              String(
                payload["heure_depart"] ??
                  HEURE_DEPART_DEFAUT,
              ),
            ),

            ...(payload[
              "nombre_personnes"
            ]
              ? {
                  personnes:
                    Number(
                      payload[
                        "nombre_personnes"
                      ],
                    ),
                }
              : {}),

            ...(payload["motif"]
              ? {
                  motif:
                    String(
                      payload[
                        "motif"
                      ],
                    ),
                }
              : {}),

            ...(payload[
              "provenance"
            ]
              ? {
                  provenance:
                    String(
                      payload[
                        "provenance"
                      ],
                    ),
                }
              : {}),

            ...(payload[
              "destination"
            ]
              ? {
                  destination:
                    String(
                      payload[
                        "destination"
                      ],
                    ),
                }
              : {}),

            statut:
              payload[
                "statut"
              ] ===
              "en_attente"
                ? "en_attente"
                : "confirmee",
          }),
        },
      );

    const reservation =
      mapReservation(
        created,
      );

    /**
     * Si une avance a été saisie,
     * on l'enregistre également
     * dans la vraie API.
     */
    const avance =
      Number(
        payload[
          "montant_verse"
        ] ?? 0,
      );

    if (
      avance > 0 &&
      reservation.id
    ) {
      await req(
        "/paiements",
        {
          method: "POST",

          body: JSON.stringify({
            reservationId:
              reservation.id,

            montant: avance,
          }),
        },
      );

      /**
       * On recharge la réservation
       * depuis la base afin de récupérer
       * les montants actualisés.
       */
      const updated =
        await req<ApiReservation>(
          `/reservations/${reservation.id}`,
        );

      return mapReservation(
        updated,
      );
    }

    return reservation;
  },

  updateReservation:
    async (
      id: string,
      patch: Partial<Reservation>,
    ) => {
      const updated =
        await req<ApiReservation>(
          `/reservations/${id}`,
          {
            method: "PATCH",

            body: JSON.stringify({
              ...(patch.date_arrivee
                ? {
                    dateDebut: combiner(
                      patch.date_arrivee,
                      patch.heure_arrivee ??
                        HEURE_ARRIVEE_DEFAUT,
                    ),
                  }
                : {}),

              ...(patch.date_depart
                ? {
                    dateFin: combiner(
                      patch.date_depart,
                      patch.heure_depart ??
                        HEURE_DEPART_DEFAUT,
                    ),
                  }
                : {}),

              ...(patch.statut
                ? {
                    statut:
                      patch.statut ===
                      "terminee"
                        ? "confirmee"
                        : patch.statut,
                  }
                : {}),

              ...(patch.motif
                ? {
                    motif:
                      patch.motif,
                  }
                : {}),
            }),
          },
        );

      return mapReservation(
        updated,
      );
    },

  deleteReservation:
    async (id: string) => {
      await req<void>(
        `/reservations/${id}`,
        {
          method: "DELETE",
        },
      );
    },

  /**
   * POST
   * /reservations/{id}/annuler
   */
  annulerReservation:
    async (id: string) => {
      const reservation =
        await req<ApiReservation>(
          `/reservations/${id}/annuler`,
          {
            method: "POST",
          },
        );

      return mapReservation(
        reservation,
      );
    },

  /**
   * ============================
   * PAIEMENTS
   * ============================
   */

  addPaiement: async (
    id: string,
    p: {
      montant: number;
      date_paiement: string;
      agent: string;
    },
  ) => {
    await req(
      "/paiements",
      {
        method: "POST",

        body: JSON.stringify({
          reservationId: id,

          montant:
            p.montant,

          mode: "especes",

          datePaiement:
            new Date(
              p.date_paiement,
            ).toISOString(),
        }),
      },
    );

    const reservation =
      await req<ApiReservation>(
        `/reservations/${id}`,
      );

    return mapReservation(
      reservation,
    );
  },

  /**
   * ============================
   * DASHBOARD
   * ============================
   *
   * GET
   * /dashboard/summary
   * ?period=day|week|month|year
   */

  stats: async (
    periode: string,
  ): Promise<DashboardStats> => {
    const [
      brut,
      reservations,
      logements,
    ] = await Promise.all([
      req<ApiDashboard>(
        `/dashboard/summary?period=${periodeApi(
          periode,
        )}`,
      ),

      fetchReservations(),

      fetchLogements(),
    ]);

    return mapDashboard(
      brut,
      reservations,
      logements,
      periode,
    );
  },

  /**
   * ============================
   * DETTES
   * ============================
   */

  dettes:
    async (): Promise<Dette[]> => {
      const [
        reservations,
        logements,
      ] = await Promise.all([
        fetchReservations(),
        fetchLogements(),
      ]);

      return mapDettes(
        reservations,
        logements,
      );
    },

  /**
   * ============================
   * CLIENTS
   * ============================
   */

  clients: (
    search?: string,
  ) =>
    fetchClients(search),

  createClient:
    async (
      c: Partial<Client>,
    ) => {
      const client =
        await req<ApiClient>(
          "/clients",
          {
            method: "POST",

            body: JSON.stringify(
              clientBody(c),
            ),
          },
        );

      return mapClient(
        client,
      );
    },

  updateClient:
    async (
      id: string,
      c: Partial<Client>,
    ) => {
      const client =
        await req<ApiClient>(
          `/clients/${id}`,
          {
            method: "PATCH",

            body: JSON.stringify(
              clientBody(c),
            ),
          },
        );

      return mapClient(
        client,
      );
    },

  deleteClient:
    async (id: string) => {
      await req<void>(
        `/clients/${id}`,
        {
          method: "DELETE",
        },
      );
    },

  /**
   * ============================
   * RESERVATION UNIQUE
   * ============================
   */

  getReservation:
    async (id: string) => {
      const reservation =
        await req<ApiReservation>(
          `/reservations/${id}`,
        );

      return mapReservation(
        reservation,
      );
    },

  /**
   * ============================
   * STATISTIQUES CLIENTS
   * ============================
   */

  clientsStats:
    async (): Promise<
      ClientStat[]
    > => {
      const [
        clients,
        reservations,
      ] = await Promise.all([
        fetchClients(),
        fetchReservations(),
      ]);

      return mapClientsStats(
        clients,
        reservations,
      );
    },

  /**
   * ============================
   * PAIEMENTS (liste globale)
   * ============================
   * GET /paiements — repli sur les paiements imbriqués
   * dans les réservations si la route n'existe pas.
   */
  paiements: async (): Promise<Paiement[]> => {
    try {
      const list = await req<ApiPaiement[]>("/paiements");
      if (Array.isArray(list) && list.length) return list.map(mapPaiement);
    } catch {
      /* route absente : on reconstruit depuis les réservations */
    }

    const [reservations, logements] = await Promise.all([
      fetchReservations(),
      fetchLogements(),
    ]);
    const nomLogement = (id: string) => logements.find((l) => l.id === id)?.nom;

    return reservations
      .flatMap((r) =>
        (r.paiements ?? []).map((p) => ({
          ...p,
          client_nom: r.client_nom,
          logement_nom: nomLogement(r.logement_id),
        })),
      )
      .sort((a, b) => (a.date_paiement < b.date_paiement ? 1 : -1));
  },

  /**
   * ============================
   * NOTIFICATIONS
   * ============================
   */
  notifications: async (): Promise<NotificationItem[]> => {
    try {
      const list = await req<Brut[]>("/notifications");
      if (Array.isArray(list)) return list.map(mapNotification);
    } catch {
      /* repli : nouvelles réservations en attente */
    }

    const reservations = await fetchReservations();
    return reservations
      .filter((r) => r.statut === "en_attente")
      .map((r) => ({
        id: `res-${r.id}`,
        type: "nouvelle_reservation",
        titre: "Nouvelle réservation",
        message: `${r.client_nom} — ${r.date_arrivee} → ${r.date_depart}`,
        reservation_id: r.id,
        lu: false,
        created_at: r.date_arrivee,
      }));
  },

  marquerNotificationLue: async (id: string) => {
    if (id.startsWith("res-")) return;
    try {
      await req<void>(`/notifications/${id}/lu`, { method: "PATCH" });
    } catch {
      await req<void>(`/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ lu: true }),
      });
    }
  },

  /**
   * Réservations d'un client donné.
   */
  reservationsClient: async (clientId: string): Promise<Reservation[]> => {
    try {
      const list = await req<ApiReservation[]>(`/clients/${clientId}/reservations`);
      if (Array.isArray(list)) return list.map(mapReservation);
    } catch {
      /* repli : filtrage côté client */
    }
    const all = await fetchReservations();
    return all.filter((r) => r.client_id === clientId);
  },

  /**
   * ============================
   * RÉSERVATION EN LIGNE (public)
   * ============================
   * Le paiement Moneroo est suspendu : la réservation est créée
   * avec 0 XAF payé et une date limite de confirmation sur place.
   * POST /reservations/public
   */
  reserverEnLigne: async (payload: {
    logement_id: string;
    date_arrivee: string;
    heure_arrivee: string;
    date_depart: string;
    heure_depart: string;
    date_limite_confirmation: string;
    nombre_personnes?: number;
    client: Partial<Client>;
  }): Promise<{ reservation?: Reservation; note_pdf_url?: string }> => {
    const r = await req<Brut>("/reservations/public", {
      method: "POST",
      body: JSON.stringify({
        nomPrenoms: payload.client.nom_complet ?? "Client",
        telephone: payload.client.telephone ?? "",
        ...(payload.client.email ? { email: payload.client.email } : {}),
        logementId: payload.logement_id,
        dateDebut: combiner(payload.date_arrivee, payload.heure_arrivee),
        dateFin: combiner(payload.date_depart, payload.heure_depart),
        dateLimiteConfirmation: payload.date_limite_confirmation,
        ...(payload.nombre_personnes ? { nombrePersonnes: payload.nombre_personnes } : {}),
      }),
    });

    const brute = ((r?.["reservation"] as ApiReservation | undefined) ??
      (r as ApiReservation | undefined)) as ApiReservation | undefined;
    const reservation = brute?.["id"] ? mapReservation(brute) : undefined;

    return {
      ...(reservation ? { reservation } : {}),
      ...(reservation ? { note_pdf_url: `${API_URL}/api/reservations/${reservation.id}/note.pdf` } : {}),
    };
  },

  /** URL de la note PDF d'une réservation. */
  notePdfUrl: (id: string) => `${API_URL}/api/reservations/${id}/note.pdf`,




  /**
   * ============================
   * AUTHENTIFICATION
   * ============================
   *
   * POST /auth/login
   *
   * Corps :
   * {
   *   username,
   *   password
   * }
   */

  login: async (
    identifiant: string,
    password: string,
  ) => {
    const r =
      await req<{
        token?: string;

        access_token?: string;

        role?:
          | "gerant"
          | "proprietaire";

        user?: {
          role?:
            | "gerant"
            | "proprietaire";

          nom?: string;

          username?: string;
        };

        nom_complet?: string;
      }>(
        "/auth/login",
        {
          method: "POST",

          body: JSON.stringify({
            username:
              identifiant,

            password,
          }),
        },
      );

    const token =
      r.access_token ??
      r.token ??
      "";

    /**
     * L'API doit impérativement
     * renvoyer un token.
     */
    if (!token) {
      throw new HttpError(
        401,
        "Jeton absent de la réponse",
      );
    }

    return {
      token,

      role: (
        r.role ??
        r.user?.role ??
        "gerant"
      ) as
        | "gerant"
        | "proprietaire",

      nom_complet:
        r.nom_complet ??
        r.user?.nom ??
        r.user?.username ??
        identifiant,
    };
  },
};

/**
 * Formatage des montants en FCFA.
 */
export const fcfa = (
  n: number,
) =>
  `${new Intl.NumberFormat(
    "fr-FR",
  ).format(
    Math.round(n),
  )} FCFA`;

