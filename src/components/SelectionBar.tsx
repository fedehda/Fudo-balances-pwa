'use client';

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { formatCurrencyARS } from '@/lib/formatters';

interface SelectionBarProps {
  totalCount: number;
  selectedCount: number;
  selectedDebt: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function SelectionBar({
  totalCount,
  selectedCount,
  selectedDebt,
  onSelectAll,
  onDeselectAll,
}: SelectionBarProps) {
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;
  const isNoneSelected = selectedCount === 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm transition-all">
      {/* Top action row: Buttons */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-200/70 dark:border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400">
          Proveedores con deuda
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isAllSelected}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 hover:text-bumeran-600 dark:hover:text-white transition disabled:opacity-40 disabled:pointer-events-none border border-stone-200 dark:border-slate-700 active:scale-95 shadow-2xs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-bumeran-600 dark:text-bumeran-400" />
            <span>Tildar todos</span>
          </button>

          <button
            type="button"
            onClick={onDeselectAll}
            disabled={isNoneSelected}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white transition disabled:opacity-40 disabled:pointer-events-none border border-stone-200 dark:border-slate-700 active:scale-95 shadow-2xs"
          >
            <Square className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500" />
            <span>Destildar todos</span>
          </button>
        </div>
      </div>

      {/* Dynamic Counter & Subtotal */}
      <div className="pt-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-bumeran-100 dark:bg-bumeran-500/20 text-bumeran-700 dark:text-bumeran-300 text-xs font-bold">
            {selectedCount}
          </span>
          <span className="text-xs text-stone-600 dark:text-slate-300">
            Seleccionados: <strong className="text-stone-900 dark:text-white font-semibold">{selectedCount}</strong> de {totalCount}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-stone-500 dark:text-slate-400 block leading-tight">Subtotal seleccionado</span>
          <span className="text-base font-extrabold text-bumeran-600 dark:text-bumeran-400 tracking-tight">
            {formatCurrencyARS(selectedDebt)}
          </span>
        </div>
      </div>
    </div>
  );
}
