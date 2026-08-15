/**
 * Gestion des nuitées KN Residence.
 *
 * Une nuitée court par défaut de 12:00 le jour d'arrivée
 * à 14:00 le lendemain. Deux séjours peuvent partager la même
 * journée civile, mais jamais le même créneau horaire.
 */

export const HEURE_ARRIVEE_DEFAUT = "12:00";
export const HEURE_DEPART_DEFAUT = "14:00";

/** Jour (YYYY-MM-DD) d'une valeur ISO ou date. */
export const jourDe = (v: string | Date): string =>
  typeof v === "string"
    ? v.slice(0, 10)
    : `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;

/** Heure HH:mm d'une valeur ISO. Renvoie `def` si absente. */
export function heureDe(v: string | undefined, def: string): string {
  if (!v) return def;
  const m = /T(\d{2}):(\d{2})/.exec(v);
  return m ? `${m[1]}:${m[2]}` : def;
}

/** Décalage local au format ±HH:MM. */
function offsetLocal(d: Date): string {
  const min = -d.getTimezoneOffset();
  const signe = min >= 0 ? "+" : "-";
  const abs = Math.abs(min);
  return `${signe}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** Assemble un jour et une heure en ISO local (2026-09-20T12:00:00+01:00). */
export function combiner(jour: string, heure: string): string {
  const h = /^\d{2}:\d{2}$/.test(heure) ? heure : HEURE_ARRIVEE_DEFAUT;
  const [Y, M, D] = jour.split("-").map(Number);
  const [hh, mm] = h.split(":").map(Number);
  const d = new Date(Y!, (M ?? 1) - 1, D ?? 1, hh ?? 12, mm ?? 0, 0);
  return `${jour}T${h}:00${offsetLocal(d)}`;
}

/** Horodatage numérique d'un couple jour + heure. */
export const instant = (jour: string, heure: string): number =>
  new Date(combiner(jour, heure)).getTime();

/** Nuitées facturées entre deux jours. */
export const nuitsEntreJours = (a: string, b: string): number =>
  Math.max(1, Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000));

/** Créneau [début, fin[ d'une réservation. */
export interface Creneau {
  debut: number;
  fin: number;
}

export const creneau = (
  jourDebut: string,
  heureDebut: string,
  jourFin: string,
  heureFin: string,
): Creneau => ({ debut: instant(jourDebut, heureDebut), fin: instant(jourFin, heureFin) });

/** Deux créneaux se chevauchent-ils réellement (à l'heure près) ? */
export const seChevauchent = (a: Creneau, b: Creneau): boolean => a.debut < b.fin && a.fin > b.debut;

/** Libellé lisible « 20/09 12:00 → 21/09 14:00 ». */
export const libelleSejour = (
  jourDebut: string,
  heureDebut: string,
  jourFin: string,
  heureFin: string,
): string => `${jourDebut} ${heureDebut} → ${jourFin} ${heureFin}`;
