import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight } from "lucide-react";

const automations = [
  { event: "contact.created", description: "Quando um contato é criado, envia dados via webhook para sistemas externos." },
  { event: "deal.created", description: "Quando um deal é criado, notifica webhooks configurados." },
  { event: "deal.updated", description: "Quando um deal é atualizado, envia alterações via webhook." },
  { event: "deal.stage_changed", description: "Quando um deal muda de stage, dispara automação com dados do stage anterior e novo." },
  { event: "activity.created", description: "Quando uma atividade é criada, notifica webhooks configurados." },
];

export default function Automation() {
  return (
    <>
      <TopBar title="Automação" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Eventos de Automação</h2>
          <p className="text-sm text-muted-foreground">
            Configure webhooks na página de Webhooks para receber notificações quando esses eventos ocorrerem.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {automations.map((a) => (
            <Card key={a.event}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <CardTitle className="text-sm"><Badge variant="secondary">{a.event}</Badge></CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{a.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Evento detectado</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>POST para webhook URL</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
