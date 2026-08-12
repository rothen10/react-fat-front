import { useMutation } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api, fcfa } from "@/lib/api";
import type { Logement } from "@/lib/types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const nuits = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

/**
 * Formulaire public : le client réserve à distance et règle
 * une avance ou la totalité via Moneroo (Orange Money / MTN MoMo).
 */
export function ReservationPublique({
  logement,
  onClose,
}: {
  logement: Logement | null;
  onClose: () => void;
}) {
  const demain = iso(new Date(Date.now() + 86400000));
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    personnes: "1",
    arrivee: iso(new Date()),
    depart: demain,
    part: "avance" as "avance" | "totalite",
    operateur: "om" as "om" | "momo",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const n = nuits(form.arrivee, form.depart);
  const total = (logement?.tarif_nuit ?? 0) * n;
  const aRegler = form.part === "totalite" ? total : Math.round(total * 0.3);

  const m = useMutation({
    mutationFn: () =>
      api.reserverEnLigne({
        logement_id: logement!.id,
        date_arrivee: form.arrivee,
        date_depart: form.depart,
        nombre_personnes: Number(form.personnes),
        montant: aRegler,
        operateur: form.operateur,
        client: { nom_complet: form.nom, telephone: form.telephone },
      }),
    onSuccess: (r) => {
      if (r.checkout_url) {
        toast.success("Redirection vers le paiement…");
        window.location.href = r.checkout_url;
        return;
      }
      toast.success("Demande de réservation envoyée", {
        description: "La résidence vous contactera pour finaliser le paiement.",
      });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Réservation impossible"),
  });

  return (
    <Dialog open={!!logement} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {logement ? (
          <>
            <DialogHeader>
              <DialogTitle>Réserver {logement.nom}</DialogTitle>
              <DialogDescription>
                Renseignez vos coordonnées puis payez une avance ou la totalité par Mobile Money.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Champ label="Nom(s) et prénom(s)" value={form.nom} onChange={(v) => set("nom", v)} />
              <Champ
                label="Téléphone (Mobile Money)"
                value={form.telephone}
                onChange={(v) => set("telephone", v)}
              />
              <Champ
                label="Arrivée"
                type="date"
                value={form.arrivee}
                onChange={(v) => set("arrivee", v)}
              />
              <Champ
                label="Départ"
                type="date"
                value={form.depart}
                onChange={(v) => set("depart", v)}
              />
              <Champ
                label="Nombre de personnes"
                type="number"
                value={form.personnes}
                onChange={(v) => set("personnes", v)}
              />
              <div className="space-y-2">
                <Label>Opérateur</Label>
                <Select
                  value={form.operateur}
                  onValueChange={(v) => set("operateur", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="om">Orange Money</SelectItem>
                    <SelectItem value="momo">MTN Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Montant à régler maintenant</Label>
                <Select value={form.part} onValueChange={(v) => set("part", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avance">Avance (30 %)</SelectItem>
                    <SelectItem value="totalite">Totalité du séjour</SelectItem>
                  </SelectContent>
                </Select>
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
                <dt className="text-xs uppercase text-muted-foreground">À payer</dt>
                <dd className="font-semibold text-primary">{fcfa(aRegler)}</dd>
              </div>
            </dl>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                disabled={!form.nom || !form.telephone || form.depart <= form.arrivee || m.isPending}
                onClick={() => m.mutate()}
              >
                {m.isPending ? "Traitement…" : `Payer ${fcfa(aRegler)}`}
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
