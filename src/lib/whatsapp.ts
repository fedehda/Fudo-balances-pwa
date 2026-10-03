// src/lib/whatsapp.ts
import { SupplierBalance, UpcomingExpense, RecurringService, DailyMovement, CashCountReport } from '@/types/fudo';
import { formatCurrencyARS, formatShortDate, cleanPhoneNumber } from './formatters';

export interface BuildMessageParams {
  suppliers: SupplierBalance[];
  upcomingExpenses?: UpcomingExpense[];
  recurringServices?: RecurringService[];
  selectedSupplierIds: string[];
  includeUpcomingExpenses?: boolean;
  selectedCategoryIds?: string[];
  selectedServiceIds?: string[];
}

/**
 * Construye el string formateado para WhatsApp del Estado de Cuenta de Proveedores y Servicios.
 */
export function buildWhatsAppMessage({
  suppliers,
  upcomingExpenses = [],
  recurringServices = [],
  selectedSupplierIds,
  includeUpcomingExpenses = true,
  selectedCategoryIds,
  selectedServiceIds,
}: BuildMessageParams): {
  formattedText: string;
  totalSelectedDebt: number;
  selectedCount: number;
  expensesCount: number;
} {
  const selectedSet = new Set(selectedSupplierIds);
  const categoriesSet = selectedCategoryIds ? new Set(selectedCategoryIds) : null;
  const servicesSet = selectedServiceIds ? new Set(selectedServiceIds) : null;

  const selectedSuppliers = suppliers.filter((s) => selectedSet.has(s.id));
  const totalSelectedDebt = selectedSuppliers.reduce((sum, s) => sum + s.balance, 0);

  const lines: string[] = ['📊 *ESTADO DE CUENTA - PROVEEDORES*', ''];

  if (selectedSuppliers.length === 0) {
    lines.push('_No se seleccionaron proveedores con saldo pendiente._');
  } else {
    for (const supplier of selectedSuppliers) {
      lines.push(`• *${supplier.name}*: ${formatCurrencyARS(supplier.balance)}`);
    }
  }

  lines.push('');
  lines.push(`*Total Consolidado:* ${formatCurrencyARS(totalSelectedDebt)}`);

  let includedExpensesCount = 0;

  // 1. Servicios Recurrentes (Luz, Gas, Software, etc. con vencimientos y montos estimados)
  if (includeUpcomingExpenses && recurringServices.length > 0) {
    const relevantServices = recurringServices.filter((s) => {
      if (servicesSet) return servicesSet.has(s.id);
      return s.status !== 'paid'; // Por defecto los no pagados
    });

    if (relevantServices.length > 0) {
      lines.push('');
      lines.push('⚡ *Servicios & Gastos Recurrentes (Estimados):*');
      for (const s of relevantServices) {
        const dueText = s.actualDueDate ? formatShortDate(s.actualDueDate) : `Día ~${s.typicalDueDay}`;
        const amount = s.actualAmount || s.approxAmount;
        const statusText = s.status === 'pending' ? ' (Facturado)' : s.status === 'paid' ? ' (Pagado)' : ' (Aprox)';
        lines.push(`• ~${dueText}: *${s.name}* - ${formatCurrencyARS(amount)}${statusText}`);
      }
      includedExpensesCount += relevantServices.length;
    }
  }

  // 2. Otros Gastos pendientes específicos (si hay alguno de categorías no-servicios seleccionado)
  if (includeUpcomingExpenses && upcomingExpenses.length > 0) {
    const relevantExpenses = upcomingExpenses.filter((e) => {
      const matchesCategory = !categoriesSet || !e.categoryId || categoriesSet.has(e.categoryId);
      return matchesCategory;
    });

    if (relevantExpenses.length > 0) {
      lines.push('');
      lines.push('⏳ *Otros Vencimientos Pendientes:*');
      for (const expense of relevantExpenses) {
        const dateFormatted = expense.dueDate ? formatShortDate(expense.dueDate) : 'Sin fecha';
        lines.push(`• ${dateFormatted}: ${expense.supplierName} - ${formatCurrencyARS(expense.amount)}`);
      }
      includedExpensesCount += relevantExpenses.length;
    }
  }

  return {
    formattedText: lines.join('\n'),
    totalSelectedDebt,
    selectedCount: selectedSuppliers.length,
    expensesCount: includedExpensesCount,
  };
}

export interface BuildDailyMovementsMessageParams {
  date: string; // YYYY-MM-DD
  payments: DailyMovement[];
  newExpenses: DailyMovement[];
  paymentMethodFilterName?: string;
  totalPayments: number;
  totalNewExpenses: number;
  netChange: number;
}

/**
 * Construye el reporte diario de movimientos en cuenta corriente para WhatsApp:
 * - Transferencias / Pagos realizados
 * - Nuevos gastos en cuenta corriente
 * - Balance neto
 */
