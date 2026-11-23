import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, fcfa } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canManageReservations } from "@/lib/session";
import { creneau, nuitsEntreJours, dateAuLieu } from "@/lib/dates";
import { confirmationIso } from "@/lib/reservation-rules";
import type { Reservation, StatutReservation } from "@/lib/types";

/** Shared financial details; management is available only to the exact manager role. */
export function PanneauReservation({ reservation, onClose, agent, onChanged }: {
  reservation: Reservation | null; onClose: () => void; agent: string; onChanged: () => void;
}) {
  const { session } = useAuth();
  const gerant = canManageReservations(session?.role);
  const qc = useQueryClient();
  const { data: r, error: loadError, isFetching } = useQuery({
    queryKey: ["reservation", reservation?.id],
    queryFn: () => {
      if (!reservation) throw new Error("Réservation absente");
      return api.getReservation(reservation.id);
    },
    enabled: !!reservation,
    staleTime: 0,
  });
  const [montant, setMontant] = useState("");
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [error, setError] = useState("");
  const [dates, setDates] = useState<{
    id: string; arrivee: string; heureArrivee: string; depart: string; heureDepart: string; total: string; limite: string;
  } | null>(null);
  if (r && dates?.id !== r.id) {
    const limite = r.date_limite_confirmation ? dateAuLieu(r.date_limite_confirmation) : null;
    setDates({ id: r.id, arrivee: r.date_arrivee, heureArrivee: r.heure_arrivee, depart: r.date_depart, heureDepart: r.heure_depart, total: String(r.montant_total), limite: limite ? `${limite.jour}T${limite.heure || "12:00"}` : "" });
    setMontant(""); setError(""); setConfirmationSuppression(false);
  }
  const changed = () => {
    for (const key of ["calendrier", "reservation", "reservations-client", "stats", "dettes", "paiements", "paiements-resume", "clients-stats", "logements"]) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
    onChanged();
  };
  const requireManager = () => {
    if (!gerant) throw new Error("Seul un gérant peut gérer les réservations.");
    if (!r) throw new Error("Réservation absente");
    return r;
  };
  const fail = (e: Error) => { setError(e.message); toast.error(e.message); };
  const success = (message: string) => {
    toast.success(message); setError(""); setDates(null); changed(); onClose();
  };
  const paiement = useMutation({
    mutationFn: () => api.addPaiement(requireManager().id, { montant: Number(montant), date_paiement: new Date().toISOString(), agent }),
    onSuccess: () => { setMontant(""); success("Paiement enregistré"); }, onError: fail,
  });
  const majDates = useMutation({
    mutationFn: () => {
      const current = requireManager();
      if (!dates) throw new Error("Dates absentes");
      return api.updateReservation(current.id, {
        date_arrivee: dates.arrivee, heure_arrivee: dates.heureArrivee,
        date_depart: dates.depart, heure_depart: dates.heureDepart,
        montant_total: Number(dates.total),
        ...(dates.limite ? { date_limite_confirmation: confirmationIso(dates.limite, dates.arrivee, dates.heureArrivee) } : {}),
      });
    }, onSuccess: () => success("Réservation mise à jour"), onError: fail,
  });
  const changerStatut = useMutation({
    mutationFn: (statut: StatutReservation) => {
      const current = requireManager();
      return statut === "annulee" ? api.annulerReservation(current.id) : api.updateReservation(current.id, { statut });
    }, onSuccess: () => success("Réservation mise à jour"), onError: fail,
  });
  const supprimer = useMutation({
    mutationFn: () => {
      if (!confirmationSuppression) throw new Error("Confirmez la suppression définitive.");
      return api.deleteReservation(requireManager().id);
    }, onSuccess: () => { setConfirmationSuppression(false); success("Réservation supprimée"); }, onError: fail,
  });
  const busy = paiement.isPending || majDates.isPending || changerStatut.isPending || supprimer.isPending;
  const montantNum = Number(montant);
  const paiementInvalide = !montant || !Number.isFinite(montantNum) || montantNum <= 0 || !r || montantNum > r.montant_restant;
  const interval = dates ? creneau(dates.arrivee, dates.heureArrivee, dates.depart, dates.heureDepart) : null;
  const datesInvalides = !interval || !Number.isFinite(interval.debut) || !Number.isFinite(interval.fin) || interval.fin <= interval.debut;
  const totalInvalide = !dates?.total || !Number.isFinite(Number(dates.total)) || Number(dates.total) <= 0;
  let limiteInvalide = false;
  if (dates?.limite) { try { confirmationIso(dates.limite, dates.arrivee, dates.heureArrivee); } catch { limiteInvalide = true; } }

  return <>
    <Dialog open={!!reservation} onOpenChange={(open) => { if (!open && !busy) { setDates(null); onClose(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{r?.client_nom ?? "Détails de la réservation"}</DialogTitle>
          <DialogDescription>{r ? `${r.date_arrivee} ${r.heure_arrivee} → ${r.date_depart} ${r.heure_depart} · ${nuitsEntreJours(r.date_arrivee, r.date_depart)} nuit(s) · Douala (UTC+01:00)` : "Chargement des informations du séjour."}</DialogDescription>
        </DialogHeader>
        {loadError ? <p role="alert" className="text-sm text-destructive">{loadError.message}</p> : null}
        {!r && isFetching ? <p className="text-sm text-muted-foreground">Chargement…</p> : null}
        {r && !loadError ? <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Téléphone" value={r.client_telephone} />
            <Info label="Agent" value={r.agent} />
            <Info label="Montant convenu" value={fcfa(r.montant_total)} />
            <Info label="Déjà payé" value={fcfa(r.montant_paye)} />
            <Info label="Solde" value={fcfa(r.montant_restant)} />
            <Info label="Statut" value={r.statut.replace("_", " ")} />
            {r.origine ? <Info label="Origine" value={r.origine === "en_ligne" ? "En ligne" : "Sur place"} /> : null}
            {r.date_limite_confirmation ? <Info label="À confirmer avant" value={dates?.limite.replace("T", " ") ?? r.date_limite_confirmation} /> : null}
          </dl>
          {r.paiements?.length ? <div className="border-t border-border pt-3 text-sm">
            <p className="mb-2 text-xs uppercase text-muted-foreground">Historique des encaissements</p>
            <ul className="space-y-1">{r.paiements.map((p) => <li key={p.id} className="flex justify-between gap-2"><span className="text-muted-foreground">{p.date_paiement}</span><span className="font-medium">{fcfa(p.montant)}</span></li>)}</ul>
          </div> : null}
          {gerant ? <>
            <Separator />
            <fieldset disabled={busy || isFetching} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paiement">Enregistrer un paiement (espèces)</Label>
                <div className="flex gap-2">
                  <Input id="paiement" type="number" min="1" max={r.montant_restant} placeholder={String(r.montant_restant)} value={montant} onChange={(e) => setMontant(e.target.value)} />
                  <Button disabled={paiementInvalide || busy} onClick={() => paiement.mutate()}>Encaisser</Button>
                </div>
                {montant && paiementInvalide ? <p className="text-xs text-destructive">Le montant doit être supérieur à 0 et ne pas dépasser le solde ({fcfa(r.montant_restant)}).</p> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ label="Arrivée" type="date" value={dates?.arrivee ?? r.date_arrivee} onChange={(v) => setDates((d) => d ? { ...d, arrivee: v } : d)} />
                <Champ label="Heure d'arrivée" type="time" value={dates?.heureArrivee ?? r.heure_arrivee} onChange={(v) => setDates((d) => d ? { ...d, heureArrivee: v } : d)} />
                <Champ label="Départ" type="date" value={dates?.depart ?? r.date_depart} onChange={(v) => setDates((d) => d ? { ...d, depart: v } : d)} />
                <Champ label="Heure de départ (prolongation)" type="time" value={dates?.heureDepart ?? r.heure_depart} onChange={(v) => setDates((d) => d ? { ...d, heureDepart: v } : d)} />
                <Champ label="Montant total convenu (XAF)" type="number" value={dates?.total ?? ""} onChange={(v) => setDates((d) => d ? { ...d, total: v } : d)} />
                <Champ label="Date limite de confirmation" type="datetime-local" value={dates?.limite ?? ""} onChange={(v) => setDates((d) => d ? { ...d, limite: v } : d)} />
              </div>
              {datesInvalides ? <p className="text-sm text-destructive">Le départ doit être postérieur à l’arrivée (heures comprises).</p> : null}
              {limiteInvalide ? <p className="text-sm text-destructive">La date limite doit précéder le début du séjour.</p> : null}
              {totalInvalide ? <p className="text-sm text-destructive">Le montant convenu doit être supérieur à 0 XAF.</p> : null}
              <Button variant="outline" disabled={datesInvalides || totalInvalide || limiteInvalide || busy} onClick={() => majDates.mutate()}>Modifier</Button>
              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                {r.statut === "en_attente" ? <Button variant="outline" disabled={busy} onClick={() => changerStatut.mutate("confirmee")}>Confirmer</Button> : null}
                <div className="flex gap-2">
                  {r.statut !== "annulee" ? <Button variant="outline" disabled={busy} onClick={() => changerStatut.mutate("annulee")}><X className="size-4" /> Annuler</Button> : null}
                  <Button variant="destructive" disabled={busy} onClick={() => { setError(""); setConfirmationSuppression(true); }}><Trash2 className="size-4" /> Supprimer</Button>
                </div>
              </DialogFooter>
            </fieldset>
          </> : null}
        </> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
    <Dialog open={confirmationSuppression && !!reservation && gerant} onOpenChange={(o) => { if (!supprimer.isPending) setConfirmationSuppression(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Supprimer définitivement cette réservation ?</DialogTitle><DialogDescription>Le séjour de {r?.client_nom} sera supprimé définitivement. Pour conserver son historique, utilisez plutôt l’annulation.</DialogDescription></DialogHeader>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" disabled={supprimer.isPending} onClick={() => setConfirmationSuppression(false)}>Conserver</Button>
          <Button variant="destructive" disabled={supprimer.isPending} onClick={() => supprimer.mutate()}>{supprimer.isPending ? "Suppression…" : "Supprimer définitivement"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
function Champ({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  const id = `detail-${label}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>;
}
