'use client';

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pdf } from '@react-pdf/renderer';
import { ReceiptDocument, reciboNumero } from './ReceiptDocument';
import type { ServiceOrder } from '@/types';
import toast from 'react-hot-toast';

function nomeArquivo(order: ServiceOrder) {
  const cliente = (order.client?.name ?? 'cliente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `recibo-${reciboNumero(order)}-${cliente}.pdf`;
}

/**
 * Gera o recibo sob demanda, no clique.
 *
 * Usa `pdf().toBlob()` em vez de <PDFDownloadLink> de propósito: o
 * PDFDownloadLink renderiza o documento assim que monta, e na lista de
 * Serviços Concluídos isso significaria gerar dezenas de PDFs a cada
 * carregamento da tela.
 */
export function ReceiptButton({
  order,
  variant = 'outline',
  size = 'sm',
  label = 'Recibo',
}: {
  order: ServiceOrder;
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'sm' | 'default' | 'icon';
  label?: string;
}) {
  const [gerando, setGerando] = useState(false);

  const baixar = async (e: React.MouseEvent) => {
    // O card da lista é clicável; o recibo não deve navegar para a OS.
    e.preventDefault();
    e.stopPropagation();
    if (gerando) return;

    setGerando(true);
    try {
      const blob = await pdf(<ReceiptDocument order={order} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo(order);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar o recibo');
    } finally {
      setGerando(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={baixar} disabled={gerando}>
      <Receipt className="h-3.5 w-3.5 mr-1" />
      {gerando ? 'Gerando...' : label}
    </Button>
  );
}
