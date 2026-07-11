"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { useCreateBudget } from "@/hooks/useBudgets";
import toast from "react-hot-toast";

export default function NovoBudgetPage() {
  const router = useRouter();
  const create = useCreateBudget();

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Novo Orçamento</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <BudgetForm
                onSubmit={(data) => {
                  create.mutate(data, {
                    onSuccess: (b) => { toast.success("Orçamento criado"); router.push(`/orcamentos?id=${b.id}`); },
                    onError: () => toast.error("Erro ao criar orçamento"),
                  });
                }}
                loading={create.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