export function buildDailyMovementsWhatsAppMessage({
  date,
  payments,
  newExpenses,
  paymentMethodFilterName = 'Todos',
  totalPayments,
  totalNewExpenses,
  netChange,
}: BuildDailyMovementsMessageParams): string {
  // Formatear fecha DD/MM/YYYY
  const [year, month, day] = date.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const lines: string[] = [
    `📊 *REPORTE DIARIO DE MOVIMIENTOS*`,
    `📅 *Fecha:* ${formattedDate}`,
    `💳 *Medio de Pago:* ${paymentMethodFilterName}`,
    '',
  ];

  // 1. Transferencias / Pagos realizados
  lines.push('💸 *TRANSFERENCIAS / PAGOS REALIZADOS:*');
  if (payments.length === 0) {
    lines.push('_No se registraron pagos con el filtro seleccionado._');
  } else {
    // Agrupar por proveedor
    const groupedPayments = new Map<string, { total: number; count: number; method: string }>();
    for (const p of payments) {
      const key = p.providerName;
      if (!groupedPayments.has(key)) {
        groupedPayments.set(key, { total: 0, count: 0, method: p.paymentMethodName || 'Transferencia' });
      }
      const g = groupedPayments.get(key)!;
      g.total += p.amount;
      g.count += 1;
    }

    for (const [prov, data] of groupedPayments) {
      const countNote = data.count > 1 ? ` (${data.count} pagos - ${data.method})` : ` (${data.method})`;
      lines.push(`• *${prov}*: ${formatCurrencyARS(data.total)}${countNote}`);
    }
  }
  lines.push(`*Total Pagado:* ${formatCurrencyARS(totalPayments)}`);
  lines.push('');

  // 2. Nuevos gastos cargados en cuenta corriente
  lines.push('📥 *NUEVOS GASTOS EN CTA. CTE.:*');
  if (newExpenses.length === 0) {
    lines.push('_No se registraron nuevos gastos en cuenta corriente._');
  } else {
    const groupedExpenses = new Map<string, { total: number; count: number }>();
    for (const e of newExpenses) {
      const key = e.providerName;
      if (!groupedExpenses.has(key)) {
        groupedExpenses.set(key, { total: 0, count: 0 });
      }
      const g = groupedExpenses.get(key)!;
      g.total += e.amount;
      g.count += 1;
    }

    for (const [prov, data] of groupedExpenses) {
      const countNote = data.count > 1 ? ` (${data.count} compras)` : '';
      lines.push(`• *${prov}*: ${formatCurrencyARS(data.total)}${countNote}`);
    }
  }
  lines.push(`*Total Nuevos Gastos:* ${formatCurrencyARS(totalNewExpenses)}`);
  lines.push('');

  // 3. Resumen y Balance Neto
  lines.push('📈 *BALANCE NETO DEL DÍA:*');
  lines.push(`• Pagos/Transferencias: ${formatCurrencyARS(totalPayments)}`);
  lines.push(`• Nuevos Gastos: ${formatCurrencyARS(totalNewExpenses)}`);

  if (netChange < 0) {
    lines.push(`• *Variación Deuda:* -${formatCurrencyARS(Math.abs(netChange))} *(Disminución neta de deuda)* 🟢`);
  } else if (netChange > 0) {
    lines.push(`• *Variación Deuda:* +${formatCurrencyARS(netChange)} *(Aumento neto de deuda)* 🔴`);
  } else {
    lines.push(`• *Variación Deuda:* $0 (Sin variación neta) ⚪`);
  }

  return lines.join('\n');
}

/**
 * Construye el reporte de Arqueo de Caja para WhatsApp:
 * - Venta total
 * - Pagos con tarjeta
 * - Pagos con efectivo
 * - Gastos de caja principal detallados y en lista
 * - Movimientos de caja detallados y en lista
 * - Caja inicial
 * - Restante total en efectivo
 */
