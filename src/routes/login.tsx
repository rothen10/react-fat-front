import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo-kn.png.asset.json";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion personnel — KN Residence" },
      {
        name: "description",
        content:
          "Espace de connexion du personnel KN Residence : réservations, calendriers des logements, paiements et suivi des créances.",
      },
      { property: "og:title", content: "Connexion personnel — KN Residence" },
      {
        property: "og:description",
        content: "Accès Gérant et Propriétaire à la gestion de la résidence KN Residence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
          <img src={logo.url} alt="Logo KN Residence" className="size-10 rounded-xl object-contain" />
          KN Residence
        </span>
        <div className="relative">
          <h1 className="max-w-md font-display text-4xl leading-tight">
            La résidence, ses logements et chaque franc, au même endroit.
          </h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/80">
            Calendriers par logement, réservations en ligne ou sur place, avances et soldes suivis
            automatiquement.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/60">Douala · Cameroun</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Retour à l'espace public
          </Link>
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
        </form>
      </div>
    </div>
  );
}
