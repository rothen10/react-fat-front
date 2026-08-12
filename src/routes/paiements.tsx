import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, Search, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, fcfa } from "@/lib/api";

export const Route = createFileRoute("/paiements")({
  head: () => ({
    meta: [
      { title: "Paiements encaissés — KN Residence" },
      {
        name: "description",
        content:
          "Journal des paiements KN Residence : encaissements en espèces et règlements en ligne Mobile Money, avec dates et montants.",
      },
      { property: "og:title", content: "Paiements — KN Residence" },
      {
        property: "og:description",
        content: "Tous les encaissements de la résidence, en espèces ou en ligne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaiementsPage,
});

type Filtre = "tous" | "especes" | "en_ligne";

function PaiementsPage() {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [q, setQ] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["paiements"],
    queryFn: () => api.paiements(),
  });

  const liste = data
    .filter((p) => filtre === "tous" || p.canal === filtre)
    .filter(
      (p) =>
        !q ||
        (p.client_nom ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (p.logement_nom ?? "").toLowerCase().includes(q.toLowerCase()),
    );

  const total = liste.reduce((s, p) => s + p.montant, 0);
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
          {(
            [
              ["tous", "Tous"],
              ["especes", "Espèces"],
              ["en_ligne", "En ligne"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filtre === value ? "default" : "outline"}
              onClick={() => setFiltre(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Carte label="Total encaissé" valeur={fcfa(total)} />
        <Carte label="Dont en ligne" valeur={fcfa(enLigne)} />
        <Carte label="Opérations" valeur={String(liste.length)} />
      </div>

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
                    <Badge
                      variant="secondary"
                      className="gap-1.5 capitalize"
                    >
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
