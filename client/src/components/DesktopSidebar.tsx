import { Home, Film, Tv, Radio, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function DesktopSidebar() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Accueil", path: "/" },
    { icon: Film, label: "Films", path: "/films" },
    { icon: Tv, label: "Séries", path: "/series" },
    { icon: Radio, label: "Chaînes TV", path: "/tv" },
    { icon: Settings, label: "Paramètres", path: "/settings" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">StreamApp</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
