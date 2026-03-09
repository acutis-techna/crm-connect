import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TopBarProps {
  title: string;
  children?: React.ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        {children}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-64 pl-9 h-9 text-sm" placeholder="Buscar..." />
        </div>
        <button className="relative rounded-md p-2 hover:bg-secondary">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
