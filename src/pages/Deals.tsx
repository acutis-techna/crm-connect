import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";

export default function Deals() {
  const accountId = useAccountId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", contact_id: "", organization_id: "", stage_id: "" });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from("pipelines").select("*").eq("account_id", accountId!);
      return data ?? [];
    },
  });

  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const activePipelineId = selectedPipeline || pipelines[0]?.id || "";

  const { data: stages = [] } = useQuery({
    queryKey: ["stages", activePipelineId],
    enabled: !!activePipelineId,
    queryFn: async () => {
      const { data } = await supabase.from("stages").select("*").eq("pipeline_id", activePipelineId).order("position");
      return data ?? [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-select", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, name").eq("account_id", accountId!);
      return data ?? [];
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-select", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name").eq("account_id", accountId!);
      return data ?? [];
    },
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const stageId = form.stage_id || stages[0]?.id;
      if (!stageId) throw new Error("Nenhum stage disponível");
      const { error } = await supabase.from("deals").insert({
        account_id: accountId!,
        title: form.title,
        value: form.value ? parseFloat(form.value) : 0,
        contact_id: form.contact_id || null,
        organization_id: form.organization_id || null,
        pipeline_id: activePipelineId,
        stage_id: stageId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setOpen(false);
      setForm({ title: "", value: "", contact_id: "", organization_id: "", stage_id: "" });
      toast.success("Deal criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <TopBar title="Pipeline">
        <div className="flex items-center gap-2">
          {pipelines.length > 1 && (
            <Select value={activePipelineId} onValueChange={setSelectedPipeline}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo Deal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Deal</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createDeal.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={form.stage_id} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Primeiro stage" /></SelectTrigger>
                    <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Select value={form.organization_id} onValueChange={(v) => setForm({ ...form, organization_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createDeal.isPending}>Criar Deal</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </TopBar>
      <div className="flex-1 overflow-hidden">
        <PipelineBoard pipelineId={activePipelineId} stages={stages} />
      </div>
    </>
  );
}
