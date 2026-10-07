'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ScheduledReportConfig } from '@/types/fudo';
import { Clock, Check, X, PlayCircle, Loader2 } from 'lucide-react';
import { cleanPhoneNumber, formatRelativeTime } from '@/lib/formatters';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ScheduledReportConfig;
  onSaveConfig: (updated: Partial<ScheduledReportConfig>) => Promise<void>;
  selectedCount: number;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  selectedCount,
}: ScheduleModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Estados locales editables
  const [enabled, setEnabled] = useState(config.enabled);
  const [targetTime, setTargetTime] = useState(config.targetTime || '09:00');
  const [targetPhone, setTargetPhone] = useState(config.targetPhone || '');
  const [autoSelectAll, setAutoSelectAll] = useState(config.autoSelectAll);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sincronizar estado local cuando cambia config exterior
  useEffect(() => {
    setEnabled(config.enabled);
    setTargetTime(config.targetTime || '09:00');
    setTargetPhone(config.targetPhone || '');
    setAutoSelectAll(config.autoSelectAll);
  }, [config]);

  // Manejo de apertura / cierre del <dialog> nativo con showModal()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Fallback para light-dismiss según la guía modern-web-guidance
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isInside) {
        onClose();
      }
    };

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
      return () => {
        dialog.removeEventListener('click', handleBackdropClick);
      };
    }
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSaveConfig({
        enabled,
        targetTime,
        targetPhone: cleanPhoneNumber(targetPhone),
        autoSelectAll,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestCronExecution = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/cron/send-report?force=true');
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setTestResult({
          success: true,
          message: data.dispatch?.message || 'Reporte de prueba enviado exitosamente.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.reason || data.error || 'No se pudo completar el envío de prueba.',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error al conectar con el cron handler.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      onClose={onClose}
      aria-labelledby="schedule-modal-title"
      className="m-auto bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-700/80 rounded-3xl p-0 w-full max-w-md text-stone-800 dark:text-slate-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95"
    >
      <div className="p-4 sm:p-5">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-bumeran-50 dark:bg-bumeran-950/60 border border-bumeran-200 dark:border-bumeran-500/30 flex items-center justify-center text-bumeran-600 dark:text-bumeran-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 id="schedule-modal-title" className="text-sm font-bold text-stone-900 dark:text-white">
                Automatización Programada
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">Envíos diarios desatendidos vía WhatsApp</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          {/* Toggle Principal ON / OFF */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-700/60">
            <div>
              <label htmlFor="daily-toggle" className="text-xs font-bold text-stone-900 dark:text-white block cursor-pointer">
                Envío diario automático
              </label>
              <span className="text-[11px] text-stone-500 dark:text-slate-400">
                {enabled ? 'La regla despachará todos los días a la hora fijada' : 'Automatización actualmente inactiva'}
              </span>
            </div>

            <button
              id="daily-toggle"
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? 'bg-bumeran-500' : 'bg-stone-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Hora de envío (Selector time nativo) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center justify-between">
              <span>Hora de envío (Zona Salta / Argentina)</span>
              <span className="text-[10px] text-stone-500 dark:text-slate-400">Formato 24 hs</span>
            </label>
            <input
              type="time"
              required
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-bumeran-500 shadow-xs"
            />
          </div>

          {/* Teléfono Destinatario */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 block">
              Teléfono de destino para la automatización
            </label>
            <input
              type="tel"
              required
              placeholder="Ej: 5493871234567"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-bumeran-500 shadow-xs"
            />
            <p className="text-[10px] text-stone-500 dark:text-slate-400">
              Formato internacional E.164 sin signos + ni espacios (ej: 5493874123456).
            </p>
          </div>

          {/* Criterio de Selección */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-stone-700 dark:text-slate-300 block">Criterio de consolidado</span>
            <div className="space-y-2">
              <label
                onClick={() => setAutoSelectAll(true)}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs cursor-pointer transition ${
                  autoSelectAll
                    ? 'bg-bumeran-50 dark:bg-bumeran-950/40 border-bumeran-300 dark:border-bumeran-500/40 text-bumeran-800 dark:text-bumeran-200'
                    : 'bg-stone-50/80 dark:bg-slate-800/50 border-stone-200 dark:border-slate-700/60 text-stone-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="criteria"
                  checked={autoSelectAll}
                  onChange={() => setAutoSelectAll(true)}
                  className="mt-0.5 accent-bumeran-600"
                />
                <div>
                  <span className="font-bold block text-stone-900 dark:text-white">Incluir siempre todos los que tengan deuda</span>
                  <span className="text-[10px] text-stone-500 dark:text-slate-400">
                    Toma automáticamente cualquier proveedor con balance &gt; 0 al momento del disparo.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setAutoSelectAll(false)}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs cursor-pointer transition ${
                  !autoSelectAll
                    ? 'bg-bumeran-50 dark:bg-bumeran-950/40 border-bumeran-300 dark:border-bumeran-500/40 text-bumeran-800 dark:text-bumeran-200'
                    : 'bg-stone-50/80 dark:bg-slate-800/50 border-stone-200 dark:border-slate-700/60 text-stone-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="criteria"
                  checked={!autoSelectAll}
                  onChange={() => setAutoSelectAll(false)}
                  className="mt-0.5 accent-bumeran-600"
                />
                <div>
                  <span className="font-bold block text-stone-900 dark:text-white">Enviar solo los proveedores seleccionados abajo</span>
                  <span className="text-[10px] text-stone-500 dark:text-slate-400">
                    Mantendrá fija la lista de proveedores marcados ({selectedCount} actualmente).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Estado de última ejecución */}
          {config.lastRunAt && (
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-700/40 text-[11px] text-stone-600 dark:text-slate-300 flex items-center justify-between">
              <span>Última ejecución:</span>
              <span className="font-semibold text-stone-800 dark:text-slate-200">
                {formatRelativeTime(config.lastRunAt)} ({config.lastRunStatus || 'OK'})
              </span>
            </div>
          )}

          {/* Resultado de prueba si hubo */}
          {testResult && (
            <div
              className={`p-2.5 rounded-xl text-xs border ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-red-500/10 border-rose-200 dark:border-red-500/30 text-rose-700 dark:text-red-300'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-bumeran-500 hover:bg-bumeran-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-bumeran-500/20 disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Configuración Guardada!</span>
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar y Guardar Regla</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestCronExecution}
              disabled={isTesting}
              className="w-full py-2 px-3 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-750 text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlayCircle className="w-3.5 h-3.5 text-bumeran-600 dark:text-amber-400" />
              )}
              <span>Probar disparo de envío ahora</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
