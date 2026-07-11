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
import type { Client } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone_primary: z.string().min(1, "Celular obrigatório"),
  phones_secondary: z.array(z.object({ value: z.string() })),
  address: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Client>;
  onSubmit: (data: Omit<Client, "id" | "user_id" | "created_at">) => void;
  loading?: boolean;
}

export function ClientForm({ defaultValues, onSubmit, loading }: Props) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone_primary: "",
      phones_secondary: [],
      address: "",
      cpf_cnpj: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "phones_secondary" });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? "",
        phone_primary: defaultValues.phone_primary ?? "",
        phones_secondary: (defaultValues.phones_secondary ?? []).map((v) => ({ value: v })),
        address: defaultValues.address ?? "",
        cpf_cnpj: defaultValues.cpf_cnpj ?? "",
        notes: defaultValues.notes ?? "",
      });
    }
  }, [defaultValues, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      phone_primary: data.phone_primary,
      phones_secondary: data.phones_secondary.map((p) => p.value).filter(Boolean),
      address: data.address,
      cpf_cnpj: data.cpf_cnpj,
      notes: data.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome / Empresa <span className="text-destructive">*</span></Label>
          <Input id="name" {...register("name")} placeholder="João Silva" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone_primary">Celular <span className="text-destructive">*</span></Label>
          <Input id="phone_primary" {...register("phone_primary")} placeholder="(11) 99999-9999" />
          {errors.phone_primary && <p className="text-xs text-destructive">{errors.phone_primary.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Celulares adicionais</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input {...register(`phones_secondary.${index}.value`)} placeholder="(11) 99999-9999" />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar celular
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
          <Input id="cpf_cnpj" {...register("cpf_cnpj")} placeholder="000.000.000-00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" {...register("address")} placeholder="Rua das Flores, 123" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" {...register("notes")} placeholder="Informações adicionais sobre o cliente..." rows={3} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
