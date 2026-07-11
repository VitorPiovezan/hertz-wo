"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Budget } from "@/types";
import { formatCurrency, formatDate, sumValues } from "@/lib/utils";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a1a" },
  header: { marginBottom: 28 },
  company: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#4f46e5" },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 16, marginTop: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  label: { color: "#374151", flex: 1 },
  value: { fontFamily: "Helvetica-Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: "#4f46e5" },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 12, color: "#4f46e5" },
  notes: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  footer: { marginTop: 40, fontSize: 9, color: "#9ca3af", textAlign: "center" },
});

function BudgetDocument({ budget }: { budget: Budget }) {
  const total = sumValues(budget.items ?? []);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>LP Tech</Text>
          <Text style={styles.subtitle}>Sistema de Ordens de Serviço</Text>
        </View>

        <Text style={styles.title}>Orçamento</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Data</Text>
            <Text>{formatDate(budget.created_at)}</Text>
          </View>
          {budget.client && (
            <View style={styles.row}>
              <Text style={styles.label}>Cliente</Text>
              <Text>{budget.client.name}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Equipamento</Text>
            <Text>{budget.equipment_name}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens</Text>
          {budget.items?.map((item, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {budget.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.notes}>{budget.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>Orçamento gerado em {formatDate(new Date().toISOString())} via LP Tech</Text>
      </Page>
    </Document>
  );
}

export function BudgetPDFDownload({ budget }: { budget: Budget }) {
  return (
    <PDFDownloadLink
      document={<BudgetDocument budget={budget} />}
      fileName={`orcamento-${budget.equipment_name.toLowerCase().replace(/\s+/g, "-")}-${formatDate(budget.created_at).replace(/\//g, "-")}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="h-4 w-4 mr-1" />
          {loading ? "Gerando PDF..." : "Baixar PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
