import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCheck, Clock, Globe, MailOpen } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PanneauReservation } from "@/components/PanneauReservation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { NotificationItem, Reservation } from "@/lib/types";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Centre de notifications — KN Residence" },
      {
        name: "description",
        content:
          "Suivez les réservations en ligne, les rappels d'arrivée J-1 et les échéances de confirmation dépassées de KN Residence.",
      },
      { property: "og:title", content: "Centre de notifications — KN Residence" },
      {
        property: "og:description",
        content: "Alertes opérateurs : nouvelles réservations en ligne, rappels et expirations.",
      },
    ],
  }),
  component: PageNotifications,
});

type Filtre = "toutes" | "non_lues" | "lues";

const ICONES: Record<string, typeof BellRing> = {
  nouvelle_reservation_en_ligne: Globe,
  rappel_arrivee_j1: Clock,
  reservation_expiree: MailOpen,
};

function libelleType(t: string) {
  if (t === "nouvelle_reservation_en_ligne") return "Réservation en ligne";
  if (t === "rappel_arrivee_j1") return "Arrivée demain";
  if (t === "reservation_expiree") return "Délai dépassé";
  return t.replace(/_/g, " ");
}

function PageNotifications() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [detail, setDetail] = useState<Reservation | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
  });

  const nonLues = data.filter((n) => !n.lu);
  const liste = data.filter((n) =>
    filtre === "toutes" ? true : filtre === "non_lues" ? !n.lu : n.lu,
  );

  const rafraichir = () => void qc.invalidateQueries({ queryKey: ["notifications"] });

  async function ouvrir(n: NotificationItem) {
    if (!n.lu) {
      try {
        await api.marquerNotificationLue(n.id);
        rafraichir();
      } catch {
        /* lecture optionnelle */
      }
    }
    if (!n.reservation_id) return;
    try {
      setDetail(await api.getReservation(n.reservation_id));
    } catch {
      /* réservation introuvable */
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Centre de notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Réservations en ligne, rappels d'arrivée J-1 et délais de confirmation dépassés.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["toutes", `Toutes (${data.length})`],
              ["non_lues", `Non lues (${nonLues.length})`],
              ["lues", `Lues (${data.length - nonLues.length})`],
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
          <Button
            size="sm"
            variant="secondary"
            disabled={!nonLues.length}
            onClick={async () => {
              await Promise.allSettled(nonLues.map((n) => api.marquerNotificationLue(n.id)));
              rafraichir();
            }}
          >
            <CheckCheck className="size-4" /> Tout marquer comme lu
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : liste.length === 0 ? (
        <p className="card-surface p-10 text-center text-sm text-muted-foreground">
          Aucune notification dans cette vue.
        </p>
      ) : (
        <ul className="space-y-3">
          {liste.map((n) => {
            const Icone = ICONES[n.type] ?? BellRing;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void ouvrir(n)}
                  className={`card-surface flex w-full items-start gap-4 p-4 text-left transition-colors hover:border-primary ${
                    n.lu ? "opacity-70" : ""
                  }`}
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icone className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{n.titre}</span>
                      <Badge variant="outline" className="capitalize">
                        {libelleType(n.type)}
                      </Badge>
                      {!n.lu ? <Badge>Non lue</Badge> : null}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{n.message}</span>
                    {n.created_at ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {n.created_at.slice(0, 16).replace("T", " ")}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <PanneauReservation
        reservation={detail}
        onClose={() => setDetail(null)}
        agent={session?.nom ?? ""}
        onChanged={() => {
          rafraichir();
          void qc.invalidateQueries({ queryKey: ["calendrier"] });
          void qc.invalidateQueries({ queryKey: ["dettes"] });
        }}
      />
    </AppShell>
  );
}
