import type {
  Client,
  ClientStat,
  DashboardStats,
  Dette,
  Logement,
  Paiement,
  Reservation,
} from "./types";

/**
 * Jeu de données local utilisé uniquement lorsque l'API (port 3001)
 * n'est pas joignable, afin que l'interface reste explorable.
 */

const uid = () => Math.random().toString(36).slice(2, 10);

const SEED: Omit<Logement, "id">[] = [
  {
    nom: "Appartement A1",
    type: "appartement",
    disposition: "2 chambres, salon, 2 douches, cuisine, balcon",
    tarif_nuit: 35000,
    statut: "disponible",
  },
  {
    nom: "Appartement A2",
    type: "appartement",
    disposition: "2 chambres, salon, 2 douches, cuisine, balcon (spacieux)",
    tarif_nuit: 40000,
    statut: "disponible",
  },
  {
    nom: "Appartement A3",
    type: "appartement",
    disposition: "2 chambres, salon, 2 douches, cuisine, balcon (spacieux)",
    tarif_nuit: 40000,
    statut: "disponible",
  },
  {
    nom: "Studio S1",
    type: "studio",
    disposition: "1 chambre, salon, douche, cuisine, balcon",
    tarif_nuit: 30000,
    statut: "disponible",
  },
  {
    nom: "Studio S2",
    type: "studio",
    disposition: "1 chambre, salon, douche, cuisine, balcon",
    tarif_nuit: 30000,
    statut: "disponible",
  },
  {
    nom: "Studio S3",
    type: "studio",
    disposition: "1 chambre, salon, douche, balcon",
    tarif_nuit: 20000,
    statut: "disponible",
  },
  {
    nom: "Studio S4",
    type: "studio",
    disposition: "1 chambre, salon + cuisine ouverte, douche, balcon",
    tarif_nuit: 25000,
    statut: "disponible",
  },
  {
    nom: "Studio S5",
    type: "studio",
    disposition: "1 chambre, salon + cuisine ouverte, douche, balcon",
    tarif_nuit: 25000,
    statut: "disponible",
  },
  {
    nom: "Studio S6",
    type: "studio",
    disposition: "1 chambre, salon + cuisine ouverte, douche, balcon",
    tarif_nuit: 25000,
    statut: "disponible",
  },
  {
    nom: "Studio S7",
    type: "studio",
    disposition: "1 chambre, salon + cuisine ouverte, douche, balcon",
    tarif_nuit: 25000,
    statut: "disponible",
  },
];

