import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Cloche de notifications : compteur des alertes non lues,
 * raccourci vers le centre de notifications.
 */
export function Notifications() {
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => import("@/lib/api").then((m) => m.api.notifications()),
    refetchInterval: 60_000,
  });

  const nonLues = data.filter((n) => !n.lu).length;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={`Notifications${nonLues ? ` (${nonLues} non lues)` : ""}`}
      className="relative text-sidebar-foreground hover:bg-sidebar-accent"
    >
      <Link to="/notifications">
        <Bell className="size-4" />
        {nonLues > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {nonLues}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
