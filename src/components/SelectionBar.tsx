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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg shadow-black/20">
      {/* Top action row: Buttons */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Proveedores con deuda
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isAllSelected}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none border border-slate-700 active:scale-95"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tildar todos</span>
          </button>

          <button
            type="button"
            onClick={onDeselectAll}
            disabled={isNoneSelected}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none border border-slate-700 active:scale-95"
          >
            <Square className="w-3.5 h-3.5 text-slate-400" />
            <span>Destildar todos</span>
          </button>
        </div>
      </div>

      {/* Dynamic Counter & Subtotal */}
      <div className="pt-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
            {selectedCount}
          </span>
          <span className="text-xs text-slate-300">
            Seleccionados: <strong className="text-white">{selectedCount}</strong> de {totalCount}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 block leading-tight">Subtotal seleccionado</span>
          <span className="text-base font-bold text-emerald-400 tracking-tight">
            {formatCurrencyARS(selectedDebt)}
          </span>
        </div>
      </div>
    </div>
  );
}
