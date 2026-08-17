/**
 * Contrats renvoyés par l'API NestJS KN Résidence (http://localhost:3001/api)
 * et adaptateurs vers les types internes de l'interface.
 *
 * L'API expose ses champs en camelCase (Prisma) mais certaines routes
 * renvoient encore du snake_case : les lecteurs ci-dessous acceptent les deux.
 */
import type {
  Client,
  ClientStat,
  DashboardStats,
  Dette,
  Logement,
  NotificationItem,
  Paiement,
  PaiementsPeriode,
  Reservation,
  StatutReservation,
} from "./types";
import { HEURE_ARRIVEE_DEFAUT, HEURE_DEPART_DEFAUT, heureDe } from "./dates";

export type Brut = Record<string, unknown>;
export type ApiLogement = Brut;
export type ApiClient = Brut;
export type ApiPaiement = Brut;
export type ApiReservation = Brut;
export type ApiDashboard = Brut;

/** Première clé présente et non nulle parmi les alias fournis. */
function pick(o: Brut | null | undefined, ...keys: string[]): unknown {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown, def = ""): string => (v == null ? def : String(v));

const jour = (v: unknown): string => (v ? String(v).slice(0, 10) : "");

export const nuitsEntre = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

/** Traduit la période de l'interface vers le paramètre `period` de l'API. */
export const periodeApi = (p: string): "day" | "week" | "month" | "year" =>
  p === "jour" ? "day" : p === "semaine" ? "week" : p === "annee" ? "year" : "month";

export function mapLogement(l: ApiLogement): Logement {
  const statut = str(pick(l, "statut", "status"), "disponible").toLowerCase();
  const type = str(pick(l, "type"), "studio").toLowerCase();
  const dispo = pick(l, "disponible", "estDisponible");
  const statutJour =
    dispo === false || statut === "occupe" || pick(l, "statut_jour", "statutJour") === "occupe"
      ? "occupe"
      : "disponible";
  const equipements = pick(l, "equipements", "equipments");
  return {
    id: str(pick(l, "id")),
    nom: str(pick(l, "nom", "name"), "—"),
    type: type.startsWith("appart") ? "appartement" : "studio",
    disposition: str(pick(l, "disposition", "description")),
    tarif_nuit: num(pick(l, "tarifNuit", "tarif_nuit", "prixNuit")),
    statut: (["disponible", "occupe", "maintenance"].includes(statut)
      ? statut
      : "disponible") as Logement["statut"],
    equipements: Array.isArray(equipements) ? (equipements as string[]) : undefined,
    photos: Array.isArray(l["photos"]) ? (l["photos"] as string[]) : undefined,
    statut_jour: statutJour,
  };
}

export function mapClient(c: ApiClient): Client {
  return {
    id: str(pick(c, "id")),
    nom_complet: str(pick(c, "nomPrenoms", "nom_complet", "nom", "name"), "—"),
    telephone: str(pick(c, "telephone", "phone")),
    piece_identite_1: pick(c, "cni", "numeroPiece", "piece_identite_1")
      ? str(pick(c, "cni", "numeroPiece", "piece_identite_1"))
      : undefined,
    date_naissance: pick(c, "dateNaissance", "date_naissance")
      ? jour(pick(c, "dateNaissance", "date_naissance"))
      : undefined,
    nationalite: pick(c, "nationalite") ? str(pick(c, "nationalite")) : undefined,
    profession: pick(c, "profession") ? str(pick(c, "profession")) : undefined,
    residence_cameroun: pick(c, "adresse", "residence")
      ? str(pick(c, "adresse", "residence"))
      : undefined,
  };
}

export function mapPaiement(p: ApiPaiement): Paiement {
  const mode = str(pick(p, "mode", "modePaiement", "methode"), "especes").toLowerCase();
  const enLigne =
    /om|momo|mobile|moneroo|ligne|online|card|carte/.test(mode) ||
    pick(p, "reference", "transactionId", "monerooId") != null;
  const reservation = (pick(p, "reservation") as Brut | undefined) ?? undefined;
  const client = (pick(reservation, "client") as Brut | undefined) ?? undefined;
  const logement = (pick(reservation, "logement") as Brut | undefined) ?? undefined;
  return {
    id: str(pick(p, "id")),
    reservation_id: str(pick(p, "reservationId", "reservation_id") ?? pick(reservation, "id")),
    montant: num(pick(p, "montant")),
    date_paiement: jour(pick(p, "datePaiement", "date_paiement", "createdAt", "created_at")),
    agent: mode === "especes" ? "Espèces" : mode,
    mode,
    canal: enLigne ? "en_ligne" : "especes",
    client_nom: client ? str(pick(client, "nomPrenoms", "nom_complet", "nom")) : undefined,
    logement_nom: logement ? str(pick(logement, "nom", "name")) : undefined,
  };
}

