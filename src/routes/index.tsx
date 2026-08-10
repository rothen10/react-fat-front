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
  const [identifiant, setIdentifiant] = useState("gerant");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session) void navigate({ to: "/logements" });
  }, [ready, session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.login(identifiant, password);
      signIn({
        token: r.token,
        role: r.role,
        nom: r.nom_complet ?? (r.role === "proprietaire" ? "Propriétaire" : "Gérant"),
        email: identifiant,
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
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-sidebar-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-primary/30 blur-3xl"
        />
        <span className="relative flex items-center gap-3 font-display text-2xl font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            KN
          </span>
          KN Residence
        </span>
        <div className="relative">
          <h1 className="max-w-md font-display text-4xl leading-tight">
            La résidence, ses dix logements et chaque franc, au même endroit.
          </h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/80">
            Calendriers par logement, réservations saisies par le personnel, avances et soldes en
            espèces suivis automatiquement.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/60">Douala · Cameroun</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <span className="grid size-11 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
              KN
            </span>
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold">Connexion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Comptes Gérant et Propriétaire uniquement.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifiant">Identifiant</Label>
            <Input
              id="identifiant"
              type="text"
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
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
            L'identifiant <code>proprietaire</code> ouvre la session avec les droits Propriétaire.
          </p>
        </form>
      </div>
    </div>
  );
}

