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
    <div className="space-y-2 pt-2">
      {/* Botón Principal: WhatsApp Directo */}
      <button
        type="button"
        onClick={handleWhatsAppDirect}
        disabled={!canSend}
        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/20"
      >
        <Send className="w-4 h-4 fill-slate-950" />
        <span>Enviar por WhatsApp (App Directa)</span>
      </button>

      {/* Botones secundarios: Copiar portapapeles y Vista Previa */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCopyClipboard}
          disabled={!hasSelection}
          className="py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copiar al portapapeles</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenPreview}
          disabled={!hasSelection}
          className="py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Vista Previa</span>
        </button>
      </div>

      {!isPhoneValid && (
        <p className="text-[11px] text-center text-amber-400/90">
          ⚠️ Ingresa un número de WhatsApp de destino para habilitar el envío directo.
        </p>
      )}

      {isPhoneValid && !hasSelection && (
        <p className="text-[11px] text-center text-amber-400/90">
          💡 Selecciona al menos un proveedor para habilitar el reporte.
        </p>
      )}
    </div>
  );
}
