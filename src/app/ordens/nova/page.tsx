"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { OrderForm } from "@/components/orders/OrderForm";
import { useCreateOrder } from "@/hooks/useOrders";
import toast from "react-hot-toast";

export default function NovaOrdemPage() {
  const router = useRouter();
  const create = useCreateOrder();

  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Nova Ordem de Serviço</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <OrderForm
                onSubmit={(data) => {
                  create.mutate(
                    { ...data, status: "pending" },
                    {
                      onSuccess: (order) => {
                        toast.success("Ordem criada");
                        router.push(`/ordens?id=${order.id}`);
                      },
                      onError: () => toast.error("Erro ao criar ordem"),
                    }
                  );
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
