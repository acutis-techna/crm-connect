import {
  BarChart3, Users, Building2, HandshakeIcon, CalendarCheck,
  Settings, Zap, Webhook, LogOut, ChevronLeft, ChevronRight
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "Negociações", url: "/deals", icon: HandshakeIcon },
  { title: "Contatos", url: "/contacts", icon: Users },
  { title: "Organizações", url: "/organizations", icon: Building2 },
  { title: "Atividades", url: "/activities", icon: CalendarCheck },
  { title: "Automação", url: "/automation", icon: Zap },
  { title: "Webhooks", url: "/webhooks", icon: Webhook },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
              <BarChart3 className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-sidebar-accent-foreground">TechnaCRM</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        {!collapsed && profile && (
          <div className="mb-2 px-3 py-2">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{profile.name}</p>
            <p className="text-xs text-sidebar-foreground truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
