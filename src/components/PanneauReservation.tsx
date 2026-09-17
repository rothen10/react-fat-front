import { useMutation } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, fcfa } from "@/lib/api";
import type { Reservation, StatutReservation } from "@/lib/types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const nuits = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

/**
 * Détail financier d'une réservation : paiements, statut, dates.
 * Partagé par le calendrier d'un logement et la liste des créances.
 */
export function PanneauReservation({
  reservation,
  onClose,
  agent,
  onChanged,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  agent: string;
  onChanged: () => void;
}) {
  const [montant, setMontant] = useState("");
  const [dates, setDates] = useState<{
    id: string;
    arrivee: string;
    heureArrivee: string;
    depart: string;
    heureDepart: string;
  } | null>(null);
  const r = reservation;

  if (r && dates?.id !== r.id) {
    setDates({
      id: r.id,
      arrivee: r.date_arrivee,
      heureArrivee: r.heure_arrivee,
      depart: r.date_depart,
      heureDepart: r.heure_depart,
    });
  }

  const paiement = useMutation({
    mutationFn: () =>
      api.addPaiement(r!.id, {
        montant: Number(montant),
        date_paiement: iso(new Date()),
        agent,
      }),
    onSuccess: () => {
      toast.success("Paiement enregistré");
      setMontant("");
      onChanged();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Paiement impossible"),
  });

  const majDates = useMutation({
    mutationFn: () =>
      api.updateReservation(r!.id, {
        date_arrivee: dates!.arrivee,
        heure_arrivee: dates!.heureArrivee,
        date_depart: dates!.depart,
        heure_depart: dates!.heureDepart,
      }),
    onSuccess: () => {
      toast.success("Dates du séjour mises à jour");
      onChanged();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Modification impossible"),
  });

  const changerStatut = useMutation({
    mutationFn: (statut: StatutReservation) =>
      statut === "annulee"
        ? api.annulerReservation(r!.id)
        : api.updateReservation(r!.id, { statut }),
    onSuccess: () => {
      toast.success("Réservation mise à jour");
      onChanged();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Mise à jour impossible"),
  });

  const supprimer = useMutation({
    mutationFn: () => api.deleteReservation(r!.id),
    onSuccess: () => {
      toast.success("Réservation supprimée");
      onChanged();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Suppression impossible"),
  });

  const montantNum = Number(montant);
  const paiementInvalide =
    !montant ||
    !Number.isFinite(montantNum) ||
    montantNum <= 0 ||
    (r ? montantNum > r.montant_restant : true);

  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {r ? (
          <>
            <DialogHeader>
              <DialogTitle>{r.client_nom}</DialogTitle>
              <DialogDescription>
                {r.date_arrivee} {r.heure_arrivee} → {r.date_depart} {r.heure_depart} ·{" "}
                {nuits(r.date_arrivee, r.date_depart)} nuit(s)
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Téléphone" value={r.client_telephone} />
              <Info label="Agent" value={r.agent} />
              <Info label="Montant total" value={fcfa(r.montant_total)} />
              <Info label="Déjà payé" value={fcfa(r.montant_paye)} />
              <Info label="Reste à payer" value={fcfa(r.montant_restant)} />
              <Info label="Statut" value={r.statut.replace("_", " ")} />
              {r.origine ? (
                <Info label="Origine" value={r.origine === "en_ligne" ? "En ligne" : "Sur place"} />
              ) : null}
              {r.date_limite_confirmation && r.origine === "en_ligne" ? (
                <Info label="À confirmer avant" value={r.date_limite_confirmation} />
              ) : null}

            </dl>

            {r.paiements?.length ? (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Historique des encaissements
                </p>
                <ul className="space-y-1">
                  {r.paiements.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span className="text-muted-foreground">{p.date_paiement}</span>
                      <span className="font-medium">{fcfa(p.montant)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="paiement">Enregistrer un paiement (espèces)</Label>
              <div className="flex gap-2">
                <Input
                  id="paiement"
                  type="number"
                  placeholder={String(r.montant_restant)}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                />
                <Button
                  disabled={paiementInvalide || paiement.isPending}
                  onClick={() => paiement.mutate()}
                >
                  {paiement.isPending ? "…" : "Encaisser"}
                </Button>
              </div>
              {montant && paiementInvalide ? (
                <p className="text-xs text-destructive">
                  Le montant doit être supérieur à 0 et ne pas dépasser le reste à payer (
                  {fcfa(r.montant_restant)}).
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="harr">Heure d'arrivée</Label>
                <Input
                  id="harr"
                  type="time"
                  value={dates?.heureArrivee ?? r.heure_arrivee}
                  onChange={(e) =>
                    setDates((d) => (d ? { ...d, heureArrivee: e.target.value } : d))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hdep">Heure de départ (prolongation)</Label>
                <Input
                  id="hdep"
                  type="time"
                  value={dates?.heureDepart ?? r.heure_depart}
                  onChange={(e) =>
                    setDates((d) => (d ? { ...d, heureDepart: e.target.value } : d))
                  }
                />
              </div>
              <div className="hidden sm:block" />
              <div className="space-y-2">
                <Label htmlFor="arr">Arrivée</Label>
                <Input
                  id="arr"
                  type="date"
                  value={dates?.arrivee ?? r.date_arrivee}
                  onChange={(e) =>
                    setDates((d) => (d ? { ...d, arrivee: e.target.value } : d))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dep">Départ</Label>
                <Input
                  id="dep"
                  type="date"
                  value={dates?.depart ?? r.date_depart}
                  onChange={(e) => setDates((d) => (d ? { ...d, depart: e.target.value } : d))}
                />
              </div>
              <Button variant="outline" disabled={majDates.isPending} onClick={() => majDates.mutate()}>
                Modifier
              </Button>
            </div>

            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
              <div className="flex gap-2">
                {r.statut === "en_attente" ? (
                  <Button variant="outline" onClick={() => changerStatut.mutate("confirmee")}>
                    Confirmer
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => changerStatut.mutate("terminee")}>
                  Clôturer
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => changerStatut.mutate("annulee")}>
                  <X className="size-4" /> Annuler
                </Button>
                <Button variant="destructive" onClick={() => supprimer.mutate()}>
                  <Trash2 className="size-4" /> Supprimer
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}