export function mapNotification(n: Brut): NotificationItem {
  return {
    id: str(pick(n, "id")),
    type: str(pick(n, "type", "categorie"), "reservation"),
    titre: str(pick(n, "titre", "title", "type"), "Notification"),
    message: str(pick(n, "message", "contenu", "description")),
    reservation_id: pick(n, "reservationId", "reservation_id")
      ? str(pick(n, "reservationId", "reservation_id"))
      : undefined,
    lu: pick(n, "lu", "lue", "read") === true,
    created_at: str(pick(n, "createdAt", "created_at", "date")),
  };
}

function mapStatut(s: unknown, dateDepart?: string): StatutReservation {
  const v = str(s, "en_attente").toLowerCase().replace(/[\s-]/g, "_");
  if (v.startsWith("annul")) return "annulee";
  if (v.startsWith("termin")) return "terminee";
  if (v.startsWith("confirm")) {
    if (dateDepart && dateDepart < new Date().toISOString().slice(0, 10)) return "terminee";
    return "confirmee";
  }
  return "en_attente";
}

export function mapReservation(r: ApiReservation): Reservation {
  const rawPaiements = pick(r, "paiements", "payments");
  const paiements = (Array.isArray(rawPaiements) ? (rawPaiements as Brut[]) : []).map(mapPaiement);
  const brutArrivee = pick(r, "arriveeAt", "dateDebut", "date_arrivee", "dateArrivee", "date_debut");
  const brutDepart = pick(r, "departAt", "dateFin", "date_depart", "dateDepart", "date_fin");
  const arrivee = jour(brutArrivee);
  const depart = jour(brutDepart);
  const heureArrivee = heureDe(
    brutArrivee ? String(brutArrivee) : undefined,
    HEURE_ARRIVEE_DEFAUT,
  );
  const heureDepart = heureDe(brutDepart ? String(brutDepart) : undefined, HEURE_DEPART_DEFAUT);
  const nuits = num(pick(r, "nombreNuits", "nombre_nuits")) || nuitsEntre(arrivee, depart);
  const tarif = num(pick(r, "tarifNuit", "tarif_nuit"));
  const total = num(pick(r, "montantTotal", "montant_total")) || tarif * nuits;
  const payeApi = pick(r, "montantPaye", "montant_paye", "totalPaye");
  const paye = payeApi != null ? num(payeApi) : paiements.reduce((s, p) => s + p.montant, 0);
  const restantApi = pick(r, "montantRestant", "montant_restant", "solde", "resteAPayer");
  const client = (pick(r, "client") as Brut | undefined) ?? undefined;
  const logement = (pick(r, "logement") as Brut | undefined) ?? undefined;
  const limite = pick(r, "dateLimiteConfirmation", "date_limite_confirmation");
  const origineBrute = str(
    pick(r, "origine", "canal", "source", "type_reservation") ?? "",
  ).toLowerCase();

  return {
    id: str(pick(r, "id")),
    logement_id: str(pick(r, "logementId", "logement_id") ?? pick(logement, "id")),
    client_id: str(pick(r, "clientId", "client_id") ?? pick(client, "id")),
    client_nom: str(pick(client, "nomPrenoms", "nom_complet", "nom"), "—"),
    client_telephone: str(pick(client, "telephone")),
    nombre_personnes: pick(r, "personnes", "nombrePersonnes")
      ? num(pick(r, "personnes", "nombrePersonnes"))
      : undefined,
    date_arrivee: arrivee,
    date_depart: depart,
    heure_arrivee: heureArrivee,
    heure_depart: heureDepart,
    date_limite_confirmation: limite ? jour(limite) : undefined,
    origine: /ligne|online|public|web/.test(origineBrute)
      ? "en_ligne"
      : origineBrute
        ? "sur_place"
        : limite
          ? "en_ligne"
          : undefined,
    motif: pick(r, "motif", "notes") ? str(pick(r, "motif", "notes")) : undefined,
    provenance: pick(r, "provenance") ? str(pick(r, "provenance")) : undefined,
    destination: pick(r, "destination") ? str(pick(r, "destination")) : undefined,
    statut: mapStatut(pick(r, "statut", "status"), depart),
    montant_total: total,
    montant_paye: paye,
    montant_restant: restantApi != null ? num(restantApi) : Math.max(0, total - paye),
    agent: str(pick(r, "agent"), "—"),
    paiements,
  };
}

export function mapDettes(reservations: Reservation[], logements: Logement[]): Dette[] {
  const nom = (id: string) => logements.find((l) => l.id === id)?.nom ?? "—";
  return reservations
    .filter((r) => r.statut !== "annulee" && r.montant_restant > 0)
    .map((r) => ({
      reservation_id: r.id,
      logement: nom(r.logement_id),
      client: r.client_nom,
      telephone: r.client_telephone,
      montant_du: r.montant_restant,
      date_arrivee: r.date_arrivee,
      date_depart: r.date_depart,
    }));
}

