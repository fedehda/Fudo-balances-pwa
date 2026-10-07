'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';
import { createWhatsAppDeepLink } from '@/lib/whatsapp';

interface MessagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formattedText: string;
  fullPhone: string;
}

export default function MessagePreviewModal({
  isOpen,
  onClose,
  formattedText,
  fullPhone,
}: MessagePreviewModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

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

      if (!isInside) onClose();
    };

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
      return () => dialog.removeEventListener('click', handleBackdropClick);
    }
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!fullPhone) return;
    const url = createWhatsAppDeepLink(fullPhone, formattedText);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      onClose={onClose}
      aria-labelledby="preview-modal-title"
      className="m-auto bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-700/80 rounded-3xl p-0 w-full max-w-md text-stone-800 dark:text-slate-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 id="preview-modal-title" className="text-sm font-bold text-stone-900 dark:text-white">
              Vista Previa WhatsApp
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Chat Bubble Simulation */}
        <div className="my-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl rounded-tl-sm relative shadow-inner">
          <div className="text-xs text-stone-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
            {formattedText}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
            <span>{new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>✓✓</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-750 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-stone-200 dark:border-slate-700 shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!fullPhone || fullPhone.length < 8}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar (wa.me)</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
