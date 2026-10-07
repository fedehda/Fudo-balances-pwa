'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Delete, ShieldCheck, AlertCircle } from 'lucide-react';

interface PinLockScreenProps {
  onUnlock: () => void;
}

export default function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Contador regresivo para bloqueo temporal tras intentos fallidos excesivos
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const verifyPin = useCallback(async (currentPin: string) => {
    if (lockoutSeconds > 0) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
      });

      if (res.ok) {
        setFailedAttempts(0);
        onUnlock();
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 500);

        if (nextAttempts >= 5) {
          setLockoutSeconds(30);
          setError('Demasiados intentos fallidos. Bloqueado temporalmente por 30s.');
        } else {
          setError(`PIN incorrecto. Intento ${nextAttempts} de 5.`);
        }
      }
    } catch {
      setError('Error al verificar el PIN.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [failedAttempts, lockoutSeconds, onUnlock]);

  const handleDigit = useCallback((digit: string) => {
    if (lockoutSeconds > 0 || isVerifying) return;
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const nextPin = prev + digit;
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
      return nextPin;
    });
  }, [isVerifying, lockoutSeconds, verifyPin]);

  const handleDelete = useCallback(() => {
    if (isVerifying || lockoutSeconds > 0) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [isVerifying, lockoutSeconds]);

  // Soporte para teclado físico (teclas 0-9 y Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutSeconds > 0) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, lockoutSeconds]);

  const isKeypadDisabled = isVerifying || lockoutSeconds > 0;

  return (
    <div className="fixed inset-0 z-50 bg-stone-100/90 dark:bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 selection:bg-none transition-colors">
      <div className="w-full max-w-xs flex flex-col items-center bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-stone-200/90 dark:border-slate-800 shadow-xl shadow-bumeran-950/5">
        {/* Logo / Candado */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-bumeran-600 to-bumeran-500 flex items-center justify-center shadow-lg shadow-bumeran-500/25 mb-4 text-white">
          <Lock className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">Acceso Seguro</h1>
        <p className="text-xs text-stone-500 dark:text-slate-400 text-center mt-1 mb-6">
          Ingresa tu PIN de 4 dígitos para ver los saldos de Fudo
        </p>

        {/* Círculos indicadores del PIN con accesibilidad y animación shake si hay error */}
        <div
          role="status"
          aria-live="polite"
          aria-label={`${pin.length} de 4 dígitos ingresados`}
          className={`flex items-center justify-center gap-4 mb-6 transition-transform ${
            isShaking ? 'animate-bounce text-red-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  isFilled
                    ? 'bg-bumeran-600 border-bumeran-600 scale-110 shadow-sm shadow-bumeran-500/50'
                    : 'border-stone-300 dark:border-slate-700 bg-stone-100 dark:bg-slate-900'
                }`}
              />
            );
          })}
        </div>

        {/* Mensaje de error o bloqueo */}
        {lockoutSeconds > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 mb-4 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Demasiados intentos. Reintentar en {lockoutSeconds}s.</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-red-400 mb-4 bg-rose-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="h-9 mb-2" />
        )}

        {/* Teclado numérico táctil */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isKeypadDisabled}
              className="h-14 rounded-2xl bg-stone-50 dark:bg-slate-800/80 hover:bg-stone-100 dark:hover:bg-slate-700/80 active:bg-bumeran-50 dark:active:bg-slate-700 text-stone-900 dark:text-white font-semibold text-xl border border-stone-200 dark:border-slate-700/70 transition active:scale-95 flex items-center justify-center shadow-xs disabled:opacity-40"
            >
              {digit}
            </button>
          ))}

          {/* Fila inferior: Vacío / 0 / Borrar */}
          <div className="flex items-center justify-center text-stone-400 dark:text-slate-600 text-xs font-mono">
            <ShieldCheck className="w-5 h-5 text-stone-400 dark:text-slate-600" />
          </div>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isKeypadDisabled}
            className="h-14 rounded-2xl bg-stone-50 dark:bg-slate-800/80 hover:bg-stone-100 dark:hover:bg-slate-700/80 active:bg-bumeran-50 dark:active:bg-slate-700 text-stone-900 dark:text-white font-semibold text-xl border border-stone-200 dark:border-slate-700/70 transition active:scale-95 flex items-center justify-center shadow-xs disabled:opacity-40"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isKeypadDisabled || pin.length === 0}
            className="h-14 rounded-2xl bg-stone-50 dark:bg-slate-800/80 hover:bg-stone-100 dark:hover:bg-slate-700/80 active:bg-stone-200 dark:active:bg-slate-700 text-stone-500 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-slate-700/70 transition active:scale-95 flex items-center justify-center shadow-xs disabled:opacity-30"
            aria-label="Borrar dígito"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {process.env.NODE_ENV === 'development' ? (
          <p className="text-[11px] text-stone-400 dark:text-slate-600 text-center mt-5">
            PIN por defecto: <strong className="text-stone-600 dark:text-slate-400 font-mono">1234</strong>
          </p>
        ) : (
          <p className="text-[11px] text-stone-400 dark:text-slate-600 text-center mt-5">
            Ingreso protegido por clave PIN.
          </p>
        )}
      </div>
    </div>
  );
}
