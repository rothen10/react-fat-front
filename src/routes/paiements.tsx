import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, Search, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api, fcfa } from "@/lib/api";

export const Route = createFileRoute("/paiements")({
  head: () => ({ /* ...inchangé... */ }),
  component: PaiementsPage,
});

type Filtre = "tous" | "especes" | "en_ligne";
const PERIODES = [
  ["jour", "Jour"],
  ["semaine", "Semaine"],
  ["mois", "Mois"],
  ["annee", "Année"],
] as const;

// Bornes de période, calquées sur le comportement attendu du dashboard.
function dansPeriode(dateIso: string, periode: string): boolean {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  const now = new Date();

  if (periode === "jour") {
    return d.toDateString() === now.toDateString();
  }
  if (periode === "semaine") {
    const jour = (now.getDay() + 6) % 7; // lundi = 0
    const debut = new Date(now);
    debut.setDate(now.getDate() - jour);
    debut.setHours(0, 0, 0, 0);
    return d >= debut && d <= now;
  }
  if (periode === "mois") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  // annee
  return d.getFullYear() === now.getFullYear();
}

function PaiementsPage() {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [periode, setPeriode] = useState<string>("mois");
  const [q, setQ] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["paiements"],
    queryFn: () => api.paiements(),
  });

  // KPI officiels (paiements confirmés uniquement, cohérents avec l'API)
  const { data: resume, isLoading: resumeLoading } = useQuery({
    queryKey: ["paiements-resume", periode],
    queryFn: () => api.paiementsPeriode(periode),
  });

  const liste = useMemo(
    () =>
      data
        .filter((p) => filtre === "tous" || p.canal === filtre)
        .filter((p) => dansPeriode(p.date_paiement, periode))
        .filter(
          (p) =>
            !q ||
            (p.client_nom ?? "").toLowerCase().includes(q.toLowerCase()) ||
            (p.logement_nom ?? "").toLowerCase().includes(q.toLowerCase()),
        ),
    [data, filtre, periode, q],
  );

  const enLigne = liste.filter((p) => p.canal === "en_ligne").reduce((s, p) => s + p.montant, 0);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Paiements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tous les encaissements, en espèces à la réception ou en ligne par Mobile Money.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Client ou logement…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          {(["tous", "especes", "en_ligne"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={filtre === value ? "default" : "outline"}
              onClick={() => setFiltre(value)}
            >
              {value === "tous" ? "Tous" : value === "especes" ? "Espèces" : "En ligne"}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {PERIODES.map(([v, label]) => (
          <Button
            key={v}
            size="sm"
            variant={periode === v ? "default" : "outline"}
            onClick={() => setPeriode(v)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Carte
          label="Total encaissé (confirmés)"
          valeur={resumeLoading ? "…" : fcfa(resume?.total ?? 0)}
        />
        <Carte label="Dont en ligne" valeur={fcfa(enLigne)} />
        <Carte
          label="Opérations"
          valeur={resumeLoading ? "…" : String(resume?.nombre ?? liste.length)}
        />
      </div>

      {resume?.parMode && Object.keys(resume.parMode).length ? (
        <div className="card-surface mb-6 flex flex-wrap gap-2 p-4">
          {Object.entries(resume.parMode).map(([mode, montant]) => (
            <Badge key={mode} variant="secondary" className="capitalize">
              {mode} : {fcfa(montant)}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="card-surface overflow-x-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Logement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liste.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Aucun paiement pour ce filtre.
                  </TableCell>
                </TableRow>
              ) : null}
              {liste.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.date_paiement || "—"}</TableCell>
                  <TableCell className="font-medium">{p.client_nom ?? "—"}</TableCell>
                  <TableCell>{p.logement_nom ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5 capitalize">
                      {p.canal === "en_ligne" ? (
                        <Smartphone className="size-3.5" />
                      ) : (
                        <Banknote className="size-3.5" />
                      )}
                      {p.canal === "en_ligne" ? `En ligne (${p.mode})` : "Espèces"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fcfa(p.montant)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}

function Carte({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="card-surface surface-soft p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{valeur}</p>
    </div>
  );
}