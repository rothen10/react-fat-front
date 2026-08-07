import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients fidèles — KN Residence" },
      {
        name: "description",
        content:
          "Fiches clients de KN Residence : nombre de séjours et de nuits cumulées, calculés depuis l'historique des réservations.",
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

function ClientsPage() {
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({ queryKey: ["clients-stats"], queryFn: () => api.clientsStats() });

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
            Fiches réutilisables d'un séjour à l'autre : recherchez un client par nom ou téléphone.
          </p>
        </div>
        <Input
          placeholder="Rechercher un client…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:w-72"
        />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtres.map((c) => (
              <TableRow key={c.client.id}>
                <TableCell className="font-medium">{c.client.nom_complet}</TableCell>
                <TableCell>{c.client.telephone}</TableCell>
                <TableCell>{c.client.nationalite ?? "—"}</TableCell>
                <TableCell className="text-right">{c.nombre_reservations}</TableCell>
                <TableCell className="text-right">{c.jours_cumules}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
