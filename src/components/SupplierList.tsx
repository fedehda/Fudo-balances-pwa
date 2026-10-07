'use client';

import React, { useState, useMemo } from 'react';
import { SupplierBalance, UpcomingExpense } from '@/types/fudo';
import { formatCurrencyARS, formatShortDate } from '@/lib/formatters';
import { Search, Check, AlertCircle } from 'lucide-react';

interface SupplierListProps {
  suppliers: SupplierBalance[];
  selectedSupplierIds: Set<string>;
  upcomingExpenses: UpcomingExpense[];
  onToggleSupplier: (id: string) => void;
}

export default function SupplierList({
  suppliers,
  selectedSupplierIds,
  upcomingExpenses,
  onToggleSupplier,
}: SupplierListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Mapeo de próximos vencimientos por ID de proveedor
  const expensesBySupplier = useMemo(() => {
    const map = new Map<string, UpcomingExpense>();
    for (const exp of upcomingExpenses) {
      if (exp.supplierId && !map.has(exp.supplierId)) {
        map.set(exp.supplierId, exp);
      }
    }
    return map;
  }, [upcomingExpenses]);

  // Filtrado por buscador
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const term = searchTerm.toLowerCase();
    return suppliers.filter((s) => s.name.toLowerCase().includes(term));
  }, [suppliers, searchTerm]);

  return (
    <div className="space-y-2.5">
      {/* Buscador de proveedores */}
      {suppliers.length > 4 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-bumeran-500/60 focus:border-bumeran-500/60 shadow-2xs transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white text-xs"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Lista de tarjetas interactivas */}
      {filteredSuppliers.length === 0 ? (
        <div className="p-6 text-center bg-white dark:bg-slate-900/50 border border-stone-200/80 dark:border-slate-800 rounded-2xl text-stone-500 dark:text-slate-400 text-xs">
          {searchTerm ? 'No se encontraron proveedores que coincidan con la búsqueda.' : 'No hay proveedores con saldo pendiente en Fudo.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSuppliers.map((supplier) => {
            const isSelected = selectedSupplierIds.has(supplier.id);
            const nearestExpense = expensesBySupplier.get(supplier.id);

            return (
              <div
                key={supplier.id}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                aria-label={`Seleccionar ${supplier.name}, saldo ${formatCurrencyARS(supplier.balance)}`}
                onClick={() => onToggleSupplier(supplier.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onToggleSupplier(supplier.id);
                  }
                }}
                className={`group relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-bumeran-500/50 ${
                  isSelected
                    ? 'bg-bumeran-50/60 dark:bg-slate-900 border-bumeran-500/40 dark:border-bumeran-500/40 shadow-xs shadow-bumeran-500/5 ring-1 ring-bumeran-500/20'
                    : 'bg-white hover:bg-stone-50/80 dark:bg-slate-900/70 dark:hover:bg-slate-900 border-stone-200/80 dark:border-slate-800/80 opacity-90 hover:opacity-100 shadow-2xs'
                }`}
              >
                {/* Custom Checkbox Touch Target */}
                <div className="pt-0.5">
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-bumeran-600 dark:bg-bumeran-500 border-bumeran-600 dark:border-bumeran-400 text-white shadow-2xs'
                        : 'border-stone-300 dark:border-slate-600 group-hover:border-bumeran-400 bg-stone-50 dark:bg-slate-800/50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Supplier Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-stone-950 dark:text-white' : 'text-stone-700 dark:text-slate-300'}`}>
                      {supplier.name}
                    </p>
                    <span
                      className={`text-sm font-extrabold shrink-0 tracking-tight ${
                        isSelected ? 'text-bumeran-600 dark:text-bumeran-400' : 'text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      {formatCurrencyARS(supplier.balance)}
                    </span>
                  </div>

                  {/* Upcoming Expense Indicator Pill if available */}
                  {nearestExpense && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-400/10 px-2 py-0.5 rounded-md w-fit border border-amber-200 dark:border-amber-400/20">
                      <AlertCircle className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Vence {formatShortDate(nearestExpense.dueDate)}: {formatCurrencyARS(nearestExpense.amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
