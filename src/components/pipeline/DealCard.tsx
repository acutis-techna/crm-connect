import { useDraggable } from "@dnd-kit/core";
import { DollarSign, User, Building2 } from "lucide-react";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage_id: string;
  status: string;
  contacts?: { name: string } | null;
  organizations?: { name: string } | null;
}

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
}

export function DealCard({ deal, isDragging }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
        isDragging ? "opacity-90 shadow-lg ring-2 ring-primary/20" : ""
      }`}
    >
      <h4 className="text-sm font-medium text-foreground mb-1.5">{deal.title}</h4>
      <div className="space-y-1">
        {deal.value !== null && deal.value > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>R$ {Number(deal.value).toLocaleString("pt-BR")}</span>
          </div>
        )}
        {deal.contacts?.name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{deal.contacts.name}</span>
          </div>
        )}
        {deal.organizations?.name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{deal.organizations.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
