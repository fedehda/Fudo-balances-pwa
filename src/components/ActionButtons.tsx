'use client';

import React, { useState } from 'react';
import { Send, Copy, Check, Eye } from 'lucide-react';
import { createWhatsAppDeepLink } from '@/lib/whatsapp';

interface ActionButtonsProps {
  fullPhone: string;
  formattedText: string;
  hasSelection: boolean;
  onOpenPreview: () => void;
}

export default function ActionButtons({
  fullPhone,
  formattedText,
  hasSelection,
  onOpenPreview,
}: ActionButtonsProps) {
  const [copied, setCopied] = useState(false);

  const isPhoneValid = fullPhone.length >= 8;
  const canSend = isPhoneValid && hasSelection;

  const handleCopyClipboard = async () => {
    if (!formattedText) return;
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  const handleWhatsAppDirect = () => {
    if (!canSend) return;
    const url = createWhatsAppDeepLink(fullPhone, formattedText);
    // Abrir wa.me en una nueva ventana o aplicación de WhatsApp
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-2.5 pt-1">
      {/* Botón Principal: WhatsApp Directo */}
      <button
        type="button"
        onClick={handleWhatsAppDirect}
        disabled={!canSend}
        className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-500/20"
      >
        <Send className="w-4 h-4 fill-white" />
        <span>Enviar por WhatsApp (App Directa)</span>
      </button>

      {/* Botones secundarios: Copiar portapapeles y Vista Previa */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCopyClipboard}
          disabled={!hasSelection}
          className="py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-white hover:bg-stone-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-200 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-slate-800 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-stone-400 dark:text-slate-400" />
              <span>Copiar portapapeles</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenPreview}
          disabled={!hasSelection}
          className="py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-white hover:bg-stone-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-200 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-slate-800 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5 text-stone-400 dark:text-slate-400" />
          <span>Vista Previa</span>
        </button>
      </div>

      {!isPhoneValid && (
        <p className="text-[11px] text-center text-amber-700 dark:text-amber-400 font-medium">
          ⚠️ Ingresa un número de WhatsApp de destino para habilitar el envío directo.
        </p>
      )}

      {isPhoneValid && !hasSelection && (
        <p className="text-[11px] text-center text-bumeran-700 dark:text-bumeran-400 font-medium">
          💡 Selecciona al menos un proveedor para habilitar el reporte.
        </p>
      )}
    </div>
  );
}
