import { useDroppable } from "@dnd-kit/core";
import { DealCard } from "./DealCard";

interface Stage {
  id: string;
  name: string;
  position: number;
  probability: number | null;
}

interface Deal {
  id: string;
  title: string;
  value: number | null;
  stage_id: string;
  status: string;
  contacts?: { name: string } | null;
  organizations?: { name: string } | null;
}

interface StageColumnProps {
  stage: Stage;
  deals: Deal[];
  totalValue: number;
}

export function StageColumn({ stage, deals, totalValue }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 min-w-[18rem] flex-col rounded-lg transition-colors ${
        isOver ? "bg-info/10 ring-2 ring-info/30" : "bg-secondary/50"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
          <p className="text-xs text-muted-foreground">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} · R$ {totalValue.toLocaleString("pt-BR")}
          </p>
        </div>
        {stage.probability !== null && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {stage.probability}%
          </span>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin min-h-[100px]">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
