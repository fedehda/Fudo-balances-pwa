'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Bookmark, Plus, UserCheck } from 'lucide-react';
import { cleanPhoneNumber } from '@/lib/formatters';

interface FrequentContact {
  id: string;
  name: string;
  phone: string; // Número completo con prefijo internacional
}

interface RecipientPanelProps {
  countryCode: string;
  setCountryCode: (code: string) => void;
  phoneDigits: string;
  setPhoneDigits: (digits: string) => void;
  onFullPhoneChange?: (fullPhone: string) => void;
}

const COUNTRY_CODES = [
  { code: '549', label: '+54 9 (Argentina Móvil)', flag: '🇦🇷' },
  { code: '54', label: '+54 (Argentina Fijo)', flag: '🇦🇷' },
  { code: '598', label: '+598 (Uruguay)', flag: '🇺🇾' },
  { code: '56', label: '+56 (Chile)', flag: '🇨🇱' },
  { code: '55', label: '+55 (Brasil)', flag: '🇧🇷' },
  { code: '52', label: '+52 (México)', flag: '🇲🇽' },
  { code: '595', label: '+595 (Paraguay)', flag: '🇵🇾' },
  { code: '591', label: '+591 (Bolivia)', flag: '🇧🇴' },
  { code: '1', label: '+1 (USA / Canadá)', flag: '🇺🇸' },
  { code: '34', label: '+34 (España)', flag: '🇪🇸' },
];

const LOCAL_STORAGE_KEY = 'fudo_whatsapp_frequent_contacts';

export default function RecipientPanel({
  countryCode,
  setCountryCode,
  phoneDigits,
  setPhoneDigits,
}: RecipientPanelProps) {
  const [frequentContacts, setFrequentContacts] = useState<FrequentContact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');

  // Carga inicial desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setFrequentContacts(JSON.parse(saved));
      } else {
        // Contactos sugeridos por defecto
        const defaults: FrequentContact[] = [
          { id: '1', name: 'Administración', phone: '5493871234567' },
          { id: '2', name: 'Socio / Gerencia', phone: '5491145678901' },
        ];
        setFrequentContacts(defaults);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults));
      }
    } catch {
      // Ignorar errores en modo SSR o restricciones de storage
    }
  }, []);

  const saveContactsToStorage = (contacts: FrequentContact[]) => {
    setFrequentContacts(contacts);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contacts));
    } catch {
      // Ignorar
    }
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanPhoneNumber(e.target.value);
    setPhoneDigits(cleaned);
  };

  const handleSelectFrequent = (contact: FrequentContact) => {
    // Si empieza con algún prefijo conocido
    let matchedCode = '549';
    let digits = contact.phone;

    for (const c of COUNTRY_CODES) {
      if (contact.phone.startsWith(c.code)) {
        matchedCode = c.code;
        digits = contact.phone.substring(c.code.length);
        break;
      }
    }

    setCountryCode(matchedCode);
    setPhoneDigits(digits);
  };

  const handleSaveCurrentAsFrequent = () => {
    const fullPhone = `${countryCode}${phoneDigits}`;
    if (!phoneDigits || phoneDigits.length < 6) return;

    const name = newContactName.trim() || `Contacto ${frequentContacts.length + 1}`;
    const newContact: FrequentContact = {
      id: Date.now().toString(),
      name,
      phone: fullPhone,
    };

    const updated = [...frequentContacts, newContact];
    saveContactsToStorage(updated);
    setNewContactName('');
    setIsAddingContact(false);
  };

  const handleDeleteFrequent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = frequentContacts.filter((c) => c.id !== id);
    saveContactsToStorage(updated);
  };

  const fullPhonePreview = `${countryCode}${phoneDigits}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5 transition-all">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-bumeran-600 dark:text-bumeran-400" />
          <span>Destinatario WhatsApp</span>
        </label>
        {phoneDigits && (
          <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20 font-semibold">
            +{fullPhonePreview}
          </span>
        )}
      </div>

      {/* Inputs: Prefijo de país + Teléfono */}
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          aria-label="Código de país"
          className="bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-xs text-stone-800 dark:text-white rounded-xl px-2.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-bumeran-500 max-w-[130px] truncate shadow-2xs"
        >
          {COUNTRY_CODES.map((item) => (
            <option key={item.code} value={item.code} className="bg-white dark:bg-slate-800">
              {item.flag} +{item.code}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Ej: 3874123456 (sin 0 ni 15)"
          value={phoneDigits}
          onChange={handlePhoneInputChange}
          aria-label="Número de teléfono móvil de WhatsApp"
          className="flex-1 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-xs font-mono text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-bumeran-500 shadow-2xs"
        />
      </div>

      {/* Contactos Frecuentes */}
      <div className="pt-1">
        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 mb-1.5">
          <span className="flex items-center gap-1 font-semibold">
            <Bookmark className="w-3 h-3 text-bumeran-600 dark:text-bumeran-400" />
            <span>Frecuentes</span>
          </span>

          {!isAddingContact ? (
            <button
              type="button"
              onClick={() => setIsAddingContact(true)}
              disabled={!phoneDigits || phoneDigits.length < 6}
              className="text-bumeran-600 dark:text-bumeran-400 hover:text-bumeran-700 dark:hover:text-bumeran-300 disabled:opacity-40 flex items-center gap-0.5 text-[11px] font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Guardar actual</span>
            </button>
          ) : null}
        </div>

        {/* Formulario rápido para guardar contacto frecuente */}
        {isAddingContact && (
          <div className="flex items-center gap-1.5 mb-2 bg-stone-50 dark:bg-slate-800/80 p-2 rounded-xl border border-stone-200 dark:border-slate-700">
            <input
              type="text"
              placeholder="Nombre (ej. Juan Socio)"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-xs text-stone-900 dark:text-white px-2.5 py-1.5 rounded-lg"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveCurrentAsFrequent}
              className="px-2.5 py-1.5 bg-bumeran-600 hover:bg-bumeran-700 text-white font-bold text-xs rounded-lg shadow-2xs"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsAddingContact(false)}
              className="px-2 py-1.5 text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Chips de contactos frecuentes */}
        {frequentContacts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {frequentContacts.map((contact) => {
              const isCurrent = `${countryCode}${phoneDigits}` === contact.phone;

              return (
                <div
                  key={contact.id}
                  className={`inline-flex items-center rounded-xl text-[11px] border transition-all overflow-hidden ${
                    isCurrent
                      ? 'bg-bumeran-50 dark:bg-bumeran-500/20 text-bumeran-700 dark:text-bumeran-300 border-bumeran-300 dark:border-bumeran-500/40 font-semibold shadow-2xs'
                      : 'bg-stone-50 hover:bg-stone-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectFrequent(contact)}
                    aria-label={`Usar contacto frecuente ${contact.name}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-left"
                  >
                    <UserCheck className="w-3 h-3 text-bumeran-600 dark:text-bumeran-400 shrink-0" />
                    <span className="truncate max-w-[110px]">{contact.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteFrequent(contact.id, e)}
                    className="px-1.5 py-1 text-stone-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition border-l border-stone-200 dark:border-slate-700/50"
                    aria-label={`Eliminar contacto frecuente ${contact.name}`}
                    title="Eliminar de frecuentes"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
