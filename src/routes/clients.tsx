import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients fidèles — KN Residence" },
      {
        name: "description",
        content:
          "Fiches clients de KN Residence : création, modification, suppression et suivi des séjours cumulés.",
      },
      { property: "og:title", content: "Clients — KN Residence" },
      {
        property: "og:description",
        content: "Historique et fidélité des clients de KN Residence.",
      },
    ],
  }),
  component: ClientsPage,
});

const VIDE: Omit<Client, "id"> = {
  nom_complet: "",
  telephone: "",
  nationalite: "",
  profession: "",
  piece_identite_1: "",
  residence_cameroun: "",
};

function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [edition, setEdition] = useState<Client | null>(null);
  const [creation, setCreation] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Client | null>(null);

  const { data = [] } = useQuery({ queryKey: ["clients-stats"], queryFn: () => api.clientsStats() });

  const invalider = () => {
    void qc.invalidateQueries({ queryKey: ["clients-stats"] });
    void qc.invalidateQueries({ queryKey: ["clients"] });
  };

  const supprimer = useMutation({
    mutationFn: (id: string) => api.deleteClient(id),
    onSuccess: () => {
      toast.success("Client supprimé");
      setASupprimer(null);
      invalider();
    },
    onError: (e: Error) => toast.error(e.message || "Suppression impossible"),
  });

  const filtres = data.filter(
    (c) =>
      c.client.nom_complet.toLowerCase().includes(q.toLowerCase()) ||
      (c.client.telephone ?? "").includes(q),
  );

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fiches réutilisables d'un séjour à l'autre : recherchez, créez, modifiez ou supprimez un
            client.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setCreation(true)}>
            <Plus className="size-4" /> Nouveau client
          </Button>
        </div>
      </div>

      <div className="card-surface overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Nationalité</TableHead>
              <TableHead className="text-right">Séjours</TableHead>
              <TableHead className="text-right">Nuits cumulées</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Aucun client ne correspond à cette recherche.
                </TableCell>
              </TableRow>
            ) : null}
            {filtres.map((c) => (
              <TableRow
                key={c.client.id}
                className="cursor-pointer"
                onClick={() => setHistorique(c.client)}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {c.client.nom_complet
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((m) => m[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    {c.client.nom_complet}
                  </span>
                </TableCell>
                <TableCell>{c.client.telephone}</TableCell>
                <TableCell>{c.client.nationalite ?? "—"}</TableCell>
                <TableCell className="text-right">{c.nombre_reservations}</TableCell>
                <TableCell className="text-right">{c.jours_cumules}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>

                  <span className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier ${c.client.nom_complet}`}
                      onClick={() => setEdition(c.client)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer ${c.client.nom_complet}`}
                      onClick={() => setASupprimer(c.client)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FicheClient
        ouvert={creation || !!edition}
        client={edition}
        onClose={() => {
          setCreation(false);
          setEdition(null);
        }}
        onSaved={invalider}
      />

      <Dialog open={!!aSupprimer} onOpenChange={(o) => !o && setASupprimer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce client ?</DialogTitle>
            <DialogDescription>
              {aSupprimer?.nom_complet} sera retiré du répertoire. Les réservations déjà
              enregistrées restent inchangées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setASupprimer(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={supprimer.isPending}
              onClick={() => supprimer.mutate(aSupprimer!.id)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function FicheClient({
  ouvert,
  client,
  onClose,
  onSaved,
}: {
  ouvert: boolean;
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Client, "id">>(VIDE);
  const [cle, setCle] = useState("");
  const cleCourante = `${ouvert}-${client?.id ?? "nouveau"}`;
  if (ouvert && cle !== cleCourante) {
    setCle(cleCourante);
    setForm(client ? { ...VIDE, ...client } : VIDE);
  }

  const m = useMutation({
    mutationFn: () =>
      client ? api.updateClient(client.id, form) : api.createClient(form),
    onSuccess: () => {
      toast.success(client ? "Client mis à jour" : "Client créé");
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Enregistrement impossible"),
  });

  const set = (k: keyof Omit<Client, "id">, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          <DialogDescription>
            Ces informations alimentent le bulletin d'inscription lors des réservations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label="Nom(s) et prénom(s)" value={form.nom_complet} onChange={(v) => set("nom_complet", v)} />
          <Champ label="Téléphone" value={form.telephone} onChange={(v) => set("telephone", v)} />
          <Champ
            label="Nationalité"
            value={form.nationalite ?? ""}
            onChange={(v) => set("nationalite", v)}
          />
          <Champ
            label="Profession"
            value={form.profession ?? ""}
            onChange={(v) => set("profession", v)}
          />
          <Champ
            label="Pièce d'identité"
            value={form.piece_identite_1 ?? ""}
            onChange={(v) => set("piece_identite_1", v)}
          />
          <Champ
            label="Résidence"
            value={form.residence_cameroun ?? ""}
            onChange={(v) => set("residence_cameroun", v)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!form.nom_complet || !form.telephone || m.isPending}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
