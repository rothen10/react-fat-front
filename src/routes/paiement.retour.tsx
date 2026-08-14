import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/paiement/retour")({
  head: () => ({
    meta: [
      { title: "Paiement en cours de confirmation — KN Residence" },
      {
        name: "description",
        content:
          "Votre paiement Mobile Money est en cours de confirmation par KN Residence. Vous recevrez une confirmation dès validation.",
      },
      { property: "og:title", content: "Paiement en cours de confirmation — KN Residence" },
      {
        property: "og:description",
        content: "Suivi du paiement de votre réservation KN Residence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RetourPaiement,
});

function RetourPaiement() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-surface max-w-md p-8 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold">
          Votre paiement est en cours de confirmation.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La confirmation définitive est effectuée automatiquement par notre système dès que
          l'opérateur Mobile Money valide la transaction. Vous n'avez rien d'autre à faire ; la
          résidence vous contactera si besoin.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </div>
  );
}
