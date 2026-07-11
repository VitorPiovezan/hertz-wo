"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import type { Budget, BudgetItem } from "@/types";

const schema = z.object({
  client_id: z.string().optional(),
  equipment_name: z.string().min(1, "Nome do equipamento obrigatório"),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected"]),
  items: z.array(z.object({ label: z.string().min(1), amount: z.string() })),
});

type FormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Budget & { items?: Omit<BudgetItem, "id" | "budget_id">[] }>;
  onSubmit: (data: {
    client_id?: string;
    equipment_name: string;
    notes?: string;
    status: Budget["status"];
    items: Omit<BudgetItem, "id" | "budget_id">[];
  }) => void;
  loading?: boolean;
}

export function BudgetForm({ defaultValues, onSubmit, loading }: Props) {
  const { data: clients } = useClients();
  const defaultClientId: string | undefined = defaultValues?.client_id == null ? undefined : defaultValues.client_id;
  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: "",
      equipment_name: "",
      notes: "",
      status: "draft",
      items: [{ label: "Serviço", amount: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (defaultValues) {
      reset({
        client_id: defaultValues.client_id ?? "",
        equipment_name: defaultValues.equipment_name ?? "",
        notes: defaultValues.notes ?? "",
        status: defaultValues.status ?? "draft",
        items: defaultValues.items?.length
          ? defaultValues.items.map((i) => ({ label: i.label, amount: String(i.amount) }))
          : [{ label: "Serviço", amount: "" }],
      });
    }
  }, [defaultValues, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      client_id: data.client_id || undefined,
      equipment_name: data.equipment_name,
      notes: data.notes,
      status: data.status,
      items: data.items
        .filter((i) => i.label && i.amount)
        .map((i) => ({ label: i.label, amount: parseFloat(i.amount) })),
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select onValueChange={(v: string | null) => setValue("client_id", v ?? undefined)} defaultValue={defaultClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar cliente (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem cliente</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select onValueChange={(v: string | null) => setValue("status", (v ?? "draft") as Budget["status"])} defaultValue={defaultValues?.status ?? "draft"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Recusado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="equipment_name">Equipamento <span className="text-destructive">*</span></Label>
        <Input id="equipment_name" {...register("equipment_name")} placeholder="Caixa de som JBL 15" />
        {errors.equipment_name && <p className="text-xs text-destructive">{errors.equipment_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Itens do Orçamento</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input {...register(`items.${index}.label`)} placeholder="Ex: Troca de tweeter" className="flex-1" />
            <Input {...register(`items.${index}.amount`)} type="number" step="0.01" placeholder="0,00" className="w-32" />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ label: "", amount: "" })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" {...register("notes")} placeholder="Condições, garantia, prazo de entrega..." rows={3} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
