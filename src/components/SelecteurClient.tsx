import { useQuery } from "@tanstack/react-query";
import { Check, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";

/**
 * Liste déroulante de clients existants, chapeautée par une barre de recherche,
 * avec bascule « nouveau client » pour saisir une fiche inédite.
 */
export function SelecteurClient({
  clientId,
  onSelect,
  nouveau,
  onNouveau,
}: {
  clientId: string;
  onSelect: (c: Client | null) => void;
  nouveau: boolean;
  onNouveau: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", ""],
    queryFn: () => api.clients(),
  });

  const filtres = clients.filter(
    (c) =>
      c.nom_complet.toLowerCase().includes(q.toLowerCase()) ||
      (c.telephone ?? "").includes(q),
  );

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Client</Label>
        <Button
          type="button"
          variant={nouveau ? "default" : "outline"}
          size="sm"
          onClick={() => {
            onNouveau(!nouveau);
            onSelect(null);
          }}
        >
          <UserPlus className="size-4" /> {nouveau ? "Choisir un client existant" : "Nouveau client"}
        </Button>
      </div>

      {nouveau ? (
        <p className="text-xs text-muted-foreground">
          Renseignez la fiche ci-dessous : le client sera créé puis rattaché à la réservation.
        </p>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou téléphone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto p-1">
            {filtres.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Aucun client trouvé — utilisez « Nouveau client ».
              </li>
            ) : null}
            {filtres.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                    clientId === c.id && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="truncate">
                    {c.nom_complet}
                    <span className="ml-2 text-xs text-muted-foreground">{c.telephone}</span>
                  </span>
                  {clientId === c.id ? <Check className="size-4 shrink-0" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
