import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useState } from "react";
import { StageColumn } from "./StageColumn";
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

interface PipelineBoardProps {
  pipelineId: string;
  stages: Stage[];
}

export function PipelineBoard({ pipelineId, stages }: PipelineBoardProps) {
  const accountId = useAccountId();
  const queryClient = useQueryClient();
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", pipelineId, accountId],
    enabled: !!pipelineId && !!accountId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*, contacts(name), organizations(name)")
        .eq("pipeline_id", pipelineId)
        .eq("account_id", accountId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as Deal[];
    },
  });

  const moveDeal = useMutation({
    mutationFn: async ({ dealId, newStageId }: { dealId: string; newStageId: string }) => {
      const { error } = await supabase.from("deals").update({ stage_id: newStageId }).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a stage column
    const targetStage = stages.find((s) => s.id === overId);
    if (targetStage) {
      const deal = deals.find((d) => d.id === dealId);
      if (deal && deal.stage_id !== targetStage.id) {
        moveDeal.mutate({ dealId, newStageId: targetStage.id });
      }
      return;
    }

    // Check if dropped on another deal - use that deal's stage
    const targetDeal = deals.find((d) => d.id === overId);
    if (targetDeal) {
      const deal = deals.find((d) => d.id === dealId);
      if (deal && deal.stage_id !== targetDeal.stage_id) {
        moveDeal.mutate({ dealId, newStageId: targetDeal.stage_id });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4 scrollbar-thin">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage_id === stage.id);
          const stageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              totalValue={stageValue}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
