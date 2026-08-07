import type { Reservation } from "@/lib/types";

export type CouleurStatut = "libre" | "attente" | "du" | "solde" | "termine" | "annule";

export function couleurReservation(r: Reservation): CouleurStatut {
  const today = new Date().toISOString().slice(0, 10);
  if (r.statut === "annulee") return "annule";
  if (r.statut === "terminee" || r.date_depart < today) return "termine";
  if (r.statut === "en_attente") return "attente";
  return r.montant_restant > 0 ? "du" : "solde";
}

export const COULEUR_CLASSES: Record<CouleurStatut, string> = {
  libre: "bg-card",
  attente: "bg-status-attente/20 text-foreground ring-1 ring-inset ring-status-attente/50",
  du: "bg-status-du/25 text-foreground ring-1 ring-inset ring-status-du/60",
  solde: "bg-status-solde/22 text-foreground ring-1 ring-inset ring-status-solde/55",
  termine: "bg-status-termine/30 text-muted-foreground ring-1 ring-inset ring-status-termine/50",
  annule: "bg-status-annule/15 text-status-annule line-through ring-1 ring-inset ring-status-annule/40",
};

export const LEGENDE: { couleur: CouleurStatut; label: string; dot: string }[] = [
  { couleur: "libre", label: "Disponible", dot: "bg-card border border-border" },
  { couleur: "attente", label: "En attente", dot: "bg-status-attente" },
  { couleur: "du", label: "Confirmée · solde dû", dot: "bg-status-du" },
  { couleur: "solde", label: "Confirmée · soldée", dot: "bg-status-solde" },
  { couleur: "termine", label: "Séjour terminé", dot: "bg-status-termine" },
  { couleur: "annule", label: "Annulée", dot: "bg-status-annule" },
];

export function Legende() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-border bg-secondary/50 px-4 py-3">
      {LEGENDE.map((l) => (
        <div key={l.couleur} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`size-3 rounded-sm ${l.dot}`} />
          {l.label}
        </div>
      ))}
    </div>
  );
}
