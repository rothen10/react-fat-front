import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KN Residence — Connexion à la gestion des séjours" },
      {
        name: "description",
        content:
          "Espace de connexion du personnel KN Residence : réservations, calendriers des 10 logements, paiements en espèces et suivi des créances.",
      },
      { property: "og:title", content: "KN Residence — Connexion" },
      {
        property: "og:description",
        content: "Gestion des réservations et des paiements de la résidence meublée KN Residence.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { session, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("gerant@knresidence.cm");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session) void navigate({ to: "/logements" });
  }, [ready, session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.login(email, password);
      signIn({
        token: r.token,
        role: r.role,
        nom: r.nom_complet ?? (r.role === "proprietaire" ? "Propriétaire" : "Gérant"),
        email,
      });
      void navigate({ to: "/logements" });
    } catch {
      toast.error("Connexion impossible", { description: "Vérifiez vos identifiants." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <span className="font-display text-2xl font-semibold">KN Residence</span>
        <div>
          <h1 className="max-w-md font-display text-4xl leading-tight">
            La résidence, ses dix logements et chaque franc, au même endroit.
          </h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/80">
            Calendriers par logement, réservations saisies par le personnel, avances et soldes en
            espèces suivis automatiquement.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">Douala · Cameroun</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">Connexion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Comptes Gérant et Propriétaire uniquement.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Astuce : une adresse commençant par <code>proprietaire@</code> ouvre la session avec les
            droits Propriétaire.
          </p>
        </form>
      </div>
    </div>
  );
}