export function buildCashCountWhatsAppMessage(report: CashCountReport): string {
  const [year, month, day] = report.date.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const lines: string[] = [
    `💵 *REPORTE DE ARQUEO DE CAJA*`,
    `📅 *Fecha:* ${formattedDate} | *Turno:* ${report.shiftName}${report.isClosed === false ? ' (En curso)' : ''}`,
    `🏢 *Caja:* Principal`,
    '',
    `💰 *VENTAS Y MEDIOS DE PAGO:*`,
    `• *Venta Total:* ${formatCurrencyARS(report.totalSales)}`,
    `• *Pagos con Tarjeta (Payway):* ${formatCurrencyARS(report.cardPayments)}`,
    `• *Pagos con Efectivo:* ${formatCurrencyARS(report.cashPayments)}`,
  ];

  if (report.transferPayments > 0) {
    lines.push(`• *Pagos con Transferencia:* ${formatCurrencyARS(report.transferPayments)}`);
  }
  if (report.otherPayments > 0) {
    lines.push(`• *Otros Medios:* ${formatCurrencyARS(report.otherPayments)}`);
  }
  if (report.tips > 0) {
    let detail = '';
    if (report.cardTips && report.cashTips && (report.cardTips + report.cashTips === report.tips)) {
      detail = ` (Tarjeta: ${formatCurrencyARS(report.cardTips)} | Efvo: ${formatCurrencyARS(report.cashTips)})`;
    } else if (report.cardTips && report.cardTips === report.tips) {
      detail = ` (Tarjeta: ${formatCurrencyARS(report.cardTips)})`;
    } else if (report.cashTips && report.cashTips === report.tips) {
      detail = ` (Efectivo: ${formatCurrencyARS(report.cashTips)})`;
    }
    lines.push(`• *Propinas:* ${formatCurrencyARS(report.tips)}${detail}`);
  }

  lines.push('');
  lines.push('🧾 *EGRESOS:*');

  const totalExpenseAmount = report.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const totalOutflowMovs = report.movements
    .filter((m) => m.type === 'outflow')
    .reduce((acc, m) => acc + m.amount, 0);
  const totalInflowMovs = report.movements
    .filter((m) => m.type === 'inflow')
    .reduce((acc, m) => acc + m.amount, 0);

  const totalEgresos = totalExpenseAmount + totalOutflowMovs - totalInflowMovs;

  const hasEgresos = report.expenses.length > 0 || report.movements.length > 0;
  if (!hasEgresos) {
    lines.push('_Sin egresos registrados en este turno._');
  } else {
    for (const exp of report.expenses) {
      const descNote = exp.description ? ` (${exp.description})` : '';
      lines.push(`• *${exp.providerName}*: ${formatCurrencyARS(exp.amount)}${descNote}`);
    }
    for (const m of report.movements) {
      if (m.type === 'outflow') {
        lines.push(`• *${m.description}*: ${formatCurrencyARS(m.amount)}`);
      } else {
        lines.push(`• *(Ingreso) ${m.description}*: +${formatCurrencyARS(m.amount)}`);
      }
    }
  }
  lines.push(`*Total Egresos:* ${formatCurrencyARS(totalEgresos)}`);

  lines.push('');
  lines.push('📊 *CONTROL DE EFECTIVO:*');
  lines.push(`• Caja Inicial: ${formatCurrencyARS(report.initialCash)}`);
  lines.push(`• (+) Cobros en Efectivo: ${formatCurrencyARS(report.cashPayments)}`);
  lines.push(`• (-) Egresos: ${formatCurrencyARS(totalEgresos)}`);
  lines.push('━━━━━━━━━━━━━━━━━');
  lines.push(`💵 *RESTANTE TOTAL EN EFECTIVO:* ${formatCurrencyARS(report.finalRemainingCash)}`);

  return lines.join('\n');
}

/**
 * Genera el deep link nativo de WhatsApp
 */
export function createWhatsAppDeepLink(phone: string, text: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Despachador HTTP automático para envíos en segundo plano (Cron Jobs)
 */
export async function dispatchAutomatedWhatsApp({
  phone,
  text,
}: {
  phone: string;
  text: string;
}): Promise<{ success: boolean; message: string; details?: unknown }> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const instanceName = process.env.WHATSAPP_INSTANCE_NAME || 'instancia_principal';
  const cleanPhone = cleanPhoneNumber(phone);

  if (!cleanPhone) {
    return { success: false, message: 'Teléfono de destino no especificado o inválido.' };
  }

  if (!apiUrl || apiUrl.includes('tu-instancia-evolution.com')) {
    console.log(`[WhatsApp Dispatcher - Simulado] Despachando a ${cleanPhone}:`);
    console.log(text);
    return {
      success: true,
      message: `Modo Simulación: Mensaje preparado exitosamente para ${cleanPhone} (WHATSAPP_API_URL no configurado).`,
    };
  }

  try {
    const isEvolution = apiUrl.includes('evolution') || !!process.env.WHATSAPP_INSTANCE_NAME;
    const targetEndpoint = isEvolution
      ? `${apiUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`
      : apiUrl;

    const payload = isEvolution
      ? {
          number: cleanPhone,
          text: text,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false,
          },
        }
      : {
          to: cleanPhone,
          body: text,
          message: text,
        };

    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken || ''}`,
        'apikey': apiToken || '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        message: `Error HTTP ${response.status} de API WhatsApp: ${errText}`,
      };
    }

    const resData = await response.json();
    return {
      success: true,
      message: `Mensaje despachado exitosamente a ${cleanPhone}`,
      details: resData,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Fallo al despachar mensaje automático: ${errMsg}`,
    };
  }
}
