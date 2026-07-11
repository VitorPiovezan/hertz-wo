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
import { ClientCombobox } from "@/components/ui/client-combobox";
import { useClients } from "@/hooks/useClients";
import type { ServiceOrder, OrderValue } from "@/types";

const schema = z.object({
  client_id: z.string().optional(),
  equipment_name: z.string().min(1, "Nome do equipamento obrigatório"),
  maintenance_type: z.string().min(1, "Tipo de manutenção obrigatório"),
  deadline: z.string().optional(),
  notes: z.string().optional(),
  values: z.array(z.object({ label: z.string().min(1), amount: z.string() })),
});

type FormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<ServiceOrder & { values?: Omit<OrderValue, "id" | "order_id">[] }>;
  onSubmit: (data: {
    client_id?: string;
    equipment_name: string;
    maintenance_type: string;
    deadline?: string;
    notes?: string;
    values: Omit<OrderValue, "id" | "order_id">[];
  }) => void;
  loading?: boolean;
}

export function OrderForm({ defaultValues, onSubmit, loading }: Props) {
  const { data: clients } = useClients();
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: "",
      equipment_name: "",
      maintenance_type: "",
      deadline: "",
      notes: "",
      values: [{ label: "Mão de obra", amount: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "values" });

  useEffect(() => {
    if (defaultValues) {
      reset({
        client_id: defaultValues.client_id ?? "",
        equipment_name: defaultValues.equipment_name ?? "",
        maintenance_type: defaultValues.maintenance_type ?? "",
        deadline: defaultValues.deadline ? defaultValues.deadline.slice(0, 10) : "",
        notes: defaultValues.notes ?? "",
        values: defaultValues.values?.length
          ? defaultValues.values.map((v) => ({ label: v.label, amount: String(v.amount) }))
          : [{ label: "Mão de obra", amount: "" }],
      });
    }
  }, [defaultValues, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      client_id: data.client_id || undefined,
      equipment_name: data.equipment_name,
      maintenance_type: data.maintenance_type,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      notes: data.notes,
      values: data.values
        .filter((v) => v.label && v.amount)
        .map((v) => ({ label: v.label, amount: parseFloat(v.amount) })),
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Cliente</Label>
        <ClientCombobox
          options={clients?.map((c) => ({ value: c.id, label: c.name })) ?? []}
          value={watch("client_id") || undefined}
          onChange={(v) => setValue("client_id", v)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="equipment_name">Equipamento <span className="text-destructive">*</span></Label>
          <Input id="equipment_name" {...register("equipment_name")} placeholder="Caixa de som JBL 15" />
          {errors.equipment_name && <p className="text-xs text-destructive">{errors.equipment_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maintenance_type">Tipo de Manutenção <span className="text-destructive">*</span></Label>
          <Input id="maintenance_type" {...register("maintenance_type")} placeholder="Troca de alto-falante" />
          {errors.maintenance_type && <p className="text-xs text-destructive">{errors.maintenance_type.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="deadline">Prazo de conclusão</Label>
        <Input id="deadline" type="date" {...register("deadline")} />
      </div>

      <div className="space-y-2">
        <Label>Valores</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input
              {...register(`values.${index}.label`)}
              placeholder="Ex: Mão de obra"
              className="flex-1"
            />
            <Input
              {...register(`values.${index}.amount`)}
              type="number"
              step="0.01"
              placeholder="0,00"
              className="w-32"
            />
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
        <Textarea id="notes" {...register("notes")} placeholder="Detalhes sobre a manutenção..." rows={3} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
