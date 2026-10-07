'use client';

import React from 'react';
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, Lock, Sun, Moon } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';
import { useTheme } from '@/context/ThemeContext';

interface HeaderProps {
  lastSyncedAt: string;
  isFallback: boolean;
  error?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSchedule: () => void;
  scheduleEnabled: boolean;
  onLock?: () => void;
  pinRequired?: boolean;
}

export default function Header({
  lastSyncedAt,
  isFallback,
  error,
  isRefreshing,
  onRefresh,
  onOpenSchedule,
  scheduleEnabled,
  onLock,
  pinRequired,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const relativeTime = formatRelativeTime(lastSyncedAt);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-stone-200/80 dark:border-slate-800/80 px-4 py-3 shadow-xs transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & App Title con branding Gastrobumeran */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-bumeran-600 via-bumeran-500 to-amber-500 flex items-center justify-center shadow-md shadow-bumeran-500/25 text-white font-black text-lg tracking-tight select-none">
            GB
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-stone-900 dark:text-white leading-tight">
                Fudo Saldos
              </h1>
              <span className="text-[10px] font-semibold bg-bumeran-50 dark:bg-bumeran-950/60 text-bumeran-700 dark:text-bumeran-300 px-1.5 py-0.5 rounded-full border border-bumeran-200/60 dark:border-bumeran-700/50">
                Gastrobumeran
              </span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-slate-400 font-medium">Auditoría & Notificaciones WhatsApp</p>
          </div>
        </div>

        {/* Action icons: Theme Toggle, Refresh, Schedule Settings, Lock */}
        <div className="flex items-center gap-1.5">
          {/* Selector de Tema Claro / Oscuro */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-750 text-stone-700 dark:text-amber-400 transition active:scale-95 border border-stone-200 dark:border-slate-700/60 shadow-xs"
            aria-label="Alternar tema claro y oscuro"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-bumeran-700" />
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refrescar saldos de Fudo"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-750 text-stone-700 dark:text-slate-300 hover:text-bumeran-600 dark:hover:text-white transition active:scale-95 border border-stone-200 dark:border-slate-700/60 disabled:opacity-50 shadow-xs"
            aria-label="Sincronizar saldos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-bumeran-600 dark:text-emerald-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenSchedule}
            title="Configurar automatización programada"
            className={`p-2 rounded-xl transition active:scale-95 border flex items-center gap-1 shadow-xs ${
              scheduleEnabled
                ? 'bg-bumeran-50 dark:bg-bumeran-500/20 text-bumeran-700 dark:text-bumeran-300 border-bumeran-300 dark:border-bumeran-500/40 hover:bg-bumeran-100'
                : 'bg-stone-100 dark:bg-slate-800/80 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white border-stone-200 dark:border-slate-700/60'
            }`}
            aria-label="Automatización de envíos"
          >
            <Clock className="w-4 h-4" />
            {scheduleEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-bumeran-500 animate-pulse" />
            )}
          </button>

          {pinRequired && onLock && (
            <button
              type="button"
              onClick={onLock}
              title="Bloquear pantalla"
              className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 text-stone-600 dark:text-slate-400 hover:text-bumeran-600 dark:hover:text-amber-400 transition active:scale-95 border border-stone-200 dark:border-slate-700/60 shadow-xs"
              aria-label="Bloquear aplicación"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="max-w-6xl mx-auto mt-2 pt-2 border-t border-stone-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 truncate">
          {isFallback ? (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-400/20 truncate">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Última sincronización: {relativeTime}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-400/20">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Sincronizado ({relativeTime})</span>
            </span>
          )}
        </div>

        {error && (
          <span
            className="text-[11px] text-stone-600 dark:text-slate-400 truncate ml-2 max-w-[200px]"
            title={error}
          >
            {error.includes('Modo Demostración') ? 'Demo / Fallback' : error}
          </span>
        )}
      </div>
    </header>
  );
}
