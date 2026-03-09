import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

function EditableStageName({ stage, onRename }: { stage: { id: string; name: string }; onRename: (args: { id: string; name: string }) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(stage.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== stage.name) {
      onRename({ id: stage.id, name: trimmed });
    } else {
      setValue(stage.name);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          className="h-6 w-28 rounded border border-input bg-background px-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </form>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="group flex items-center gap-1 text-sm hover:text-primary">
      {stage.name}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60" />
    </button>
  );
}

export default function SettingsPage() {
  const accountId = useAccountId();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from("pipelines").select("*").eq("account_id", accountId!);
      return data ?? [];
    },
  });

  // Stages for each pipeline
  const { data: allStages = [] } = useQuery({
    queryKey: ["all-stages", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const pipelineIds = pipelines.map((p) => p.id);
      if (pipelineIds.length === 0) return [];
      const { data } = await supabase.from("stages").select("*").in("pipeline_id", pipelineIds).order("position");
      return data ?? [];
    },
  });

  // Users/profiles
  const { data: users = [] } = useQuery({
    queryKey: ["users", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("account_id", accountId!);
      return data ?? [];
    },
  });

  // Create pipeline
  const [newPipeline, setNewPipeline] = useState("");
  const createPipeline = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pipelines").insert({ account_id: accountId!, name: newPipeline });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      setNewPipeline("");
      toast.success("Pipeline criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Create stage
  const [stageForm, setStageForm] = useState({ name: "", pipeline_id: "", probability: "0" });
  const [stageOpen, setStageOpen] = useState(false);
  const createStage = useMutation({
    mutationFn: async () => {
      const maxPos = allStages.filter((s) => s.pipeline_id === stageForm.pipeline_id).length;
      const { error } = await supabase.from("stages").insert({
        pipeline_id: stageForm.pipeline_id,
        name: stageForm.name,
        position: maxPos,
        probability: parseInt(stageForm.probability) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-stages"] });
      setStageOpen(false);
      setStageForm({ name: "", pipeline_id: "", probability: "0" });
      toast.success("Stage criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-stages"] });
      toast.success("Stage removido!");
    },
  });

  return (
    <>
      <TopBar title="Configurações" />
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="pipelines">
          <TabsList>
            <TabsTrigger value="pipelines">Pipelines & Stages</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="account">Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="pipelines" className="space-y-6 mt-4">
            {/* Create Pipeline */}
            <Card>
              <CardHeader><CardTitle className="text-base">Novo Pipeline</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input placeholder="Nome do pipeline" value={newPipeline} onChange={(e) => setNewPipeline(e.target.value)} />
                  <Button onClick={() => createPipeline.mutate()} disabled={!newPipeline || createPipeline.isPending}>Criar</Button>
                </div>
              </CardContent>
            </Card>

            {/* Pipelines & Stages */}
            {pipelines.map((p) => {
              const stages = allStages.filter((s) => s.pipeline_id === p.id);
              return (
                <Card key={p.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <Dialog open={stageOpen && stageForm.pipeline_id === p.id} onOpenChange={(v) => { setStageOpen(v); if (v) setStageForm({ ...stageForm, pipeline_id: p.id }); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" />Stage</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Novo Stage</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); createStage.mutate(); }} className="space-y-4">
                          <div className="space-y-2"><Label>Nome</Label><Input value={stageForm.name} onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })} required /></div>
                          <div className="space-y-2"><Label>Probabilidade (%)</Label><Input type="number" min="0" max="100" value={stageForm.probability} onChange={(e) => setStageForm({ ...stageForm, probability: e.target.value })} /></div>
                          <Button type="submit" className="w-full" disabled={createStage.isPending}>Criar</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {stages.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <EditableStageName stage={s} onRename={renameStage.mutate} />
                            <span className="text-xs text-muted-foreground">({s.probability}%)</span>
                          </div>
                          <button onClick={() => deleteStage.mutate(s.id)} className="rounded p-1 hover:bg-destructive/10 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {stages.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum stage</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Usuários da Conta</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Informações da Conta</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Account ID: {accountId}</p>
                <p className="text-sm text-muted-foreground mt-1">Usuário: {profile?.name} ({profile?.email})</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
