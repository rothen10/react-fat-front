/**
 * Contrats renvoyés par l'API NestJS KN Résidence (http://localhost:3001/api)
 * et adaptateurs vers les types internes de l'interface.
 */
import type { Client, ClientStat, DashboardStats, Dette, Logement, Paiement, Reservation, StatutReservation } from "./types";

export interface ApiLogement {
  id: string;
  nom: string;
  type: string;
  disposition?: string | null;
  tarif_nuit: number | string;
  statut?: string | null;
  equipements?: string[] | null;
  photos?: string[] | null;
  disponible?: boolean | null;
  statut_jour?: string | null;
}

export interface ApiClient {
  id: string;
  nom?: string | null;
  nom_complet?: string | null;
  cni?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  nationalite?: string | null;
  profession?: string | null;
}

export interface ApiPaiement {
  id: string;
  reservation_id: string;
  montant: number | string;
  mode?: string | null;
  statut?: string | null;
  date_paiement?: string | null;
  reference?: string | null;
  created_at?: string | null;
}

export interface ApiReservation {
  id: string;
  logement_id: string;
  client_id: string;
  logement?: ApiLogement | null;
  client?: ApiClient | null;
  date_arrivee: string;
  date_depart: string;
  nombre_nuits?: number | null;
  tarif_nuit?: number | string | null;
  montant_total?: number | string | null;
  montant_paye?: number | string | null;
  montant_restant?: number | string | null;
  statut?: string | null;
  notes?: string | null;
  paiements?: ApiPaiement[] | null;
}

export interface ApiDashboard {
  chiffre_affaires?: number | string | null;
  total_reservations?: number | null;
  nombre_reservations?: number | null;
  total_logements?: number | null;
  total_clients?: number | null;
  fonds_en_attente?: number | string | null;
  reservations_par_statut?: Record<string, number> | null;
  taux_occupation?: number | null;
  occupation?: { logement?: string; nom?: string; taux?: number; occupe?: boolean }[] | null;
  logements_occupes?: number | null;
  logements_disponibles?: number | null;
  revenus?: { periode?: string; mois?: string; montant?: number | string }[] | null;
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const jour = (v?: string | null): string => (v ? String(v).slice(0, 10) : "");

export const nuitsEntre = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export function mapLogement(l: ApiLogement): Logement {
  const statut = (l.statut ?? "disponible") as Logement["statut"];
  const jourStatut =
    l.statut_jour === "occupe" || l.disponible === false || statut === "occupe"
      ? "occupe"
      : "disponible";
  return {
    id: l.id,
    nom: l.nom,
    type: l.type === "appartement" ? "appartement" : "studio",
    disposition: l.disposition ?? "",
    tarif_nuit: num(l.tarif_nuit),
    statut: ["disponible", "occupe", "maintenance"].includes(statut) ? statut : "disponible",
    equipements: l.equipements ?? undefined,
    photos: l.photos ?? undefined,
    statut_jour: jourStatut,
  };
}

export function mapClient(c: ApiClient): Client {
  return {
    id: c.id,
    nom_complet: c.nom_complet ?? c.nom ?? "—",
    telephone: c.telephone ?? "",
    piece_identite_1: c.cni ?? undefined,
    nationalite: c.nationalite ?? undefined,
    profession: c.profession ?? undefined,
    residence_cameroun: c.adresse ?? undefined,
  };
}

export function mapPaiement(p: ApiPaiement): Paiement {
  return {
    id: p.id,
    reservation_id: p.reservation_id,
    montant: num(p.montant),
    date_paiement: jour(p.date_paiement ?? p.created_at),
    agent: p.mode ? `Espèces (${p.mode})` : "—",
  };
}

function mapStatut(s?: string | null, dateDepart?: string): StatutReservation {
  const v = (s ?? "en_attente").toLowerCase();
  if (v.startsWith("annul")) return "annulee";
  if (v.startsWith("termin")) return "terminee";
  if (v.startsWith("confirm")) {
    if (dateDepart && dateDepart < new Date().toISOString().slice(0, 10)) return "terminee";
    return "confirmee";
  }
  return "en_attente";
}

export function mapReservation(r: ApiReservation): Reservation {
  const paiements = (r.paiements ?? []).map(mapPaiement);
  const arrivee = jour(r.date_arrivee);
  const depart = jour(r.date_depart);
  const nuits = r.nombre_nuits ?? nuitsEntre(arrivee, depart);
  const total = r.montant_total != null ? num(r.montant_total) : num(r.tarif_nuit) * nuits;
  const paye =
    r.montant_paye != null ? num(r.montant_paye) : paiements.reduce((s, p) => s + p.montant, 0);
  return {
    id: r.id,
    logement_id: r.logement_id,
    client_id: r.client_id,
    client_nom: r.client?.nom_complet ?? r.client?.nom ?? "—",
    client_telephone: r.client?.telephone ?? "",
    date_arrivee: arrivee,
    date_depart: depart,
    motif: r.notes ?? undefined,
    statut: mapStatut(r.statut, depart),
    montant_total: total,
    montant_paye: paye,
    montant_restant:
      r.montant_restant != null ? num(r.montant_restant) : Math.max(0, total - paye),
    agent: "—",
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

/** Complète les indicateurs manquants de l'API à partir des réservations réelles. */
export function mapDashboard(
  d: ApiDashboard,
  reservations: Reservation[],
  logements: Logement[],
  periode: string,
): DashboardStats {
  const today = new Date().toISOString().slice(0, 10);
  const actives = reservations.filter((r) => r.statut === "confirmee" || r.statut === "en_attente");

  const occupation =
    d.occupation && d.occupation.length
      ? d.occupation.map((o) => ({
          logement: o.logement ?? o.nom ?? "—",
          taux: Math.round(o.taux ?? (o.occupe ? 100 : 0)),
        }))
      : logements.map((l) => {
          const jours = reservations
            .filter((r) => r.logement_id === l.id && r.statut !== "annulee")
            .reduce((s, r) => s + nuitsEntre(r.date_arrivee, r.date_depart), 0);
          const fenetre = periode === "semaine" ? 7 : periode === "annee" ? 365 : 30;
          return { logement: l.nom, taux: Math.min(100, Math.round((jours / fenetre) * 100)) };
        });

  const revenus =
    d.revenus && d.revenus.length
      ? d.revenus.map((r) => ({ periode: r.periode ?? r.mois ?? "", montant: num(r.montant) }))
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

  const fonds =
    d.fonds_en_attente != null
      ? num(d.fonds_en_attente)
      : reservations
          .filter((r) => r.statut !== "annulee")
          .reduce((s, r) => s + r.montant_restant, 0);

  return {
    chiffre_affaires:
      d.chiffre_affaires != null
        ? num(d.chiffre_affaires)
        : reservations.reduce((s, r) => s + r.montant_paye, 0),
    taux_occupation:
      d.taux_occupation != null
        ? Math.round(d.taux_occupation)
        : Math.round(occupation.reduce((s, o) => s + o.taux, 0) / (occupation.length || 1)),
    reservations_actives: actives.length,
    arrivees_jour: reservations.filter((r) => r.date_arrivee === today && r.statut !== "annulee")
      .length,
    departs_jour: reservations.filter((r) => r.date_depart === today && r.statut !== "annulee")
      .length,
    fonds_en_attente: fonds,
    revenus,
    occupation_par_logement: occupation,
  };
}
