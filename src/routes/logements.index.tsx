import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api, fcfa } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/logements/")({
  head: () => ({
    meta: [
      { title: "Logements — KN Residence" },
      {
        name: "description",
        content:
          "Les 10 logements de KN Residence : appartements et studios, tarif par nuit et disponibilité du jour.",
      },
      { property: "og:title", content: "Logements — KN Residence" },
      {
        property: "og:description",
        content: "Appartements et studios de KN Residence avec tarifs et disponibilité du jour.",
      },
    ],
  }),
  component: LogementsPage,
});

type Filtre = "tous" | "appartement" | "studio";

function LogementsPage() {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const { data, isLoading } = useQuery({
    queryKey: ["logements"],
    queryFn: () => api.listLogements(),
  });

  const logements = (data ?? []).filter((l) => filtre === "tous" || l.type === filtre);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Logements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cliquez sur un logement pour ouvrir son calendrier et gérer ses réservations.
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              ["tous", "Tous"],
              ["appartement", "Appartements"],
              ["studio", "Studios"],
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

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {logements.map((l) => (
            <Link
              key={l.id}
              to="/logements/$id"
              params={{ id: l.id }}
              className="card-surface group flex flex-col overflow-hidden transition-shadow hover:shadow-raised"
            >
              <div className="flex h-32 items-end bg-sidebar p-4">
                <span className="font-display text-2xl text-sidebar-foreground">{l.nom}</span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {l.type}
                  </Badge>
                  <Badge
                    className={
                      l.statut_jour === "occupe"
                        ? "bg-status-du/25 text-foreground"
                        : "bg-status-solde/25 text-foreground"
                    }
                  >
                    {l.statut_jour === "occupe" ? "Occupé" : "Disponible"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{l.disposition}</p>
                <p className="mt-auto font-display text-xl font-semibold text-primary">
                  {fcfa(l.tarif_nuit)}
                  <span className="text-sm font-normal text-muted-foreground"> / nuit</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
