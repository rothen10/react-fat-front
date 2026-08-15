import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PanneauReservation } from "@/components/PanneauReservation";
import { SelecteurClient } from "@/components/SelecteurClient";
import { COULEUR_CLASSES, Legende, couleurReservation } from "@/components/statut";

import { Badge } from "@/components/ui/badge";
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
import {
  HEURE_ARRIVEE_DEFAUT,
  HEURE_DEPART_DEFAUT,
  creneau,
  seChevauchent,
} from "@/lib/dates";
import { api, fcfa } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Reservation, StatutReservation } from "@/lib/types";

export const Route = createFileRoute("/logements/$id")({
  head: () => ({
    meta: [
      { title: "Calendrier du logement — KN Residence" },
      {
        name: "description",
        content:
          "Calendrier mensuel d'un logement KN Residence : réservations en attente, confirmées, soldées, séjours terminés et annulations.",
      },
      { property: "og:title", content: "Calendrier du logement — KN Residence" },
      {
        property: "og:description",
        content: "Pilotez les réservations, avances et soldes d'un logement depuis son calendrier.",
      },
    ],
  }),
  component: LogementDetail,
});

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nuits = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

function LogementDetail() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [curseur, setCurseur] = useState(() => new Date());
  const [selection, setSelection] = useState<{ debut?: string; fin?: string }>({});
  const [formOuvert, setFormOuvert] = useState(false);
  const [detail, setDetail] = useState<Reservation | null>(null);

  const mois = `${curseur.getFullYear()}-${String(curseur.getMonth() + 1).padStart(2, "0")}`;

  const { data: logement } = useQuery({
    queryKey: ["logement", id],
    queryFn: () => api.getLogement(id),
  });
  const { data: reservations = [] } = useQuery({
    queryKey: ["calendrier", id, mois],
    queryFn: () => api.calendrier(id, mois),
  });

  const invalider = () => {
    void qc.invalidateQueries({ queryKey: ["calendrier", id] });
    void qc.invalidateQueries({ queryKey: ["logements"] });
    void qc.invalidateQueries({ queryKey: ["stats"] });
    void qc.invalidateQueries({ queryKey: ["dettes"] });
  };

  const jours = useMemo(() => {
    const premier = new Date(curseur.getFullYear(), curseur.getMonth(), 1);
    const dernier = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0);
    const decalage = (premier.getDay() + 6) % 7;
    const cases: (string | null)[] = Array.from({ length: decalage }, () => null);
    for (let d = 1; d <= dernier.getDate(); d++) {
      cases.push(iso(new Date(curseur.getFullYear(), curseur.getMonth(), d)));
    }
    return cases;
  }, [curseur]);

  const reservationDuJour = (jour: string) =>
    reservations.find((r) => r.date_arrivee <= jour && r.date_depart > jour);

  function cliquerJour(jour: string) {
    const r = reservationDuJour(jour);
    if (r) {
      setDetail(r);
      return;
    }
    if (!selection.debut || (selection.debut && selection.fin)) {
      setSelection({ debut: jour });
    } else if (jour <= selection.debut) {
      setSelection({ debut: jour });
    } else {
      setSelection({ debut: selection.debut, fin: jour });
      setFormOuvert(true);
    }
  }

  const dansSelection = (jour: string) =>
    !!selection.debut &&
    ((selection.fin && jour >= selection.debut && jour < selection.fin) || jour === selection.debut);

  return (
    <AppShell>
      <Link
        to="/logements"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tous les logements
      </Link>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="card-surface h-fit p-5">
          <div className="mb-4 flex h-28 items-end rounded-lg bg-sidebar p-4">
            <span className="font-display text-2xl text-sidebar-foreground">
              {logement?.nom ?? "…"}
            </span>
          </div>
          <Badge variant="secondary" className="capitalize">
            {logement?.type}
          </Badge>
          <p className="mt-3 text-sm text-muted-foreground">{logement?.disposition}</p>
          <p className="mt-4 font-display text-2xl font-semibold text-primary">
            {logement ? fcfa(logement.tarif_nuit) : "—"}
            <span className="text-sm font-normal text-muted-foreground"> / nuit</span>
          </p>

          {logement?.equipements?.length ? (
            <>
              <Separator className="my-4" />
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Équipements
              </p>
              <div className="flex flex-wrap gap-1.5">
                {logement.equipements.map((e) => (
                  <Badge key={e} variant="outline">
                    {e}
                  </Badge>
                ))}
              </div>
            </>
          ) : null}

          {session?.role === "proprietaire" ? (
            <>
              <Separator className="my-4" />
              <TarifEditeur
                id={id}
                tarif={logement?.tarif_nuit ?? 0}
                onDone={() => {
                  void qc.invalidateQueries({ queryKey: ["logement", id] });
                  void qc.invalidateQueries({ queryKey: ["logements"] });
                }}
              />
            </>
          ) : null}
        </aside>

        <section className="space-y-4">
          <div className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold capitalize">
                {MOIS[curseur.getMonth()]} {curseur.getFullYear()}
              </h1>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Mois précédent"
                  onClick={() =>
                    setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() - 1, 1))
                  }
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurseur(new Date())}>
                  Aujourd'hui
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Mois suivant"
                  onClick={() =>
                    setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1))
                  }
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
              {JOURS.map((j) => (
                <div key={j} className="pb-1">
                  {j}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {jours.map((jour, i) =>
                jour === null ? (
                  <div key={`v-${i}`} />
                ) : (
                  <button
                    key={jour}
                    type="button"
                    onClick={() => cliquerJour(jour)}
                    aria-current={jour === iso(new Date()) ? "date" : undefined}
                    className={`relative flex min-h-16 flex-col items-start rounded-lg border border-border p-1.5 text-left text-xs transition-colors hover:border-primary ${
                      jour === iso(new Date())
                        ? "border-primary ring-2 ring-primary/70 ring-offset-1 ring-offset-background"
                        : ""
                    } ${
                      reservationDuJour(jour)
                        ? COULEUR_CLASSES[couleurReservation(reservationDuJour(jour)!)]
                        : dansSelection(jour)
                          ? "bg-primary/15 ring-1 ring-inset ring-primary"
                          : "bg-card"
                    }`}
                  >
                    <span
                      className={
                        jour === iso(new Date())
                          ? "rounded-md bg-primary px-1.5 font-semibold text-primary-foreground"
                          : "font-medium"
                      }
                    >
                      {Number(jour.slice(8))}
                    </span>
                    {reservationDuJour(jour)?.date_arrivee === jour ? (
                      <span className="mt-auto line-clamp-2 leading-tight">
                        {reservationDuJour(jour)?.client_nom}
                      </span>
                    ) : null}
                  </button>

                ),
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Legende />
              <Button
                onClick={() => {
                  setSelection({ debut: iso(new Date()), fin: iso(new Date(Date.now() + 86400000)) });
                  setFormOuvert(true);
                }}
              >
                <Plus className="size-4" /> Nouvelle réservation
              </Button>
            </div>
            {selection.debut && !selection.fin ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Arrivée sélectionnée le {selection.debut} — cliquez maintenant la date de départ.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <FormulaireReservation
        ouvert={formOuvert}
        onOpenChange={(o) => {
          setFormOuvert(o);
          if (!o) setSelection({});
        }}
        logementId={id}
        tarif={logement?.tarif_nuit ?? 0}
        debut={selection.debut ?? iso(new Date())}
        fin={selection.fin ?? iso(new Date(Date.now() + 86400000))}
        existantes={reservations}
        agent={session?.nom ?? ""}
        onSaved={() => {
          invalider();
          setSelection({});
        }}
      />

      <PanneauReservation
        reservation={detail}
        onClose={() => setDetail(null)}
        agent={session?.nom ?? ""}
        onChanged={invalider}
      />
    </AppShell>
  );
}

function TarifEditeur({
  id,
  tarif,
  onDone,
}: {
  id: string;
  tarif: number;
  onDone: () => void;
}) {
  const [valeur, setValeur] = useState(String(tarif));
  const m = useMutation({
    mutationFn: () => api.updateLogement(id, { tarif_nuit: Number(valeur) }),
    onSuccess: () => {
      toast.success("Tarif mis à jour");
      onDone();
    },
  });
  return (
    <div className="space-y-2">
      <Label htmlFor="tarif">Tarif / nuit (Propriétaire)</Label>
      <div className="flex gap-2">
        <Input id="tarif" value={valeur} onChange={(e) => setValeur(e.target.value)} />
        <Button variant="outline" size="icon" aria-label="Enregistrer" onClick={() => m.mutate()}>
          <Pencil className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function FormulaireReservation({
  ouvert,
  onOpenChange,
  logementId,
  tarif,
  debut,
  fin,
  existantes,
  agent,
  onSaved,
}: {
  ouvert: boolean;
  onOpenChange: (o: boolean) => void;
  logementId: string;
  tarif: number;
  debut: string;
  fin: string;
  existantes: Reservation[];
  agent: string;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [nouveauClient, setNouveauClient] = useState(false);
  const [form, setForm] = useState({

    nom: "",
    telephone: "",
    personnes: "1",
    arrivee: debut,
    heureArrivee: HEURE_ARRIVEE_DEFAUT,
    depart: fin,
    heureDepart: HEURE_DEPART_DEFAUT,
    total: String(tarif * nuits(debut, fin)),
    verse: "0",
    agent,
    statut: "en_attente" as StatutReservation,
    motif: "",
    provenance: "",
    destination: "",
    nationalite: "",
    profession: "",
    piece: "",
  });

  // Resynchronise le formulaire sur la sélection du calendrier à chaque ouverture.
  const [derniereCle, setDerniereCle] = useState("");
  const cle = `${ouvert}-${debut}-${fin}`;
  if (ouvert && cle !== derniereCle) {
    setDerniereCle(cle);
    setForm((f) => ({
      ...f,
      arrivee: debut,
      depart: fin,
      total: String(tarif * nuits(debut, fin)),
      agent,
    }));
  }

  const creneauForm = creneau(form.arrivee, form.heureArrivee, form.depart, form.heureDepart);
  const creneauInvalide = creneauForm.fin <= creneauForm.debut;
  const chevauchement = existantes.some(
    (r) =>
      r.statut !== "annulee" &&
      seChevauchent(
        creneauForm,
        creneau(r.date_arrivee, r.heure_arrivee, r.date_depart, r.heure_depart),
      ),
  );

  const m = useMutation({
    mutationFn: () =>
      api.createReservation({
        logement_id: logementId,
        ...(clientId ? { client_id: clientId } : {}),
        client: {
          nom_complet: form.nom,
          telephone: form.telephone,
          nationalite: form.nationalite,
          profession: form.profession,
          piece_identite_1: form.piece,
        },
        client_nom: form.nom,
        client_telephone: form.telephone,
        nombre_personnes: Number(form.personnes),
        date_arrivee: form.arrivee,
        heure_arrivee: form.heureArrivee,
        date_depart: form.depart,
        heure_depart: form.heureDepart,
        montant_total: Number(form.total),
        montant_verse: Number(form.verse),
        statut: form.statut,
        agent: form.agent,
        motif: form.motif,
        provenance: form.provenance,
        destination: form.destination,
      }),

    onSuccess: () => {
      toast.success("Réservation enregistrée");
      onOpenChange(false);
      onSaved();
    },
    onError: () => toast.error("Enregistrement impossible"),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={ouvert} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle réservation</DialogTitle>
          <DialogDescription>
            Bulletin d'inscription et informations du séjour. Paiement en espèces, sur place.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelecteurClient
            clientId={clientId}
            nouveau={nouveauClient}
            onNouveau={(v) => {
              setNouveauClient(v);
              setClientId("");
            }}
            onSelect={(c) => {
              setClientId(c?.id ?? "");
              setForm((f) => ({
                ...f,
                nom: c?.nom_complet ?? "",
                telephone: c?.telephone ?? "",
                nationalite: c?.nationalite ?? "",
                profession: c?.profession ?? "",
                piece: c?.piece_identite_1 ?? "",
              }));
            }}
          />

          {nouveauClient ? (
            <>
              <Champ label="Nom(s) et prénom(s)" value={form.nom} onChange={(v) => set("nom", v)} />
              <Champ
                label="Téléphone"
                value={form.telephone}
                onChange={(v) => set("telephone", v)}
              />
              <Champ
                label="Nationalité"
                value={form.nationalite}
                onChange={(v) => set("nationalite", v)}
              />
              <Champ
                label="Profession"
                value={form.profession}
                onChange={(v) => set("profession", v)}
              />
              <Champ
                label="Pièce d'identité"
                value={form.piece}
                onChange={(v) => set("piece", v)}
              />
            </>
          ) : null}

          <Champ
            label="Nombre de personnes"
            type="number"
            value={form.personnes}
            onChange={(v) => set("personnes", v)}
          />
          <Champ
            label="En provenance de"
            value={form.provenance}
            onChange={(v) => set("provenance", v)}
          />
          <Champ
            label="En destination de"
            value={form.destination}
            onChange={(v) => set("destination", v)}
          />
          <Champ label="Motif du séjour" value={form.motif} onChange={(v) => set("motif", v)} />
          <Champ
            label="Agent ayant saisi"
            value={form.agent}
            onChange={(v) => set("agent", v)}
          />
          <Champ
            label="Date d'arrivée"
            type="date"
            value={form.arrivee}
            onChange={(v) => {
              set("arrivee", v);
              set("total", String(tarif * nuits(v, form.depart)));
            }}
          />
          <Champ
            label="Date de départ"
            type="date"
            value={form.depart}
            onChange={(v) => {
              set("depart", v);
              set("total", String(tarif * nuits(form.arrivee, v)));
            }}
          />
          <Champ
            label={`Montant total (${nuits(form.arrivee, form.depart)} nuit(s))`}
            type="number"
            value={form.total}
            onChange={(v) => set("total", v)}
          />
          <Champ
            label="Montant versé à la réservation"
            type="number"
            value={form.verse}
            onChange={(v) => set("verse", v)}
          />
          <div className="space-y-2">
            <Label>Statut initial</Label>
            <Select
              value={form.statut}
              onValueChange={(v) => set("statut", v as StatutReservation)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="confirmee">Confirmée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {creneauInvalide ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Le départ doit être postérieur à l'arrivée (heures comprises).
          </p>
        ) : null}
        {chevauchement ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Ce créneau horaire chevauche une réservation existante pour ce logement.
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={
              chevauchement || creneauInvalide || (!clientId && (!form.nom || !form.telephone)) || m.isPending
            }

            onClick={() => m.mutate()}
          >
            Enregistrer
          </Button>
        </DialogFooter>
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

