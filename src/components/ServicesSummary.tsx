// src/components/ServicesSummary.tsx
'use client';

import React, { useState } from 'react';
import { RecurringService } from '@/types/fudo';
import { formatCurrencyARS, formatShortDate } from '@/lib/formatters';
import { Zap, ChevronDown, ChevronUp, Check, CalendarDays, Info } from 'lucide-react';

interface ServicesSummaryProps {
  services: RecurringService[];
  selectedServiceIds: Set<string>;
  onToggleService: (id: string) => void;
  onSelectAllServices: () => void;
  onDeselectAllServices: () => void;
  includeInMessage: boolean;
  onToggleInclude: (include: boolean) => void;
}

export default function ServicesSummary({
  services,
  selectedServiceIds,
  onToggleService,
  onSelectAllServices,
  onDeselectAllServices,
  includeInMessage,
  onToggleInclude,
}: ServicesSummaryProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (services.length === 0) return null;

  const selectedServices = services.filter((s) => selectedServiceIds.has(s.id));
  const totalEstimatedAmount = selectedServices.reduce((acc, s) => acc + (s.actualAmount || s.approxAmount), 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-all">
      {/* Header colapsable */}
      <div className="p-3.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                Servicios & Impuestos ({selectedServices.length} de {services.length})
              </span>
            </div>
            <span className="text-[11px] text-stone-500 dark:text-slate-400 block truncate">
              Vencimientos aprox: {formatCurrencyARS(totalEstimatedAmount)}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Toggle para incluir en el reporte */}
          <label className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-slate-300 cursor-pointer select-none bg-stone-100 hover:bg-stone-200/70 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700/60 transition">
            <input
              type="checkbox"
              checked={includeInMessage}
              onChange={(e) => onToggleInclude(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                includeInMessage
                  ? 'bg-amber-500 border-amber-500 text-white dark:text-slate-950 font-bold'
                  : 'border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-700'
              }`}
            >
              {includeInMessage && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            <span className="text-[11px] font-medium">En reporte</span>
          </label>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white transition"
            aria-label={isOpen ? 'Colapsar servicios' : 'Expandir servicios'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenido expandido */}
      {isOpen && (
        <div className="border-t border-stone-200/70 dark:border-slate-800/70 p-3.5 space-y-3">
          {/* Barra de acciones de selección y nota informativa */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-stone-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400/80" />
              <span>Vencimientos y montos estimados recurrentes</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onSelectAllServices}
                className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 active:scale-95"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={onDeselectAllServices}
                className="text-[11px] text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-300 font-medium px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 active:scale-95"
              >
                Ninguno
              </button>
            </div>
          </div>

          {/* Lista de Servicios Recurrentes */}
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {services.map((service) => {
              const isSelected = selectedServiceIds.has(service.id);
              const amount = service.actualAmount || service.approxAmount;
              const dueText = service.actualDueDate
                ? formatShortDate(service.actualDueDate)
                : `Día aprox. ${service.typicalDueDay}`;

              return (
                <div
                  key={service.id}
                  onClick={() => onToggleService(service.id)}
                  className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                    isSelected
                      ? 'bg-amber-50/50 dark:bg-slate-800/80 border-amber-300/80 dark:border-slate-700 shadow-2xs'
                      : 'bg-stone-50/50 dark:bg-slate-950/40 border-stone-200/60 dark:border-slate-800/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 transition ${
                        isSelected
                          ? 'bg-amber-500 border-amber-500 text-white dark:text-slate-950'
                          : 'border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* Detalle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-stone-900 dark:text-slate-100 truncate">
                          {service.name}
                        </span>
                        <span className="text-[10px] bg-amber-100/70 dark:bg-slate-700/60 text-amber-800 dark:text-amber-200/90 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-slate-600/40 shrink-0 font-medium">
                          {service.categoryName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300/80 font-medium">
                          <CalendarDays className="w-3 h-3" />
                          {dueText}
                        </span>
                        {service.notes && (
                          <span className="text-stone-400 dark:text-slate-500 truncate hidden sm:inline">
                            • {service.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Monto y Estado */}
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-stone-900 dark:text-slate-100 block tracking-tight">
                      {formatCurrencyARS(amount)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold inline-block mt-0.5 ${
                        service.status === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                          : service.status === 'pending'
                          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-400 border border-stone-200 dark:border-slate-700/60'
                      }`}
                    >
                      {service.status === 'paid'
                        ? 'Pagado'
                        : service.status === 'pending'
                        ? 'Facturado'
                        : 'Aprox.'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
