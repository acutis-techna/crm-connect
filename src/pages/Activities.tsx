import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Mail, Calendar, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const typeIcons: Record<string, any> = { call: Phone, email: Mail, meeting: Calendar, task: CheckSquare };
const typeLabels: Record<string, string> = { call: "Ligação", email: "Email", meeting: "Reunião", task: "Tarefa" };

export default function Activities() {
  const accountId = useAccountId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "task", description: "", due_date: "", deal_id: "" });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*, deals(title)")
        .eq("account_id", accountId!)
        .order("due_date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals-select", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, title").eq("account_id", accountId!);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        account_id: accountId!,
        type: form.type,
        description: form.description || null,
        due_date: form.due_date || null,
        deal_id: form.deal_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setOpen(false);
      setForm({ type: "task", description: "", due_date: "", deal_id: "" });
      toast.success("Atividade criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("activities").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities"] }),
  });

  return (
    <>
      <TopBar title="Atividades">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Nova Atividade</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="task">Tarefa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Data</Label><Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Deal</Label>
                <Select value={form.deal_id} onValueChange={(v) => setForm({ ...form, deal_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                  <SelectContent>{deals.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>Criar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </TopBar>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-2">
          {activities.map((a: any) => {
            const Icon = typeIcons[a.type] || CheckSquare;
            return (
              <div key={a.id} className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${a.completed ? "opacity-60" : ""}`}>
                <Checkbox
                  checked={a.completed}
                  onCheckedChange={(v) => toggleComplete.mutate({ id: a.id, completed: !!v })}
                />
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${a.completed ? "line-through" : ""}`}>{a.description || "Sem descrição"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {a.deals?.title && <span className="text-xs text-muted-foreground">{a.deals.title}</span>}
                    {a.due_date && <span className="text-xs text-muted-foreground">{format(new Date(a.due_date), "dd/MM/yyyy HH:mm")}</span>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{typeLabels[a.type]}</Badge>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhuma atividade ainda</div>
          )}
        </div>
      </div>
    </>
  );
}
