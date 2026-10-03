'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('[PWA] Service Worker registrado con éxito:', reg.scope))
          .catch((err) => console.log('[PWA] Error al registrar Service Worker:', err));
      });
    }
  }, []);

  return null;
}
