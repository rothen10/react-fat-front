import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, MapPin, Moon, Sun } from "lucide-react";
import { api, fcfa } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { ReservationPublique } from "@/components/ReservationPublique";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Logement } from "@/lib/types";
import logo from "@/assets/logo-kn.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KN Residence — Appartements et studios meublés à Douala" },
      {
        name: "description",
        content:
          "Découvrez les appartements et studios meublés de KN Residence à Douala : descriptions, tarifs par nuit et réservation en ligne sans paiement, à confirmer sur place.",
      },
      { property: "og:title", content: "KN Residence — Appartements et studios meublés" },
      {
        property: "og:description",
        content:
          "Réservez en ligne un logement meublé KN Residence sans payer et confirmez sur place avant la date limite.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EspaceCommun,
});

type Filtre = "tous" | "appartement" | "studio";

function EspaceCommun() {
  const { theme, toggle } = useTheme();
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [choisi, setChoisi] = useState<Logement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["logements-publics"],
    queryFn: () => api.listLogements(),
  });

  const logements = (data ?? []).filter((l) => filtre === "tous" || l.type === filtre);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2">
            <img src={logo.url} alt="Logo KN Residence" className="size-9 rounded-lg object-contain" />
            <span className="font-display text-lg font-semibold">KN Residence</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={toggle}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/login">
                <LogIn className="size-4" /> Sign in
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="panel-hero relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-sidebar-primary/25 blur-3xl"
          />
          <h1 className="relative max-w-2xl font-display text-4xl font-semibold leading-tight text-sidebar-foreground sm:text-5xl">
            Des séjours meublés, confortables et prêts à vivre.
          </h1>
          <p className="relative mt-4 max-w-xl text-sidebar-foreground/80">
            Choisissez votre appartement ou studio, réservez en quelques clics et réglez votre
            avance par Orange Money ou MTN Mobile Money.
          </p>
          <p className="relative mt-6 inline-flex items-center gap-2 text-sm text-sidebar-foreground/70">
            <MapPin className="size-4" /> Douala · Cameroun
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Nos logements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tarifs par nuit, description et disponibilité du jour.
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
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {logements.map((l) => (
              <article key={l.id} className="card-surface flex flex-col overflow-hidden">
                <div className="panel-hero flex h-32 items-end p-4">
                  <span className="font-display text-2xl text-sidebar-foreground">{l.nom}</span>
                </div>
                <div className="surface-soft flex flex-1 flex-col gap-3 p-4">
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
                      {l.statut_jour === "occupe" ? "Occupé aujourd'hui" : "Disponible"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{l.disposition}</p>
                  {l.equipements?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {l.equipements.slice(0, 4).map((e) => (
                        <Badge key={e} variant="outline">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-auto font-display text-xl font-semibold text-primary">
                    {fcfa(l.tarif_nuit)}
                    <span className="text-sm font-normal text-muted-foreground"> / nuit</span>
                  </p>
                  <Button onClick={() => setChoisi(l)}>Réserver</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        KN Residence · Douala · Paiements sécurisés Mobile Money
      </footer>

      <ReservationPublique logement={choisi} onClose={() => setChoisi(null)} />
    </div>
  );
}
