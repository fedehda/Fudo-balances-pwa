'use client';

import React, { useState } from 'react';
import { UpcomingExpense, ExpenseCategory } from '@/types/fudo';
import { formatCurrencyARS, formatShortDate } from '@/lib/formatters';
import { ChevronDown, ChevronUp, CalendarClock, Check, Tags } from 'lucide-react';

interface UpcomingExpensesProps {
  expenses: UpcomingExpense[];
  categories: ExpenseCategory[];
  selectedCategoryIds: Set<string>;
  onToggleCategory: (catId: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  includeInMessage: boolean;
  onToggleInclude: (include: boolean) => void;
}

export default function UpcomingExpenses({
  expenses,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  includeInMessage,
  onToggleInclude,
}: UpcomingExpensesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (expenses.length === 0) return null;

  // Filtrar los gastos según las categorías activas
  const filteredExpenses = expenses.filter((e) => {
    const catId = e.categoryId || 'uncategorized';
    return selectedCategoryIds.has(catId);
  });

  const totalFilteredAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-all">
      {/* Header colapsable principal */}
      <div className="p-3.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-xl bg-bumeran-50 dark:bg-bumeran-500/10 border border-bumeran-200 dark:border-bumeran-500/20 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-bumeran-600 dark:text-bumeran-400" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-stone-900 dark:text-white block truncate">
              Gastos & Vencimientos ({filteredExpenses.length} de {expenses.length})
            </span>
            <span className="text-[11px] text-stone-500 dark:text-slate-400 block truncate">
              Monto filtrado: {formatCurrencyARS(totalFilteredAmount)}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Toggle para incluir o no en el mensaje de WhatsApp */}
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
                  ? 'bg-bumeran-600 border-bumeran-600 text-white dark:text-slate-950 font-bold'
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
            aria-label={isOpen ? 'Colapsar gastos' : 'Expandir gastos'}
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenido expandible */}
      {isOpen && (
        <div className="border-t border-stone-200/90 dark:border-slate-800/70 p-3.5 space-y-3 bg-stone-50/50 dark:bg-transparent">
          {/* Sección de Selección / Filtro de Categorías de Fudo */}
          {categories.length > 0 && (
            <div className="bg-white dark:bg-slate-950/60 rounded-xl p-3 border border-stone-200/90 dark:border-slate-800/80 space-y-2 shadow-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-stone-200/70 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-slate-300">
                  <Tags className="w-3.5 h-3.5 text-bumeran-600 dark:text-bumeran-400" />
                  <span>Categorías de Fudo</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onSelectAllCategories}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 active:scale-95 transition"
                  >
                    Tildar todas
                  </button>
                  <button
                    type="button"
                    onClick={onDeselectAllCategories}
                    className="text-[11px] text-stone-600 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-300 font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 active:scale-95 transition"
                  >
                    Destildar todas
                  </button>
                </div>
              </div>

              {/* Chips / Pills tildables por categoría */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {categories.map((cat) => {
                  const isCatSelected = selectedCategoryIds.has(cat.id);

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onToggleCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition border active:scale-95 select-none ${
                        isCatSelected
                          ? 'bg-bumeran-50 dark:bg-bumeran-950/40 text-bumeran-700 dark:text-bumeran-300 border-bumeran-300 dark:border-bumeran-500/40 font-semibold shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                          isCatSelected
                            ? 'bg-bumeran-600 dark:bg-bumeran-500 border-bumeran-600 text-white font-bold'
                            : 'border-stone-300 dark:border-slate-600 bg-stone-100 dark:bg-slate-800'
                        }`}
                      >
                        {isCatSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{cat.name}</span>
                      {cat.count !== undefined && (
                        <span className="text-[10px] opacity-80 bg-stone-100 dark:bg-slate-800 px-1 rounded-full text-stone-600 dark:text-slate-400">
                          {cat.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista limpia de gastos: SOLO PROVEEDOR Y VENCIMIENTO */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {filteredExpenses.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 dark:text-slate-500">
                No hay gastos en las categorías seleccionadas.
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800/50 hover:bg-stone-50 dark:hover:bg-slate-800/80 border border-stone-200/80 dark:border-slate-800 text-xs transition"
                >
                  {/* Proveedor y Categoría */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-stone-900 dark:text-slate-100 truncate">
                        {expense.supplierName}
                      </span>
                      {expense.categoryName && expense.categoryName !== 'Sin categoría' && (
                        <span className="text-[10px] bg-stone-100 dark:bg-slate-700/60 text-stone-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-stone-200 dark:border-slate-600/40 shrink-0 font-medium">
                          {expense.categoryName}
                        </span>
                      )}
                    </div>

                    {/* Vencimiento */}
                    <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                      {expense.dueDate ? (
                        <span className="text-amber-700 dark:text-amber-300/90 font-medium">
                          Vence: {formatShortDate(expense.dueDate)}
                        </span>
                      ) : (
                        <span className="text-stone-400 dark:text-slate-500 italic">Sin fecha de vencimiento</span>
                      )}
                    </div>
                  </div>

                  {/* Monto */}
                  <span className="font-bold text-stone-900 dark:text-slate-100 shrink-0 tracking-tight">
                    {formatCurrencyARS(expense.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
