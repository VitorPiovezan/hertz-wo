"use client";

import { useState, useMemo } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOrders } from "@/hooks/useOrders";
import { useBudgets } from "@/hooks/useBudgets";
import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import type { PaymentMethod } from "@/types";

type Period = "week" | "month" | "last_month" | "custom";

function getInterval(period: Period, from: string, to: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === "week") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  if (period === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
  if (period === "last_month") { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
  return {
    start: from ? new Date(from) : startOfMonth(now),
    end: to ? new Date(to) : endOfMonth(now),
  };
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { data: orders } = useOrders();
  const { data: budgets } = useBudgets();

  const { start, end } = getInterval(period, customFrom, customTo);

  const inRange = (date: string) => isWithinInterval(parseISO(date), { start, end });

  const filteredOrders = useMemo(() => orders?.filter((o) => inRange(o.created_at)) ?? [], [orders, start, end]);
  const filteredBudgets = useMemo(() => budgets?.filter((b) => inRange(b.created_at)) ?? [], [budgets, start, end]);

  const completed = filteredOrders.filter((o) => o.status === "completed");
  const inProgress = filteredOrders.filter((o) => o.status === "in_progress");
  const received = completed.filter((o) => o.payment_status === "paid");
  const pending = completed.filter((o) => o.payment_status !== "paid");

  const totalReceived = received.reduce((acc, o) => acc + (o.payment_amount ?? 0), 0);
  const totalPending = pending.reduce((acc, o) => acc + (o.values?.reduce((s, v) => s + Number(v.amount), 0) ?? 0), 0);
  const totalBudgets = filteredBudgets.reduce((acc, b) => acc + (b.items?.reduce((s, i) => s + Number(i.amount), 0) ?? 0), 0);

  const statusData = [
    { name: "Pendente", value: filteredOrders.filter((o) => o.status === "pending").length },
    { name: "Em Aprovação", value: filteredOrders.filter((o) => o.status === "in_review").length },
    { name: "Em Andamento", value: inProgress.length },
    { name: "Concluída", value: completed.length },
  ].filter((d) => d.value > 0);

  const paymentMethodData = (["pix", "card", "cash"] as PaymentMethod[]).map((m) => ({
    name: PAYMENT_METHOD_LABELS[m],
    value: received.filter((o) => o.payment_method === m).length,
    total: received.filter((o) => o.payment_method === m).reduce((acc, o) => acc + (o.payment_amount ?? 0), 0),
  })).filter((d) => d.value > 0);

  const stats = [
    { label: "OSs Concluídas", value: completed.length, sub: `${filteredOrders.length} no período`, color: "text-green-600 dark:text-green-400" },
    { label: "Em Andamento", value: inProgress.length, color: "text-blue-600 dark:text-blue-400" },
    { label: "Orçamentos", value: filteredBudgets.length, sub: formatCurrency(totalBudgets), color: "text-purple-600 dark:text-purple-400" },
    { label: "Receita Recebida", value: formatCurrency(totalReceived), color: "text-green-600 dark:text-green-400" },
    { label: "Receita Pendente", value: formatCurrency(totalPending), color: "text-orange-600 dark:text-orange-400" },
  ];

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-xl font-bold flex-1">Relatórios</h1>
            <Select value={period} onValueChange={(v: string | null) => setPeriod((v ?? "month") as Period)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="last_month">Mês passado</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-36" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-36" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">OSs por Status</CardTitle></CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Formas de Pagamento</CardTitle></CardHeader>
              <CardContent>
                {paymentMethodData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem pagamentos no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [formatCurrency((p.payload as { total: number }).total), "Recebido"]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
