import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Building2, LayoutDashboard, LogOut, Moon, Sun, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-kn.png.asset.json";

const NAV = [
  { to: "/logements", label: "Logements", icon: Building2 },
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const { session, ready, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/" });
  }, [ready, session, navigate]);

  if (!ready || !session) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/logements" className="flex items-center gap-2">
            <img src={logo.url} alt="Logo KN Residence" className="size-9 rounded-lg object-contain" />
            <span className="font-display text-lg font-semibold">KN Residence</span>
          </Link>


          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(to)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{session.nom}</p>
              <p className="text-xs capitalize text-sidebar-foreground/70">{session.role}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={toggle}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button

              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => {
                signOut();
                void navigate({ to: "/" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
