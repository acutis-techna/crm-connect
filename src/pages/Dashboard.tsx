import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandshakeIcon, Users, Building2, CalendarCheck, TrendingUp, DollarSign } from "lucide-react";

export default function Dashboard() {
  const accountId = useAccountId();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const [deals, contacts, orgs, activities] = await Promise.all([
        supabase.from("deals").select("id, value, status").eq("account_id", accountId!),
        supabase.from("contacts").select("id").eq("account_id", accountId!),
        supabase.from("organizations").select("id").eq("account_id", accountId!),
        supabase.from("activities").select("id, completed").eq("account_id", accountId!),
      ]);
      const dealsData = deals.data ?? [];
      const openDeals = dealsData.filter((d) => d.status === "open");
      const wonDeals = dealsData.filter((d) => d.status === "won");
      const totalValue = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const wonValue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const pendingActivities = (activities.data ?? []).filter((a) => !a.completed).length;

      return {
        totalDeals: dealsData.length,
        openDeals: openDeals.length,
        wonDeals: wonDeals.length,
        totalContacts: contacts.data?.length ?? 0,
        totalOrgs: orgs.data?.length ?? 0,
        totalValue,
        wonValue,
        pendingActivities,
      };
    },
  });

  const cards = [
    { title: "Deals Abertos", value: stats?.openDeals ?? 0, icon: HandshakeIcon, color: "text-info" },
    { title: "Valor no Pipeline", value: `R$ ${(stats?.totalValue ?? 0).toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-warning" },
    { title: "Deals Ganhos", value: stats?.wonDeals ?? 0, icon: TrendingUp, color: "text-success" },
    { title: "Contatos", value: stats?.totalContacts ?? 0, icon: Users, color: "text-info" },
    { title: "Organizações", value: stats?.totalOrgs ?? 0, icon: Building2, color: "text-muted-foreground" },
    { title: "Atividades Pendentes", value: stats?.pendingActivities ?? 0, icon: CalendarCheck, color: "text-warning" },
  ];

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
