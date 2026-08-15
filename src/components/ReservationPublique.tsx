import { useMutation } from "@tanstack/react-query";
import { CalendarClock, FileDown } from "lucide-react";
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
import {
  HEURE_ARRIVEE_DEFAUT,
  HEURE_DEPART_DEFAUT,
  instant,
  jourDe,
  nuitsEntreJours,
} from "@/lib/dates";
import type { Logement, Reservation } from "@/lib/types";

const isoJour = (d: Date) => jourDe(d);

/**
 * Formulaire public : le client réserve à distance sans payer.
 * Il choisit ses horaires et une date limite pour venir confirmer
 * sa réservation sur place par un paiement en espèces.
 */
export function ReservationPublique({
  logement,
  onClose,
}: {
  logement: Logement | null;
  onClose: () => void;
}) {
  const demain = isoJour(new Date(Date.now() + 86400000));
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    personnes: "1",
    arrivee: isoJour(new Date()),
    heureArrivee: HEURE_ARRIVEE_DEFAUT,
    depart: demain,
    heureDepart: HEURE_DEPART_DEFAUT,
    limite: isoJour(new Date()),
  });
  const [confirmee, setConfirmee] = useState<Reservation | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const n = nuitsEntreJours(form.arrivee, form.depart);
  const total = (logement?.tarif_nuit ?? 0) * n;

  const debutTs = instant(form.arrivee, form.heureArrivee);
  const finTs = instant(form.depart, form.heureDepart);
  const limiteTs = instant(form.limite, "12:00");
  const creneauInvalide = finTs <= debutTs;
  const limiteInvalide = limiteTs >= debutTs;

  const m = useMutation({
    mutationFn: () =>
      api.reserverEnLigne({
        logement_id: logement!.id,
        date_arrivee: form.arrivee,
        heure_arrivee: form.heureArrivee,
        date_depart: form.depart,
        heure_depart: form.heureDepart,
        date_limite_confirmation: form.limite,
        nombre_personnes: Number(form.personnes),
        client: { nom_complet: form.nom, telephone: form.telephone, email: form.email || undefined },
      }),
    onSuccess: (r) => {
      toast.success("Réservation enregistrée");
      if (r.reservation) {
        setConfirmee(r.reservation);
        return;
      }
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Réservation impossible"),
  });

  if (confirmee) {
    return (
      <Dialog
        open
        onOpenChange={(o) => {
          if (!o) {
            setConfirmee(null);
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Réservation enregistrée</DialogTitle>
            <DialogDescription>
              Aucun paiement en ligne n'est demandé. Présentez-vous à la résidence avant le{" "}
              <strong>{form.limite} à 12:00</strong> pour confirmer votre séjour par un paiement en
              espèces. Passé ce délai, la réservation est automatiquement annulée.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Séjour</dt>
              <dd className="font-medium">
                {form.arrivee} {form.heureArrivee} → {form.depart} {form.heureDepart}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Montant total</dt>
              <dd className="font-medium">{fcfa(confirmee.montant_total || total)}</dd>
            </div>
          </dl>

          <DialogFooter className="flex-wrap gap-2">
            <Button asChild>
              <a href={api.notePdfUrl(confirmee.id)} target="_blank" rel="noreferrer">
                <FileDown className="size-4" /> Télécharger la note PDF
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmee(null);
                onClose();
              }}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={!!logement} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {logement ? (
          <>
            <DialogHeader>
              <DialogTitle>Réserver {logement.nom}</DialogTitle>
              <DialogDescription>
                Réservation sans paiement en ligne : choisissez vos horaires puis la date à laquelle
                vous viendrez confirmer sur place.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Champ label="Nom(s) et prénom(s)" value={form.nom} onChange={(v) => set("nom", v)} />
              <Champ
                label="Téléphone"
                value={form.telephone}
                onChange={(v) => set("telephone", v)}
              />
              <Champ
                label="Email (optionnel)"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
              />
              <Champ
                label="Nombre de personnes"
                type="number"
                value={form.personnes}
                onChange={(v) => set("personnes", v)}
              />

              <Champ
                label="Arrivée"
                type="date"
                value={form.arrivee}
                onChange={(v) => set("arrivee", v)}
              />
              <Champ
                label="Heure d'arrivée"
                type="time"
                value={form.heureArrivee}
                onChange={(v) => set("heureArrivee", v)}
              />
              <Champ
                label="Départ"
                type="date"
                value={form.depart}
                onChange={(v) => set("depart", v)}
              />
              <Champ
                label="Heure de départ"
                type="time"
                value={form.heureDepart}
                onChange={(v) => set("heureDepart", v)}
              />
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-2">
                  <CalendarClock className="size-4" /> Date limite pour confirmer sur place
                </Label>
                <Input
                  type="date"
                  value={form.limite}
                  onChange={(e) => set("limite", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  L'échéance est fixée à 12:00 ce jour-là et doit précéder votre arrivée.
                </p>
              </div>
            </div>

            <Separator />

            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Nuits</dt>
                <dd className="font-medium">{n}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Total séjour</dt>
                <dd className="font-medium">{fcfa(total)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">À payer en ligne</dt>
                <dd className="font-semibold text-primary">{fcfa(0)}</dd>
              </div>
            </dl>

            {creneauInvalide ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Le départ doit être postérieur à l'arrivée (heures comprises).
              </p>
            ) : null}
            {limiteInvalide ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                La date limite de confirmation doit être avant le début du séjour.
              </p>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                disabled={
                  !form.nom ||
                  !form.telephone ||
                  creneauInvalide ||
                  limiteInvalide ||
                  m.isPending
                }
                onClick={() => m.mutate()}
              >
                {m.isPending ? "Traitement…" : "Réserver sans payer"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Champ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
