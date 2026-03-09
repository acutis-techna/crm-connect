import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EVENTS = [
  "contact.created",
  "deal.created",
  "deal.updated",
  "deal.stage_changed",
  "activity.created",
];

export default function Webhooks() {
  const accountId = useAccountId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ event: "", url: "" });

  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhooks", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data } = await supabase.from("webhooks").select("*").eq("account_id", accountId!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("webhooks").insert({ account_id: accountId!, event: form.event, url: form.url });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setOpen(false);
      setForm({ event: "", url: "" });
      toast.success("Webhook criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("webhooks").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook removido!");
    },
  });

  return (
    <>
      <TopBar title="Webhooks">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo Webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Webhook</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Evento</Label>
                <Select value={form.event} onValueChange={(v) => setForm({ ...form, event: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{EVENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>URL</Label><Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required placeholder="https://..." /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>Criar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </TopBar>
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell><Badge variant="secondary">{w.event}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{w.url}</TableCell>
                  <TableCell>
                    <Switch checked={w.active} onCheckedChange={(v) => toggle.mutate({ id: w.id, active: v })} />
                  </TableCell>
                  <TableCell>
                    <button onClick={() => remove.mutate(w.id)} className="rounded p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </TableCell>
                </TableRow>
              ))}
              {webhooks.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum webhook configurado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
