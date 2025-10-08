import { Home, Film, Tv, Radio, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function DesktopSidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Film, label: t("nav.movies"), path: "/films" },
    { icon: Tv, label: t("nav.series"), path: "/series" },
    { icon: Radio, label: t("nav.tvChannels"), path: "/tv" },
    { icon: Settings, label: t("nav.settings"), path: "/settings" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">AnisFlix</h1>
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
