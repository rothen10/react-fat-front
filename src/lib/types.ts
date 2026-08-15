export type Role = "gerant" | "proprietaire";

export type StatutReservation = "en_attente" | "confirmee" | "terminee" | "annulee";

export interface Logement {
  id: string;
  nom: string;
  type: "appartement" | "studio";
  disposition: string;
  tarif_nuit: number;
  statut: "disponible" | "occupe" | "maintenance";
  equipements?: string[] | undefined;
  photos?: string[] | undefined;
  statut_jour?: "disponible" | "occupe" | undefined;
}

export interface Client {
  id: string;
  nom_complet: string;
  telephone: string;
  email?: string | undefined;

  filiation?: string | undefined;
  lieu_naissance?: string | undefined;
  date_naissance?: string | undefined;
  nationalite?: string | undefined;
  profession?: string | undefined;
  employeur?: string | undefined;
  residence_cameroun?: string | undefined;
  domicile_etranger?: string | undefined;
  piece_identite_1?: string | undefined;
  piece_identite_2?: string | undefined;
  etat_civil?: string | undefined;
}

export type CanalPaiement = "especes" | "en_ligne";

export interface Paiement {
  id: string;
  reservation_id: string;
  montant: number;
  date_paiement: string;
  agent: string;
  /** Mode brut renvoyé par l'API (especes, om, momo, moneroo…). */
  mode: string;
  canal: CanalPaiement;
  client_nom?: string | undefined;
  logement_nom?: string | undefined;
}

export interface NotificationItem {
  id: string;
  type: string;
  titre: string;
  message: string;
  reservation_id?: string | undefined;
  lu: boolean;
  created_at: string;
}

export interface Reservation {
  id: string;
  logement_id: string;
  client_id: string;
  client_nom: string;
  client_telephone: string;
  nombre_personnes?: number | undefined;
  /** Jour d'arrivée (YYYY-MM-DD). */
  date_arrivee: string;
  /** Jour de départ (YYYY-MM-DD). */
  date_depart: string;
  /** Heure d'arrivée (HH:mm), 12:00 par défaut. */
  heure_arrivee: string;
  /** Heure de départ (HH:mm), 14:00 par défaut. */
  heure_depart: string;
  /** Échéance de confirmation pour une réservation en ligne (YYYY-MM-DD). */
  date_limite_confirmation?: string | undefined;
  /** Canal d'origine de la réservation. */
  origine?: "en_ligne" | "sur_place" | undefined;
  motif?: string | undefined;
  provenance?: string | undefined;
  destination?: string | undefined;
  statut: StatutReservation;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  agent: string;
  paiements?: Paiement[] | undefined;
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
