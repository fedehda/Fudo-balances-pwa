'use client';

import React from 'react';
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';

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
  const relativeTime = formatRelativeTime(lastSyncedAt);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Logo & App Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-lg">
            F
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white leading-tight flex items-center gap-1.5">
              Saldos Fudo
              <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                WhatsApp
              </span>
            </h1>
            <p className="text-xs text-slate-400">Auditoría & Notificaciones PWA</p>
          </div>
        </div>

        {/* Action icons: Refresh & Schedule Settings */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refrescar saldos de Fudo"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition active:scale-95 border border-slate-700/60 disabled:opacity-50"
            aria-label="Sincronizar saldos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenSchedule}
            title="Configurar automatización programada"
            className={`p-2 rounded-lg transition active:scale-95 border flex items-center gap-1 ${
              scheduleEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/60'
            }`}
            aria-label="Automatización de envíos"
          >
            <Clock className="w-4 h-4" />
            {scheduleEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {pinRequired && onLock && (
            <button
              type="button"
              onClick={onLock}
              title="Bloquear pantalla"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-amber-400 transition active:scale-95 border border-slate-700/60"
              aria-label="Bloquear aplicación"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="max-w-md mx-auto mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 truncate">
          {isFallback ? (
            <span className="inline-flex items-center gap-1 text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 truncate">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Última sincronización: {relativeTime}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Sincronizado ({relativeTime})</span>
            </span>
          )}
        </div>

        {error && (
          <span
            className="text-[11px] text-slate-400 truncate ml-2 max-w-[170px]"
            title={error}
          >
            {error.includes('Modo Demostración') ? 'Demo / Fallback' : error}
          </span>
        )}
      </div>
    </header>
  );
}
