import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import {
  ArrowRightLeft,
  CalendarCheck,
  PieChart,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { ClientOnly } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, fcfa } from "@/lib/api";

const RevenusChart = lazy(() => import("@/components/RevenusChart"));

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — KN Residence" },
      {
        name: "description",
        content:
          "Chiffre d'affaires, taux d'occupation, arrivées et départs du jour et fonds en attente de KN Residence.",
      },
      { property: "og:title", content: "Tableau de bord — KN Residence" },
      {
        property: "og:description",
        content: "Suivi financier et occupation des dix logements de KN Residence.",
      },
    ],
  }),
  component: DashboardPage,
});

const PERIODES = [
  ["jour", "Jour"],
  ["semaine", "Semaine"],
  ["mois", "Mois"],
  ["annee", "Année"],
] as const;

function DashboardPage() {
  const [periode, setPeriode] = useState<string>("mois");
  const [dettesOuvertes, setDettesOuvertes] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["stats", periode],
    queryFn: () => api.stats(periode),
  });
  const { data: dettes = [] } = useQuery({ queryKey: ["dettes"], queryFn: () => api.dettes() });

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tous les règlements sont en espèces : les montants ci-dessous proviennent des paiements
            saisis.
          </p>
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          titre="Chiffre d'affaires"
          valeur={stats ? fcfa(stats.chiffre_affaires) : "—"}
          icon={Wallet}
        />
        <Kpi
          titre="Taux d'occupation"
          valeur={stats ? `${stats.taux_occupation} %` : "—"}
          icon={PieChart}
        />
        <Kpi
          titre="Réservations actives"
          valeur={stats ? String(stats.reservations_actives) : "—"}
          icon={CalendarCheck}
        />
        <Kpi
          titre="Arrivées / départs du jour"
          valeur={stats ? `${stats.arrivees_jour} / ${stats.departs_jour}` : "—"}
          icon={ArrowRightLeft}
        />

      </div>

      <button
        type="button"
        onClick={() => setDettesOuvertes((v) => !v)}
        className="card-surface mt-4 flex w-full items-center justify-between gap-4 p-5 text-left transition-shadow hover:shadow-raised"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Fonds en attente</p>
          <p className="mt-1 font-display text-3xl font-semibold text-status-du">
            {stats ? fcfa(stats.fonds_en_attente) : "—"}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {dettes.length} créance(s) · {dettesOuvertes ? "masquer" : "voir le détail"}
        </span>
      </button>

      {dettesOuvertes ? (
        <div className="card-surface mt-4 overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logement</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Séjour</TableHead>
                <TableHead className="text-right">Montant dû</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dettes.map((d) => (
                <TableRow key={d.reservation_id}>
                  <TableCell>{d.logement}</TableCell>
                  <TableCell className="font-medium">{d.client}</TableCell>
                  <TableCell>{d.telephone}</TableCell>
                  <TableCell>
                    {d.date_arrivee} → {d.date_depart}
                  </TableCell>
                  <TableCell className="text-right font-medium text-status-du">
                    {fcfa(d.montant_du)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">Évolution des revenus</h2>
          <div className="h-64">
            <ClientOnly fallback={null}>
              <Suspense fallback={null}>
                <RevenusChart data={stats?.revenus ?? []} />
              </Suspense>
            </ClientOnly>
          </div>
        </div>

        <div className="card-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">Occupation par logement</h2>
          <ul className="space-y-3">
            {(stats?.occupation_par_logement ?? []).map((o) => (
              <li key={o.logement} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm">{o.logement}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${o.taux}%` }}
                  />
                </span>
                <span className="w-12 text-right text-sm text-muted-foreground">{o.taux}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ titre, valeur, icon: Icon }: { titre: string; valeur: string; icon: LucideIcon }) {
  return (
    <div className="card-surface surface-soft flex items-start gap-4 p-5 transition-shadow hover:shadow-raised">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{titre}</p>
        <p className="mt-1 truncate font-display text-2xl font-semibold">{valeur}</p>
      </div>
    </div>
  );

}
