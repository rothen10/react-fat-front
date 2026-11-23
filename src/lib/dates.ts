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
    ? (/T/.test(v) ? dateAuLieu(v).jour : v.slice(0, 10))
    : dateAuLieu(v.toISOString()).jour;

/** Douala n'observe pas de changement saisonnier : UTC+01:00 toute l'année. */
export function dateAuLieu(value: string): { jour: string; heure: string } {
  if (!/T/.test(value)) return { jour: value.slice(0, 10), heure: "" };
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}+01:00`;
  const ts = Date.parse(normalized);
  if (!Number.isFinite(ts)) return { jour: "", heure: "" };
  const local = new Date(ts + 3600000).toISOString();
  return { jour: local.slice(0, 10), heure: local.slice(11, 16) };
}

/** Heure HH:mm d'une valeur ISO. Renvoie `def` si absente. */
export function heureDe(v: string | undefined, def: string): string {
  if (!v) return def;
  return dateAuLieu(v).heure || def;
}

/** Assemble un jour et une heure en ISO local (2026-09-20T12:00:00+01:00). */
export function combiner(jour: string, heure: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(heure)) return "";
  const iso = `${jour}T${heure}:00+01:00`;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts) || new Date(ts + 3600000).toISOString().slice(0, 10) !== jour) return "";
  return iso;
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
