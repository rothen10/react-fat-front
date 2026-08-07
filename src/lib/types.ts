export type Role = "gerant" | "proprietaire";

export type StatutReservation = "en_attente" | "confirmee" | "terminee" | "annulee";

export interface Logement {
  id: string;
  nom: string;
  type: "appartement" | "studio";
  disposition: string;
  tarif_nuit: number;
  statut: "disponible" | "occupe" | "maintenance";
  equipements?: string[];
  photos?: string[];
  statut_jour?: "disponible" | "occupe";
}

export interface Client {
  id: string;
  nom_complet: string;
  telephone: string;
  filiation?: string;
  lieu_naissance?: string;
  date_naissance?: string;
  nationalite?: string;
  profession?: string;
  employeur?: string;
  residence_cameroun?: string;
  domicile_etranger?: string;
  piece_identite_1?: string;
  piece_identite_2?: string;
  etat_civil?: string;
}

export interface Paiement {
  id: string;
  reservation_id: string;
  montant: number;
  date_paiement: string;
  agent: string;
}

export interface Reservation {
  id: string;
  logement_id: string;
  client_id: string;
  client_nom: string;
  client_telephone: string;
  nombre_personnes?: number;
  date_arrivee: string;
  date_depart: string;
  motif?: string;
  provenance?: string;
  destination?: string;
  statut: StatutReservation;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  agent: string;
  paiements?: Paiement[];
}

export interface DashboardStats {
  chiffre_affaires: number;
  taux_occupation: number;
  reservations_actives: number;
  arrivees_jour: number;
  departs_jour: number;
  fonds_en_attente: number;
  revenus: { periode: string; montant: number }[];
  occupation_par_logement: { logement: string; taux: number }[];
}

export interface Dette {
  reservation_id: string;
  logement: string;
  client: string;
  telephone: string;
  montant_du: number;
  date_arrivee: string;
  date_depart: string;
}

export interface ClientStat {
  client: Client;
  nombre_reservations: number;
  jours_cumules: number;
}
