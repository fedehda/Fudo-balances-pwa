// src/components/CashCountReportView.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CashCountReport, CashMovementItem } from '@/types/fudo';
import { formatCurrencyARS } from '@/lib/formatters';
import {
  buildCashCountWhatsAppMessage,
  createWhatsAppDeepLink,
} from '@/lib/whatsapp';
import {
  RotateCw,
  Loader2,
  DollarSign,
  CreditCard,
  Banknote,
  Receipt,
  ArrowDownRight,
  Share2,
  Copy,
  Check,
  Eye,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import MessagePreviewModal from './MessagePreviewModal';

interface CashCountReportViewProps {
  countryCode: string;
  phoneDigits: string;
}

export default function CashCountReportView({
  countryCode,
  phoneDigits,
}: CashCountReportViewProps) {
  // Fecha por defecto en Salta (GMT-3)
  const todayInSalta = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Salta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }, []);

  const yesterdayInSalta = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Salta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  }, []);

  // Hora actual en Salta (GMT-3)
  const currentHourInSalta = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Salta',
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  }, []);

  // Si son las primeras horas de la madrugada (antes de las 08:00 AM), el arqueo típico a consultar es el de Ayer
  const defaultDate = useMemo(() => {
    return currentHourInSalta < 8 ? yesterdayInSalta : todayInSalta;
  }, [currentHourInSalta, yesterdayInSalta, todayInSalta]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedShift, setSelectedShift] = useState<'auto' | 'dinner' | 'lunch' | 'full'>('auto');
  const [initialCashInput, setInitialCashInput] = useState<number>(50000);
  const [cardPaymentsInput, setCardPaymentsInput] = useState<number | null>(null);
  const [cashPaymentsInput, setCashPaymentsInput] = useState<number | null>(null);
  const [tipsInput, setTipsInput] = useState<number | null>(null);

  const [report, setReport] = useState<CashCountReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Movimientos manuales locales agregados por el usuario
  const [manualMovements, setManualMovements] = useState<CashMovementItem[]>([]);
  const [showAddMovement, setShowAddMovement] = useState<boolean>(false);
  const [newMovDesc, setNewMovDesc] = useState<string>('');
  const [newMovAmt, setNewMovAmt] = useState<string>('');
  const [newMovType, setNewMovType] = useState<'outflow' | 'inflow'>('outflow');

  const [copied, setCopied] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Carga de reporte desde API
  const fetchReport = useCallback(
    async (date: string, shift: 'auto' | 'dinner' | 'lunch' | 'full', initialCash?: number) => {
      try {
        setError(null);
        const url = new URL('/api/fudo/cash-count', window.location.origin);
        url.searchParams.set('date', date);
        url.searchParams.set('shift', shift);
        if (initialCash !== undefined) {
          url.searchParams.set('initialCash', String(initialCash));
        }

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json: CashCountReport = await res.json();
        setReport(json);
        if (json.initialCash !== undefined) {
          setInitialCashInput(json.initialCash);
        }
        setCardPaymentsInput(json.cardPayments);
        setCashPaymentsInput(json.cashPayments);
        setTipsInput(json.tips ?? 0);
      } catch (err) {
        console.error('Error cargando arqueo:', err);
        setError('No se pudo obtener el arqueo de caja.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    setIsLoading(true);
    fetchReport(selectedDate, selectedShift);
  }, [selectedDate, selectedShift, fetchReport]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReport(selectedDate, selectedShift, initialCashInput);
  };

  // Agregar movimiento manual
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newMovAmt);
    if (isNaN(amt) || amt <= 0 || !newMovDesc.trim()) return;

    const newMov: CashMovementItem = {
      id: `manual-${Date.now()}`,
      type: newMovType,
      amount: amt,
      description: newMovDesc.trim(),
      timeFormatted: new Date().toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Salta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };

    setManualMovements((prev) => [...prev, newMov]);
    setNewMovDesc('');
    setNewMovAmt('');
    setShowAddMovement(false);
  };

  const handleRemoveMovement = (id: string) => {
    setManualMovements((prev) => prev.filter((m) => m.id !== id));
  };

  // Cálculo consolidado de movimientos (API + Manuales)
  const combinedMovements = useMemo(() => {
    const fromApi = report?.movements || [];
    return [...fromApi, ...manualMovements];
  }, [report?.movements, manualMovements]);

  const totalMovements = useMemo(() => {
    return combinedMovements.reduce((acc, m) => {
      return acc + (m.type === 'outflow' ? -m.amount : m.amount);
    }, 0);
  }, [combinedMovements]);

  // Valores activos de pagos (prioriza edición del usuario / valores declarados)
  const activeCardPayments = cardPaymentsInput !== null ? cardPaymentsInput : (report?.cardPayments || 0);
  const activeCashPayments = cashPaymentsInput !== null ? cashPaymentsInput : (report?.cashPayments || 0);
  const activeTips = tipsInput !== null ? tipsInput : (report?.tips || 0);

  // Recálculo reactivo de Venta Total
  const activeTotalSales = useMemo(() => {
    if (!report) return 0;
    return Math.round((activeCardPayments + activeCashPayments + report.transferPayments + report.otherPayments) * 100) / 100;
  }, [report, activeCardPayments, activeCashPayments]);

  // Total Egresos consolidado (Gastos de caja + Retiros de caja)
  const totalExpenseAmount = useMemo(() => {
    return report?.expenses.reduce((acc, exp) => acc + exp.amount, 0) || 0;
  }, [report?.expenses]);

  const totalEgresos = useMemo(() => {
    return totalExpenseAmount - totalMovements;
  }, [totalExpenseAmount, totalMovements]);

  // Recálculo del restante total en efectivo reactivo
  const finalRemainingCash = useMemo(() => {
    if (!report) return 0;
    return Math.round((initialCashInput + activeCashPayments - totalEgresos) * 100) / 100;
  }, [report, initialCashInput, activeCashPayments, totalEgresos]);

  // Reporte consolidado actualizado para WhatsApp
  const consolidatedReport: CashCountReport | null = useMemo(() => {
    if (!report) return null;
    return {
      ...report,
      initialCash: initialCashInput,
      cardPayments: activeCardPayments,
      cashPayments: activeCashPayments,
      tips: activeTips,
      totalSales: activeTotalSales,
      movements: combinedMovements,
      totalMovements,
      finalRemainingCash,
    };
  }, [report, initialCashInput, activeCardPayments, activeCashPayments, activeTips, activeTotalSales, combinedMovements, totalMovements, finalRemainingCash]);

  const formattedWhatsAppText = useMemo(() => {
    if (!consolidatedReport) return '';
    return buildCashCountWhatsAppMessage(consolidatedReport);
  }, [consolidatedReport]);

  const fullPhone = `${countryCode}${phoneDigits}`;
  const deepLink = useMemo(() => {
    return createWhatsAppDeepLink(fullPhone, formattedWhatsAppText);
  }, [fullPhone, formattedWhatsAppText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedWhatsAppText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Controles de Selección de Fecha & Turno */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-white">Arqueo de Caja</h2>
              <span className="text-[11px] text-slate-400">Cierre de caja y ventas por turno</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50"
            title="Refrescar arqueo"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Selector de Fecha */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(todayInSalta);
              setSelectedShift('auto');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 border ${
              selectedDate === todayInSalta
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDate(yesterdayInSalta);
              setSelectedShift('auto');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 border ${
              selectedDate === yesterdayInSalta
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            Ayer
          </button>

          <div className="flex-1 min-w-[140px]">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setSelectedShift('auto');
                }
              }}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1 text-base sm:text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Selector de Turno */}
        <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 block">Turno:</span>
              {selectedShift === 'auto' && (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>Auto: {report?.shiftName || 'Detectando...'}</span>
                </span>
              )}
            </div>
            {report && report.isClosed !== undefined && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                report.isClosed === false
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${report.isClosed === false ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {report.isClosed === false ? 'Turno en curso (Fudo)' : 'Turno cerrado'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedShift('auto')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition active:scale-95 flex items-center justify-center gap-1 ${
                selectedShift === 'auto'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="Detectar automáticamente según Fudo y hora actual"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Auto</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedShift('lunch')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition active:scale-95 flex items-center justify-center gap-1 ${
                selectedShift === 'lunch' || (selectedShift === 'auto' && report?.shiftType === 'lunch')
                  ? selectedShift === 'lunch'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold'
                    : 'bg-slate-800/90 text-amber-200 border-amber-500/30 font-medium'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <span>Almuerzo</span>
              {report?.shiftType === 'lunch' && report?.isClosed === false && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedShift('dinner')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition active:scale-95 flex items-center justify-center gap-1 ${
                selectedShift === 'dinner' || (selectedShift === 'auto' && report?.shiftType === 'dinner')
                  ? selectedShift === 'dinner'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold'
                    : 'bg-slate-800/90 text-amber-200 border-amber-500/30 font-medium'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <span>Cena</span>
              {report?.shiftType === 'dinner' && report?.isClosed === false && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedShift('full')}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition active:scale-95 ${
                selectedShift === 'full'
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <span>Día Completo</span>
            </button>
          </div>
        </div>

        {/* Ajuste de Montos Finales / Declarados por el Usuario */}
        <div className="pt-2.5 border-t border-slate-800/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Montos del Usuario (Valores Finales)</span>
            </div>
            {report?.userCardPayments !== undefined && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                Conteo Fudo Oficial
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Caja Inicial */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-emerald-400" />
                  <span>Caja Inicial:</span>
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  value={initialCashInput || ''}
                  onChange={(e) => setInitialCashInput(Number(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded pl-5 pr-2 py-0.5 text-base sm:text-xs text-right text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="50000"
                />
              </div>
            </div>

            {/* 2. Tarjeta / Payway */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-purple-300 font-medium flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-purple-400" />
                  <span>Tarjeta:</span>
                </label>
                {report?.systemCardPayments !== undefined && report.systemCardPayments !== activeCardPayments && (
                  <span className="text-[9px] text-slate-400 line-through font-mono" title="Monto registrado por el sistema">
                    {formatCurrencyARS(report.systemCardPayments)}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  value={cardPaymentsInput !== null ? cardPaymentsInput : ''}
                  onChange={(e) => setCardPaymentsInput(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded pl-5 pr-2 py-0.5 text-base sm:text-xs text-right text-purple-300 font-bold focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="0"
                />
              </div>
            </div>

            {/* 3. Efectivo Ventas */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-emerald-400" />
                  <span>Efectivo:</span>
                </label>
                {report?.systemCashPayments !== undefined && report.systemCashPayments !== activeCashPayments && (
                  <span className="text-[9px] text-slate-400 line-through font-mono" title="Monto registrado por el sistema">
                    {formatCurrencyARS(report.systemCashPayments)}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  value={cashPaymentsInput !== null ? cashPaymentsInput : ''}
                  onChange={(e) => setCashPaymentsInput(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded pl-5 pr-2 py-0.5 text-base sm:text-xs text-right text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="0"
                />
              </div>
            </div>

            {/* 4. Propinas */}
            <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-amber-300 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Propinas:</span>
                </label>
                {report?.cardTips !== undefined && (report.cardTips > 0 || (report.cashTips || 0) > 0) && (
                  <span className="text-[9px] text-slate-400 font-mono" title="Desglose Fudo">
                    {report.cardTips ? `T:${formatCurrencyARS(report.cardTips)}` : ''}{report.cashTips ? ` E:${formatCurrencyARS(report.cashTips)}` : ''}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  value={tipsInput !== null ? tipsInput : ''}
                  onChange={(e) => setTipsInput(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded pl-5 pr-2 py-0.5 text-base sm:text-xs text-right text-amber-300 font-bold focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estados de Carga y Error */}
      {isLoading ? (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Calculando arqueo del turno en Fudo...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : report ? (
        <>
          {/* Tarjetas Métricas KPI */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Venta Total */}
            <div className="bg-slate-900/90 border border-blue-500/20 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-blue-400">Venta Total</span>
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-base font-bold text-white tracking-tight">
                {formatCurrencyARS(activeTotalSales)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Total cobrado en el turno
              </span>
            </div>

            {/* Pagos con Tarjeta (Payway) */}
            <div className="bg-slate-900/90 border border-purple-500/20 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-purple-400">Pagos con Tarjeta</span>
                <CreditCard className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-base font-bold text-white tracking-tight">
                {formatCurrencyARS(activeCardPayments)}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-slate-400">
                  Payway / Terminal
                </span>
                {report.systemCardPayments !== undefined && report.systemCardPayments !== activeCardPayments && (
                  <span className="text-[9px] text-amber-400 font-mono">
                    Valor usuario
                  </span>
                )}
              </div>
            </div>

            {/* Pagos con Efectivo */}
            <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-emerald-400">Pagos con Efectivo</span>
                <Banknote className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-white tracking-tight">
                {formatCurrencyARS(activeCashPayments)}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-slate-400">
                  Ventas en efectivo
                </span>
                {report.systemCashPayments !== undefined && report.systemCashPayments !== activeCashPayments && (
                  <span className="text-[9px] text-amber-400 font-mono">
                    Valor usuario
                  </span>
                )}
              </div>
            </div>

            {/* Total Egresos (Gastos + Retiros) */}
            <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-rose-400">Total Egresos</span>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-base font-bold text-white tracking-tight">
                {formatCurrencyARS(totalEgresos)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Gastos + Retiros de caja
              </span>
            </div>

            {/* Propinas */}
            {activeTips > 0 && (
              <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3 shadow-sm col-span-2">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium text-amber-400">Propinas Registradas</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-base font-bold text-white tracking-tight">
                  {formatCurrencyARS(activeTips)}
                </div>
                <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-400">
                  <span>
                    {report.cardTips ? `Tarjeta: ${formatCurrencyARS(report.cardTips)}` : ''}
                    {report.cardTips && report.cashTips ? ' • ' : ''}
                    {report.cashTips ? `Efectivo: ${formatCurrencyARS(report.cashTips)}` : ''}
                  </span>
                  {report.tips !== activeTips && (
                    <span className="text-[9px] text-amber-400 font-mono">
                      Editado manual
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TARJETA DESTACADA: Restante Total en Efectivo */}
          <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border border-emerald-500/40 rounded-xl p-4 shadow-md text-center space-y-1.5">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
              💵 Restante Total en Efectivo en Caja
            </span>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatCurrencyARS(finalRemainingCash)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 flex-wrap font-mono">
              <span>Fondo {formatCurrencyARS(initialCashInput)}</span>
              <span>+</span>
              <span>Efectivo {formatCurrencyARS(activeCashPayments)}</span>
              <span>-</span>
              <span>Egresos {formatCurrencyARS(totalEgresos)}</span>
            </div>
          </div>

          {/* Sección: Gastos de Caja Principal (detallados y en lista) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Egresos: Gastos de Caja ({report.expenses.length})</span>
              </div>
              <span className="text-xs font-bold text-white">
                {formatCurrencyARS(report.totalExpenses)}
              </span>
            </div>

            <div className="p-2 space-y-1.5 max-h-60 overflow-y-auto">
              {report.expenses.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No hay gastos de caja registrados en este turno.
                </div>
              ) : (
                report.expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800/60 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-100 truncate">
                          {exp.providerName}
                        </span>
                        {exp.description && (
                          <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                            ({exp.description})
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {exp.timeFormatted} hs
                      </span>
                    </div>

                    <span className="font-bold text-rose-400 shrink-0">
                      -{formatCurrencyARS(exp.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sección: Movimientos de Caja (detallados y en lista) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Egresos: Movimientos de Caja ({combinedMovements.length})</span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMovement(!showAddMovement)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar</span>
              </button>
            </div>

            {/* Formulario rápido para agregar movimiento manual */}
            {showAddMovement && (
              <form
                onSubmit={handleAddMovement}
                className="p-3 bg-slate-950/60 border-b border-slate-800/80 space-y-2"
              >
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newMovType}
                    onChange={(e) => setNewMovType(e.target.value as 'outflow' | 'inflow')}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="outflow">Retiro (-)</option>
                    <option value="inflow">Ingreso (+)</option>
                  </select>

                  <input
                    type="number"
                    value={newMovAmt}
                    onChange={(e) => setNewMovAmt(e.target.value)}
                    placeholder="Monto"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-base sm:text-xs text-slate-200 focus:outline-none font-mono"
                    required
                  />

                  <input
                    type="text"
                    value={newMovDesc}
                    onChange={(e) => setNewMovDesc(e.target.value)}
                    placeholder="Motivo (ej. Retiro socio)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-base sm:text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddMovement(false)}
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded-md active:scale-95"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
              {combinedMovements.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  Sin movimientos manuales registrados para este turno.
                </div>
              ) : (
                combinedMovements.map((mov) => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800/60 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-100">
                          {mov.description}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            mov.type === 'outflow'
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          {mov.type === 'outflow' ? 'Retiro' : 'Ingreso'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        {mov.timeFormatted} hs
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-bold ${
                          mov.type === 'outflow' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {mov.type === 'outflow' ? '-' : '+'}
                        {formatCurrencyARS(mov.amount)}
                      </span>

                      {mov.id.startsWith('manual-') && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMovement(mov.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          title="Eliminar movimiento manual"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Nota informativa de permisos de Fudo si corresponde */}
          {!report.hasApiPermissions && (
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-2.5 text-slate-400 text-xs">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Los cobros, ventas con tarjeta, efectivo y gastos de caja se sincronizan automáticamente. Si deseas sincronizar el fondo de caja inicial directo desde Fudo, puedes asignar el rol <strong>Admin</strong> o <strong>Auditoría</strong> en Administración &gt; Usuarios en Fudo.
              </span>
            </div>
          )}

          {/* Acciones de WhatsApp del Arqueo */}
          <div className="space-y-2 pt-1">
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition select-none"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>Enviar Arqueo por WhatsApp</span>
            </a>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-800 active:scale-95 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar Arqueo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-800 active:scale-95 transition"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Vista Previa</span>
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Modal de Vista Previa */}
      <MessagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        formattedText={formattedWhatsAppText}
        fullPhone={fullPhone}
      />
    </div>
  );
}
