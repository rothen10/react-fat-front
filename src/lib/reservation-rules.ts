import { combiner, instant } from './dates';

export function validateStay(startDay: string, startTime: string, endDay: string, endTime: string) {
  const start = instant(startDay, startTime);
  const end = instant(endDay, endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("Le départ doit être postérieur à l'arrivée (heures comprises).");
  }
}

export function confirmationIso(value: string, startDay: string, startTime: string) {
  const [day, time] = value.split('T');
  const iso = combiner(day ?? '', time?.slice(0, 5) ?? '12:00');
  if (!Number.isFinite(Date.parse(iso)) || Date.parse(iso) >= instant(startDay, startTime)) {
    throw new Error('La date limite de confirmation doit être avant le début du séjour.');
  }
  return iso;
}

export function negotiatedTotal(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const total = Number(value);
  if (!Number.isFinite(total) || total <= 0) throw new Error('Le montant total convenu doit être supérieur à 0 XAF.');
  return total;
}