'use client';

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import {
  LPX_LOGO_PNG,
  LPX_LOGO_RATIO,
  LPX_ASSINATURA_PNG,
  LPX_ASSINATURA_RATIO,
  LPX_SIGNATARIO,
  LPX_EMPRESA,
  LPX_RAMO,
} from '@/lib/logo';
import { valorPorExtenso } from '@/lib/extenso';
import {
  formatCurrency,
  formatDate,
  orderReceived,
  orderTotal,
  PAYMENT_METHOD_LABELS,
} from '@/lib/utils';
import type { OrderPayment, PaymentMethod, ServiceOrder } from '@/types';

const LOGO_WIDTH = 165;
const ASSINATURA_WIDTH = 170;
const ROXO = '#4f46e5';

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a' },
  header: { alignItems: 'center', marginBottom: 18 },
  logo: { width: LOGO_WIDTH, height: LOGO_WIDTH / LPX_LOGO_RATIO },

  tituloBloco: {
    marginTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: ROXO,
    borderBottomWidth: 1.5,
    borderBottomColor: ROXO,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: { fontSize: 20, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  numero: { fontSize: 10, color: '#6b7280' },

  valorCaixa: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  valorRotulo: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  valor: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: ROXO },

  corpo: { marginTop: 18, fontSize: 11, lineHeight: 1.7, textAlign: 'justify' },
  negrito: { fontFamily: 'Helvetica-Bold' },
  extenso: { fontFamily: 'Helvetica-Oblique' },

  secao: { marginTop: 22 },
  secaoTitulo: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  rotulo: { color: '#374151' },
  totalLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: ROXO,
    marginTop: 2,
  },
  totalTexto: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  totalValor: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: ROXO },

  fecho: { marginTop: 26, fontSize: 11, lineHeight: 1.7 },
  data: { marginTop: 26, textAlign: 'center', fontSize: 11 },

  assinaturaBloco: { marginTop: 6, alignItems: 'center' },
  assinatura: { width: ASSINATURA_WIDTH, height: ASSINATURA_WIDTH / LPX_ASSINATURA_RATIO },
  risco: { width: 220, borderTopWidth: 0.8, borderTopColor: '#9ca3af', marginTop: -4 },
  signatario: { marginTop: 5, fontSize: 11, fontFamily: 'Helvetica-Bold' },
  empresa: { fontSize: 9, color: '#6b7280', marginTop: 1 },

  rodape: {
    position: 'absolute',
    bottom: 32,
    left: 44,
    right: 44,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function dataPorExtenso(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function reciboNumero(order: ServiceOrder) {
  if (!order.order_number) return order.id.slice(0, 8).toUpperCase();
  return `${new Date(order.created_at).getFullYear()}${String(order.order_number).padStart(5, '0')}`;
}

/** Data em que a OS foi quitada — é a data do recibo. */
function dataQuitacao(order: ServiceOrder) {
  const pagamentos = order.payments ?? [];
  if (pagamentos.length > 0) {
    return pagamentos.reduce(
      (maior, p) => (new Date(p.paid_at) > new Date(maior) ? p.paid_at : maior),
      pagamentos[0].paid_at,
    );
  }
  return order.payment_date ?? order.created_at;
}

export function ReceiptDocument({ order }: { order: ServiceOrder }) {
  const total = orderTotal(order);
  const recebido = orderReceived(order);
  // O recibo vale pelo que entrou no caixa.
  const valor = recebido > 0 ? recebido : total;
  const quitadoEm = dataQuitacao(order);
  const pagamentos: OrderPayment[] = [...(order.payments ?? [])].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime(),
  );

  return (
    <Document
      title={`Recibo ${reciboNumero(order)}`}
      author={LPX_EMPRESA}
      subject={`Recibo referente à OS #${reciboNumero(order)}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src={LPX_LOGO_PNG} />
        </View>

        <View style={styles.tituloBloco}>
          <Text style={styles.titulo}>RECIBO</Text>
          <Text style={styles.numero}>Nº {reciboNumero(order)}</Text>
        </View>

        <View style={styles.valorCaixa}>
          <Text style={styles.valorRotulo}>Valor recebido</Text>
          <Text style={styles.valor}>{formatCurrency(valor)}</Text>
        </View>

        <Text style={styles.corpo}>
          Recebi{order.client ? ' de ' : ' '}
          <Text style={styles.negrito}>{order.client?.name ?? 'cliente não identificado'}</Text>
          {' '}a importância de <Text style={styles.negrito}>{formatCurrency(valor)}</Text>
          {' '}(<Text style={styles.extenso}>{valorPorExtenso(valor)}</Text>), referente ao serviço
          de <Text style={styles.negrito}>{order.maintenance_type}</Text> no equipamento{' '}
          <Text style={styles.negrito}>{order.equipment_name}</Text>, conforme a Ordem de Serviço
          nº {reciboNumero(order)}.
        </Text>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Discriminação do serviço</Text>
          {order.values?.map((v, i) => (
            <View key={i} style={styles.linha}>
              <Text style={styles.rotulo}>{v.label}</Text>
              <Text>{formatCurrency(Number(v.amount))}</Text>
            </View>
          ))}
          <View style={styles.totalLinha}>
            <Text style={styles.totalTexto}>Total</Text>
            <Text style={styles.totalValor}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {pagamentos.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>
              {pagamentos.length > 1 ? 'Pagamentos recebidos' : 'Pagamento'}
            </Text>
            {pagamentos.map(p => (
              <View key={p.id} style={styles.linha}>
                <Text style={styles.rotulo}>
                  {formatDate(p.paid_at)}
                  {p.method ? `  ·  ${PAYMENT_METHOD_LABELS[p.method as PaymentMethod]}` : ''}
                </Text>
                <Text>{formatCurrency(Number(p.amount))}</Text>
              </View>
            ))}
            {pagamentos.length > 1 && (
              <View style={styles.totalLinha}>
                <Text style={styles.totalTexto}>Total recebido</Text>
                <Text style={styles.totalValor}>{formatCurrency(recebido)}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.fecho}>
          Dou plena e geral quitação do valor acima, referente ao serviço descrito.
          Para maior clareza, firmo o presente recibo.
        </Text>

        <Text style={styles.data}>{dataPorExtenso(quitadoEm)}</Text>

        <View style={styles.assinaturaBloco}>
          <Image style={styles.assinatura} src={LPX_ASSINATURA_PNG} />
          <View style={styles.risco} />
          <Text style={styles.signatario}>{LPX_SIGNATARIO}</Text>
          <Text style={styles.empresa}>
            {LPX_EMPRESA} — {LPX_RAMO}
          </Text>
        </View>

        <Text style={styles.rodape} fixed>
          Recibo emitido em {formatDate(new Date().toISOString())} · {LPX_EMPRESA}
        </Text>
      </Page>
    </Document>
  );
}