const EQUIPEMENTS = ["Climatisation", "Wi-Fi", "Eau chaude", "TV", "Parking", "Groupe électrogène"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const nuits = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

interface DB {
  logements: Logement[];
  clients: Client[];
  reservations: Reservation[];
  paiements: Paiement[];
}

const db: DB = { logements: [], clients: [], reservations: [], paiements: [] };

function seed() {
  db.logements = SEED.map((l) => ({ ...l, id: uid(), equipements: EQUIPEMENTS }));

  const today = new Date();
  const clientsSeed = [
    { nom_complet: "Marc Ondoa", telephone: "+237 699 12 34 56", nationalite: "Camerounaise" },
    { nom_complet: "Aïcha Bello", telephone: "+237 677 88 21 09", nationalite: "Camerounaise" },
    { nom_complet: "Jean-Paul Kamdem", telephone: "+237 655 40 77 12", nationalite: "Camerounaise" },
  ];
  db.clients = clientsSeed.map((c) => ({ id: uid(), profession: "Commerçant", ...c }));

  const plans: [number, number, number, Reservation["statut"], number][] = [
    // [indexLogement, offsetDebut, nuits, statut, ratioPaye]
    [0, -3, 5, "confirmee", 1],
    [1, 1, 4, "confirmee", 0.5],
    [3, 0, 3, "en_attente", 0],
    [5, -12, 4, "terminee", 1],
    [6, 6, 2, "confirmee", 0.4],
    [8, 2, 6, "confirmee", 1],
  ];

  plans.forEach(([li, off, n, statut, ratio], i) => {
    const logement = db.logements[li];
    const client = db.clients[i % db.clients.length];
    const arrivee = addDays(today, off);
    const depart = addDays(arrivee, n);
    const total = logement.tarif_nuit * n;
    const paye = Math.round(total * ratio);
    const r: Reservation = {
      id: uid(),
      logement_id: logement.id,
      client_id: client.id,
      client_nom: client.nom_complet,
      client_telephone: client.telephone,
      nombre_personnes: 2,
      date_arrivee: iso(arrivee),
      date_depart: iso(depart),
      motif: "Séjour d'affaires",
      statut,
      montant_total: total,
      montant_paye: paye,
      montant_restant: total - paye,
      agent: "Sylvie",
    };
    db.reservations.push(r);
    if (paye > 0) {
      db.paiements.push({
        id: uid(),
        reservation_id: r.id,
        montant: paye,
        date_paiement: iso(arrivee),
        agent: "Sylvie",
      });
    }
  });
}
seed();

function recompute(r: Reservation) {
  r.montant_paye = db.paiements
    .filter((p) => p.reservation_id === r.id)
    .reduce((s, p) => s + p.montant, 0);
  r.montant_restant = Math.max(0, r.montant_total - r.montant_paye);
  return r;
}

const occupeAujourdhui = (logementId: string) => {
  const t = iso(new Date());
  return db.reservations.some(
    (r) =>
      r.logement_id === logementId &&
      r.statut !== "annulee" &&
      r.date_arrivee <= t &&
      r.date_depart > t,
  );
};

export const demoApi = {
  logements(): Logement[] {
    return db.logements.map((l) => ({
      ...l,
      statut_jour: occupeAujourdhui(l.id) ? "occupe" : "disponible",
    }));
  },
  logement(id: string): Logement | undefined {
    return this.logements().find((l) => l.id === id);
  },
  updateLogement(id: string, patch: Partial<Logement>) {
    const l = db.logements.find((x) => x.id === id);
    if (l) Object.assign(l, patch);
    return l;
  },
  reservationsLogement(id: string): Reservation[] {
    return db.reservations
      .filter((r) => r.logement_id === id)
      .map((r) => ({
        ...recompute(r),
        paiements: db.paiements.filter((p) => p.reservation_id === r.id),
      }));
  },
  clients(): Client[] {
    return db.clients;
  },
  createClient(c: Omit<Client, "id">): Client {
    const nc = { ...c, id: uid() };
    db.clients.push(nc);
    return nc;
  },
  createReservation(input: Partial<Reservation> & { client?: Omit<Client, "id"> }): Reservation {
    const logement = db.logements.find((l) => l.id === input.logement_id)!;
    let clientId = input.client_id;
    let client = db.clients.find((c) => c.id === clientId);
    if (!client && input.client) {
      client = this.createClient(input.client);
      clientId = client.id;
    }
    const n = nuits(input.date_arrivee!, input.date_depart!);
    const r: Reservation = {
      id: uid(),
      logement_id: logement.id,
      client_id: clientId ?? "",
      client_nom: client?.nom_complet ?? input.client_nom ?? "",
      client_telephone: client?.telephone ?? input.client_telephone ?? "",
      nombre_personnes: input.nombre_personnes,
      date_arrivee: input.date_arrivee!,
      date_depart: input.date_depart!,
      motif: input.motif,
      provenance: input.provenance,
      destination: input.destination,
      statut: input.statut ?? "en_attente",
      montant_total: input.montant_total ?? logement.tarif_nuit * n,
      montant_paye: 0,
      montant_restant: 0,
      agent: input.agent ?? "—",
    };
    db.reservations.push(r);
    const avance = (input as { montant_verse?: number }).montant_verse ?? 0;
    if (avance > 0) {
      db.paiements.push({
        id: uid(),
        reservation_id: r.id,
        montant: avance,
        date_paiement: iso(new Date()),
        agent: r.agent,
      });
    }
    return recompute(r);
  },
  updateReservation(id: string, patch: Partial<Reservation>) {
    const r = db.reservations.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return r ? recompute(r) : undefined;
  },
  deleteReservation(id: string) {
    db.reservations = db.reservations.filter((r) => r.id !== id);
    db.paiements = db.paiements.filter((p) => p.reservation_id !== id);
  },
  addPaiement(id: string, p: { montant: number; date_paiement: string; agent: string }) {
    db.paiements.push({ id: uid(), reservation_id: id, ...p });
    const r = db.reservations.find((x) => x.id === id);
    return r ? recompute(r) : undefined;
  },
  dettes(): Dette[] {
    return db.reservations
      .map(recompute)
      .filter((r) => r.statut !== "annulee" && r.montant_restant > 0)
      .map((r) => ({
        reservation_id: r.id,
        logement: db.logements.find((l) => l.id === r.logement_id)?.nom ?? "",
        client: r.client_nom,
        telephone: r.client_telephone,
        montant_du: r.montant_restant,
        date_arrivee: r.date_arrivee,
        date_depart: r.date_depart,
      }));
  },
  clientsStats(): ClientStat[] {
    return db.clients.map((c) => {
      const rs = db.reservations.filter((r) => r.client_id === c.id && r.statut !== "annulee");
      return {
        client: c,
        nombre_reservations: rs.length,
        jours_cumules: rs.reduce((s, r) => s + nuits(r.date_arrivee, r.date_depart), 0),
      };
    });
  },
  stats(periode: string): DashboardStats {
    const today = new Date();
    const start = new Date(today);
    if (periode === "semaine") start.setDate(today.getDate() - 7);
    else if (periode === "mois") start.setMonth(today.getMonth() - 1);
    else if (periode === "annee") start.setFullYear(today.getFullYear() - 1);
    const from = iso(start);

    const paiements = db.paiements.filter((p) => p.date_paiement >= from);
    const actives = db.reservations
      .map(recompute)
      .filter((r) => r.statut === "confirmee" || r.statut === "en_attente");
    const t = iso(today);

    const joursPeriode = Math.max(1, nuits(from, iso(addDays(today, 1))));
    const occupation = db.logements.map((l) => {
      const j = db.reservations
        .filter((r) => r.logement_id === l.id && r.statut !== "annulee" && r.date_depart >= from)
        .reduce((s, r) => s + nuits(r.date_arrivee, r.date_depart), 0);
      return { logement: l.nom, taux: Math.min(100, Math.round((j / joursPeriode) * 100)) };
    });

    const revenus = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const key = iso(d).slice(0, 7);
      return {
        periode: d.toLocaleDateString("fr-FR", { month: "short" }),
        montant: db.paiements
          .filter((p) => p.date_paiement.startsWith(key))
          .reduce((s, p) => s + p.montant, 0),
      };
    });

    return {
      chiffre_affaires: paiements.reduce((s, p) => s + p.montant, 0),
      taux_occupation: Math.round(
        occupation.reduce((s, o) => s + o.taux, 0) / (occupation.length || 1),
      ),
      reservations_actives: actives.length,
      arrivees_jour: db.reservations.filter((r) => r.date_arrivee === t && r.statut !== "annulee")
        .length,
      departs_jour: db.reservations.filter((r) => r.date_depart === t && r.statut !== "annulee")
        .length,
      fonds_en_attente: this.dettes().reduce((s, d) => s + d.montant_du, 0),
      revenus,
      occupation_par_logement: occupation,
    };
  },
};