export function mapClientsStats(clients: Client[], reservations: Reservation[]): ClientStat[] {
  return clients.map((c) => {
    const rs = reservations.filter((r) => r.client_id === c.id && r.statut !== "annulee");
    return {
      client: c,
      nombre_reservations: rs.length,
      jours_cumules: rs.reduce((s, r) => s + nuitsEntre(r.date_arrivee, r.date_depart), 0),
    };
  });
}

/** GET /api/dashboard/summary complété par les agrégations manquantes. */
export function mapDashboard(
  d: ApiDashboard,
  reservations: Reservation[],
  logements: Logement[],
  periode: string,
): DashboardStats {
  const today = new Date().toISOString().slice(0, 10);
  const actives = reservations.filter((r) => r.statut === "confirmee" || r.statut === "en_attente");

  const revenusParLogement = pick(d, "revenusParLogement", "revenus_par_logement", "occupation");
  const occupation =
    Array.isArray(revenusParLogement) && revenusParLogement.length
      ? (revenusParLogement as Brut[]).map((o) => ({
          logement: str(pick(o, "logement", "nom"), "—"),
          taux: Math.round(num(pick(o, "taux", "tauxOccupation")) || (o["occupe"] ? 100 : 0)),
        }))
      : logements.map((l) => {
          const jours = reservations
            .filter((r) => r.logement_id === l.id && r.statut !== "annulee")
            .reduce((s, r) => s + nuitsEntre(r.date_arrivee, r.date_depart), 0);
          const fenetre = periode === "semaine" ? 7 : periode === "annee" ? 365 : 30;
          return { logement: l.nom, taux: Math.min(100, Math.round((jours / fenetre) * 100)) };
        });

  const revenusApi = pick(d, "revenus", "revenusParPeriode");
  const revenus =
    Array.isArray(revenusApi) && revenusApi.length
      ? (revenusApi as Brut[]).map((r) => ({
          periode: str(pick(r, "periode", "mois", "label")),
          montant: num(pick(r, "montant", "total", "chiffreAffaires")),
        }))
      : Array.from({ length: 6 }).map((_, i) => {
          const dt = new Date();
          dt.setDate(1);
          dt.setMonth(dt.getMonth() - (5 - i));
          const key = dt.toISOString().slice(0, 7);
          return {
            periode: dt.toLocaleDateString("fr-FR", { month: "short" }),
            montant: reservations
              .flatMap((r) => r.paiements ?? [])
              .filter((p) => p.date_paiement.startsWith(key))
              .reduce((s, p) => s + p.montant, 0),
          };
        });

  const fondsApi = pick(d, "fondsEnAttente", "fonds_en_attente");
  const caApi = pick(d, "chiffreAffaires", "chiffre_affaires", "revenusTotal");
  const tauxApi = pick(d, "tauxOccupation", "taux_occupation");

  return {
    chiffre_affaires:
      caApi != null ? num(caApi) : reservations.reduce((s, r) => s + r.montant_paye, 0),
    taux_occupation:
      tauxApi != null
        ? Math.round(num(tauxApi))
        : Math.round(occupation.reduce((s, o) => s + o.taux, 0) / (occupation.length || 1)),
    reservations_actives: actives.length,
    arrivees_jour: reservations.filter((r) => r.date_arrivee === today && r.statut !== "annulee")
      .length,
    departs_jour: reservations.filter((r) => r.date_depart === today && r.statut !== "annulee")
      .length,
    fonds_en_attente:
      fondsApi != null
        ? num(fondsApi)
        : reservations
            .filter((r) => r.statut !== "annulee")
            .reduce((s, r) => s + r.montant_restant, 0),
    revenus,
    occupation_par_logement: occupation,
  };
}

/**
 * GET /api/dashboard/payments?period=day|week|month|year
 *
 * Total, nombre et répartition par mode des paiements confirmés
 * (l'API exclut déjà les paiements en attente, échoués et remboursés).
 */
export function mapPaiementsPeriode(d: Brut): PaiementsPeriode {
  const parModeApi = pick(
    d,
    "parMode",
    "repartitionParMode",
    "repartition",
    "parModePaiement",
  );

  const parMode: Record<string, number> = {};
  if (parModeApi && typeof parModeApi === "object" && !Array.isArray(parModeApi)) {
    for (const [k, v] of Object.entries(parModeApi as Brut)) {
      parMode[k] = num(v);
    }
  }

  return {
    total: num(pick(d, "total", "montantTotal", "totalMontant")),
    nombre: num(pick(d, "nombre", "count", "nombrePaiements")),
    parMode,
  };
}