import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";
import { PanneauReservation } from "@/components/PanneauReservation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api";
import type { Reservation } from "@/lib/types";

/**
 * Cloche de notifications : nouvelles réservations reçues
 * (en ligne ou saisies) et alertes de l'API.
 */
export function Notifications({ agent }: { agent: string }) {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<Reservation | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
  });

  const nonLues = data.filter((n) => !n.lu).length;

  async function ouvrir(reservationId?: string, id?: string) {
    if (id) {
      try {
        await api.marquerNotificationLue(id);
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        /* lecture optionnelle */
      }
    }
    if (!reservationId) return;
    try {
      setDetail(await api.getReservation(reservationId));
    } catch {
      /* réservation introuvable */
    }
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Bell className="size-4" />
            {nonLues > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {nonLues}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <p className="border-b border-border px-4 py-3 text-sm font-medium">Notifications</p>
          <ul className="max-h-80 overflow-y-auto">
            {data.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Aucune nouvelle réservation.
              </li>
            ) : null}
            {data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void ouvrir(n.reservation_id, n.id)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-accent ${
                    n.lu ? "opacity-60" : ""
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {!n.lu ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                    {n.titre}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{n.message}</span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      <PanneauReservation
        reservation={detail}
        onClose={() => setDetail(null)}
        agent={agent}
        onChanged={() => {
          void qc.invalidateQueries({ queryKey: ["notifications"] });
          void qc.invalidateQueries({ queryKey: ["calendrier"] });
          void qc.invalidateQueries({ queryKey: ["dettes"] });
        }}
      />
    </>
  );
}
