// src/components/DailyMovementsReport.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DailyMovementsResponse } from '@/types/fudo';
import { formatCurrencyARS } from '@/lib/formatters';
import {
  buildDailyMovementsWhatsAppMessage,
  createWhatsAppDeepLink,
} from '@/lib/whatsapp';
import {
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  TrendingUp,
  Share2,
  Copy,
  Check,
  RotateCw,
  Loader2,
  Eye,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import MessagePreviewModal from './MessagePreviewModal';

interface DailyMovementsReportProps {
  countryCode: string;
  phoneDigits: string;
}

export default function DailyMovementsReport({
  countryCode,
  phoneDigits,
}: DailyMovementsReportProps) {
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

  const [selectedDate, setSelectedDate] = useState<string>(todayInSalta);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('all'); // 'all' o ID
  const [filterOnlyTransfers, setFilterOnlyTransfers] = useState<boolean>(true);

  const [data, setData] = useState<DailyMovementsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Cargar movimientos
  const fetchMovements = useCallback(async (date: string, method?: string) => {
    try {
      setError(null);
      const url = new URL('/api/fudo/daily-movements', window.location.origin);
      url.searchParams.set('date', date);
      if (method && method !== 'all') {
        url.searchParams.set('method', method);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: DailyMovementsResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
      setError('No se pudieron obtener los movimientos diarios.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Carga reactiva cuando cambia la fecha
  useEffect(() => {
    setIsLoading(true);
    fetchMovements(selectedDate);
  }, [selectedDate, fetchMovements]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMovements(selectedDate);
  };

  // Filtrado reactivo en cliente si se activa "Solo Transferencias"
  const transferMethodId = useMemo(() => {
    if (!data?.availablePaymentMethods) return undefined;
    const match = data.availablePaymentMethods.find(
      (m) => m.name.toLowerCase().includes('transfer') || m.id === '4'
    );
    return match?.id || '4';
  }, [data?.availablePaymentMethods]);

  const displayedPayments = useMemo(() => {
    if (!data?.payments) return [];
    if (filterOnlyTransfers) {
      return data.payments.filter(
        (p) =>
          p.paymentMethodName?.toLowerCase().includes('transfer') ||
          p.paymentMethodId === transferMethodId
      );
    }
    if (selectedMethodId !== 'all') {
      return data.payments.filter((p) => p.paymentMethodId === selectedMethodId);
    }
    return data.payments;
  }, [data?.payments, filterOnlyTransfers, selectedMethodId, transferMethodId]);

  const displayedExpenses = useMemo(() => {
    return data?.newExpenses || [];
  }, [data?.newExpenses]);

  const totalPayments = useMemo(() => {
    return displayedPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [displayedPayments]);

  const totalNewExpenses = useMemo(() => {
    return displayedExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [displayedExpenses]);

  const netChange = totalNewExpenses - totalPayments;

  // Nombre del filtro para el reporte de WhatsApp
  const filterDisplayName = useMemo(() => {
    if (filterOnlyTransfers) return 'Solo Transferencias';
    if (selectedMethodId === 'all') return 'Todos los medios';
    const match = data?.availablePaymentMethods.find((m) => m.id === selectedMethodId);
    return match?.name || 'Todos los medios';
  }, [filterOnlyTransfers, selectedMethodId, data?.availablePaymentMethods]);

  // Mensaje para WhatsApp
  const formattedWhatsAppText = useMemo(() => {
    return buildDailyMovementsWhatsAppMessage({
      date: selectedDate,
      payments: displayedPayments,
      newExpenses: displayedExpenses,
      paymentMethodFilterName: filterDisplayName,
      totalPayments,
      totalNewExpenses,
      netChange,
    });
  }, [selectedDate, displayedPayments, displayedExpenses, filterDisplayName, totalPayments, totalNewExpenses, netChange]);

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
      {/* Selector de Fecha & Controles */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-white">Fecha del Reporte</h2>
              <span className="text-[11px] text-slate-400">Movimientos de cuenta corriente</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50"
            title="Refrescar movimientos"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Botones rápidos de fecha + Date Input */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedDate(todayInSalta)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 border ${
              selectedDate === todayInSalta
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayInSalta)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 border ${
              selectedDate === yesterdayInSalta
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            Ayer
          </button>

          <div className="flex-1 min-w-[140px]">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Filtro por Medio de Pago */}
        <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Filtro de Medio de Pago para Pagos:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFilterOnlyTransfers(true);
                setSelectedMethodId('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition select-none active:scale-95 flex items-center gap-1.5 ${
                filterOnlyTransfers
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Solo Transferencias</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterOnlyTransfers(false);
                setSelectedMethodId('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition select-none active:scale-95 ${
                !filterOnlyTransfers && selectedMethodId === 'all'
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              Todos los medios
            </button>

            {data?.availablePaymentMethods?.map((m) => {
              const isSelected = !filterOnlyTransfers && selectedMethodId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setFilterOnlyTransfers(false);
                    setSelectedMethodId(m.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition select-none active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 font-semibold'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {m.name} ({m.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Estados de Carga y Error */}
      {isLoading ? (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Consultando movimientos del día...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Tarjetas Métricas KPI */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Total Pagado */}
            <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-emerald-400">Pagos Realizados</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-white tracking-tight">
                {formatCurrencyARS(totalPayments)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {displayedPayments.length} pago(s) {filterOnlyTransfers ? '(transf.)' : ''}
              </span>
            </div>

            {/* Nuevos Gastos en Cta Cte */}
            <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium text-rose-400">Nuevos Gastos Cta Cte</span>
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-base font-bold text-white tracking-tight">
                {formatCurrencyARS(totalNewExpenses)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {displayedExpenses.length} compra(s) a crédito
              </span>
            </div>
          </div>

          {/* Variación Neta del Día */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  netChange < 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : netChange > 0
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {netChange < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : netChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Variación Neta de Deuda
                </span>
                <span className="text-[11px] text-slate-400">
                  {netChange < 0
                    ? 'Disminución de deuda acumulada'
                    : netChange > 0
                    ? 'Aumento de deuda acumulada'
                    : 'Sin variación neta'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`text-sm font-bold block ${
                  netChange < 0
                    ? 'text-emerald-400'
                    : netChange > 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {netChange < 0 ? '-' : netChange > 0 ? '+' : ''}
                {formatCurrencyARS(Math.abs(netChange))}
              </span>
            </div>
          </div>

          {/* Desglose: Transferencias / Pagos Realizados */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Pagos Realizados ({displayedPayments.length})</span>
              </div>
              <span className="text-xs font-bold text-white">
                {formatCurrencyARS(totalPayments)}
              </span>
            </div>

            <div className="p-2 space-y-1.5 max-h-60 overflow-y-auto">
              {displayedPayments.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No hay pagos registrados para esta fecha y filtro.
                </div>
              ) : (
                displayedPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800/60 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-100 truncate">
                          {p.providerName}
                        </span>
                        <span className="text-[10px] bg-slate-700/60 text-emerald-300 px-1.5 py-0.2 rounded border border-slate-600/40 shrink-0">
                          {p.paymentMethodName || 'Transferencia'}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {p.timeFormatted} hs
                      </span>
                    </div>

                    <span className="font-bold text-emerald-400 shrink-0">
                      +{formatCurrencyARS(p.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desglose: Nuevos Gastos en Cta Cte */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Nuevos Gastos en Cta. Cte. ({displayedExpenses.length})</span>
              </div>
              <span className="text-xs font-bold text-white">
                {formatCurrencyARS(totalNewExpenses)}
              </span>
            </div>

            <div className="p-2 space-y-1.5 max-h-60 overflow-y-auto">
              {displayedExpenses.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No hay nuevos gastos en cuenta corriente para esta fecha.
                </div>
              ) : (
                displayedExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800/60 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-100 truncate">
                          {e.providerName}
                        </span>
                        {e.expenseId && (
                          <span className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.2 rounded border border-slate-600/40 shrink-0">
                            Gasto #{e.expenseId}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {e.timeFormatted} hs
                      </span>
                    </div>

                    <span className="font-bold text-rose-400 shrink-0">
                      -{formatCurrencyARS(e.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Acciones de WhatsApp del Reporte Diario */}
          <div className="space-y-2 pt-1">
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition select-none"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>Enviar Reporte Diario por WhatsApp</span>
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
                    <span>Copiar Reporte</span>
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
      )}

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
