// src/app/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SupplierBalance,
  UpcomingExpense,
  ExpenseCategory,
  RecurringService,
  ScheduledReportConfig,
} from '@/types/fudo';
import { buildWhatsAppMessage } from '@/lib/whatsapp';
import Header from '@/components/Header';
import SelectionBar from '@/components/SelectionBar';
import SupplierList from '@/components/SupplierList';
import UpcomingExpenses from '@/components/UpcomingExpenses';
import ServicesSummary from '@/components/ServicesSummary';
import DailyMovementsReport from '@/components/DailyMovementsReport';
import CashCountReportView from '@/components/CashCountReportView';
import RecipientPanel from '@/components/RecipientPanel';
import ActionButtons from '@/components/ActionButtons';
import ScheduleModal from '@/components/ScheduleModal';
import MessagePreviewModal from '@/components/MessagePreviewModal';
import PinLockScreen from '@/components/PinLockScreen';
import { Loader2, Wallet, CalendarClock, Receipt } from 'lucide-react';

export default function Home() {
  // Pestaña activa: 'balances' | 'daily' | 'arqueo'
  const [activeTab, setActiveTab] = useState<'balances' | 'daily' | 'arqueo'>('balances');

  const [suppliers, setSuppliers] = useState<SupplierBalance[]>([]);
  const [upcomingExpenses, setUpcomingExpenses] = useState<UpcomingExpense[]>([]);
  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [includeUpcomingExpenses, setIncludeUpcomingExpenses] = useState(true);

  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isFallback, setIsFallback] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Seguridad PIN
  const [isLocked, setIsLocked] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);

  // Teléfono destinatario
  const [countryCode, setCountryCode] = useState('549');
  const [phoneDigits, setPhoneDigits] = useState('3871234567');

  // Modales
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Configuración de Cron
  const [scheduleConfig, setScheduleConfig] = useState<ScheduledReportConfig>({
    id: 'default',
    enabled: false,
    targetPhone: '5493871234567',
    targetTime: '09:00',
    autoSelectAll: true,
    selectedSupplierIds: [],
  });

  // Carga inicial de datos
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Verificar autenticación por PIN
      const authRes = await fetch('/api/auth/pin');
      if (authRes.ok) {
        const authData = await authRes.json();
        setPinRequired(authData.pinRequired);
        if (authData.pinRequired && !authData.authenticated) {
          setIsLocked(true);
          setIsLoading(false);
          return;
        }
      }

      setIsLocked(false);

      const [balancesRes, scheduleRes] = await Promise.all([
        fetch('/api/fudo/balances'),
        fetch('/api/settings/schedule'),
      ]);

      if (balancesRes.ok) {
        const data = await balancesRes.json();
        setSuppliers(data.suppliers || []);
        setUpcomingExpenses(data.upcomingExpenses || []);
        setRecurringServices(data.recurringServices || []);
        const loadedCats: ExpenseCategory[] = data.categories || [];
        setCategories(loadedCats);
        setLastSyncedAt(data.lastSyncedAt || new Date().toISOString());
        setIsFallback(data.isFallback || false);
        setErrorMsg(data.error);

        // Por defecto, seleccionamos todos los proveedores con deuda
        const initialSelectedSuppliers = new Set<string>((data.suppliers || []).map((s: SupplierBalance) => s.id));
        setSelectedSupplierIds(initialSelectedSuppliers);

        // Por defecto, seleccionamos todos los servicios recurrentes no pagados
        const initialSelectedServices = new Set<string>(
          (data.recurringServices || [])
            .filter((s: RecurringService) => s.status !== 'paid')
            .map((s: RecurringService) => s.id)
        );
        setSelectedServiceIds(initialSelectedServices);

        // Por defecto, seleccionamos todas las categorías disponibles
        const initialSelectedCats = new Set<string>(loadedCats.map((c: ExpenseCategory) => c.id));
        setSelectedCategoryIds(initialSelectedCats);
      }

      if (scheduleRes.ok) {
        const configData = await scheduleRes.json();
        setScheduleConfig(configData);
        if (configData.targetPhone) {
          if (configData.targetPhone.startsWith('549')) {
            setCountryCode('549');
            setPhoneDigits(configData.targetPhone.substring(3));
          } else if (configData.targetPhone.startsWith('54')) {
            setCountryCode('54');
            setPhoneDigits(configData.targetPhone.substring(2));
          } else {
            setPhoneDigits(configData.targetPhone);
          }
        }
      }
    } catch (err) {
      console.error('Error al inicializar datos:', err);
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refrescar manualmente saldos de Fudo
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/fudo/balances?refresh=true');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
        setUpcomingExpenses(data.upcomingExpenses || []);
        setRecurringServices(data.recurringServices || []);
        const loadedCats: ExpenseCategory[] = data.categories || [];
        setCategories(loadedCats);
        setLastSyncedAt(data.lastSyncedAt || new Date().toISOString());
        setIsFallback(data.isFallback || false);
        setErrorMsg(data.error);

        // Mantener seleccionados existentes o tildar todos
        setSelectedSupplierIds((prev) => {
          const newSet = new Set<string>();
          for (const s of data.suppliers || []) {
            if (prev.has(s.id)) newSet.add(s.id);
          }
          return newSet.size > 0 ? newSet : new Set((data.suppliers || []).map((s: SupplierBalance) => s.id));
        });

        setSelectedServiceIds((prev) => {
          if (prev.size === 0) {
            return new Set(
              (data.recurringServices || [])
                .filter((s: RecurringService) => s.status !== 'paid')
                .map((s: RecurringService) => s.id)
            );
          }
          return prev;
        });

        setSelectedCategoryIds((prev) => {
          if (prev.size === 0) return new Set(loadedCats.map((c) => c.id));
          return prev;
        });
      }
    } catch (err) {
      console.error('Error al refrescar:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle de un proveedor
  const handleToggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllSuppliers = () => {
    setSelectedSupplierIds(new Set(suppliers.map((s) => s.id)));
  };

  const handleDeselectAllSuppliers = () => {
    setSelectedSupplierIds(new Set());
  };

  // Manejo de Servicios Recurrentes
  const handleToggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllServices = () => {
    setSelectedServiceIds(new Set(recurringServices.map((s) => s.id)));
  };

  const handleDeselectAllServices = () => {
    setSelectedServiceIds(new Set());
  };

  // Manejo de Categorías de Fudo
  const handleToggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategoryIds(new Set(categories.map((c) => c.id)));
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategoryIds(new Set());
  };

  // Guardar configuración de automatización
  const handleSaveScheduleConfig = async (updated: Partial<ScheduledReportConfig>) => {
    const payload = {
      ...scheduleConfig,
      ...updated,
      selectedSupplierIds: updated.autoSelectAll ? [] : Array.from(selectedSupplierIds),
      selectedCategoryIds: Array.from(selectedCategoryIds),
    };

    const res = await fetch('/api/settings/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const saved = await res.json();
      setScheduleConfig(saved);
    } else {
      throw new Error('No se pudo guardar la configuración.');
    }
  };

  // Construcción reactiva en vivo del mensaje consolidado de saldos
  const { formattedText, totalSelectedDebt, selectedCount } = useMemo(() => {
    return buildWhatsAppMessage({
      suppliers,
      upcomingExpenses,
      recurringServices,
      selectedSupplierIds: Array.from(selectedSupplierIds),
      includeUpcomingExpenses,
      selectedCategoryIds: Array.from(selectedCategoryIds),
      selectedServiceIds: Array.from(selectedServiceIds),
    });
  }, [
    suppliers,
    upcomingExpenses,
    recurringServices,
    selectedSupplierIds,
    includeUpcomingExpenses,
    selectedCategoryIds,
    selectedServiceIds,
  ]);

  const fullPhone = `${countryCode}${phoneDigits}`;

  const handleUnlock = () => {
    setIsLocked(false);
    loadInitialData();
  };

  const handleLock = async () => {
    await fetch('/api/auth/pin', { method: 'DELETE' });
    setIsLocked(true);
  };

  if (isLocked) {
    return <PinLockScreen onUnlock={handleUnlock} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-300">Consultando Fudo API...</p>
        <span className="text-xs text-slate-500 mt-1">Saldos, servicios y cuenta corriente</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Cabecera Móvil */}
      <Header
        lastSyncedAt={lastSyncedAt}
        isFallback={isFallback}
        error={errorMsg}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onOpenSchedule={() => setIsScheduleOpen(true)}
        scheduleEnabled={scheduleConfig.enabled}
        onLock={handleLock}
        pinRequired={pinRequired}
      />

      {/* Contenedor Vertical Mobile-First */}
      <main className="flex-1 max-w-md w-full mx-auto px-3.5 py-3.5 space-y-3.5 pb-24">
        {/* Selector de Pestañas Principal */}
        <div className="grid grid-cols-3 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-sm gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('balances')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-semibold transition active:scale-95 select-none ${
              activeTab === 'balances'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Saldos & Serv.</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-semibold transition active:scale-95 select-none ${
              activeTab === 'daily'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Movimientos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('arqueo')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-semibold transition active:scale-95 select-none ${
              activeTab === 'arqueo'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">Arqueo Caja</span>
          </button>
        </div>

        {/* Vista 1: Saldos Cta Cte & Servicios Recurrentes */}
        {activeTab === 'balances' && (
          <>
            {/* Barra de Selección Rápida de Proveedores */}
            <SelectionBar
              totalCount={suppliers.length}
              selectedCount={selectedCount}
              selectedDebt={totalSelectedDebt}
              onSelectAll={handleSelectAllSuppliers}
              onDeselectAll={handleDeselectAllSuppliers}
            />

            {/* Lista de Proveedores con Checkboxes */}
            <SupplierList
              suppliers={suppliers}
              selectedSupplierIds={selectedSupplierIds}
              upcomingExpenses={upcomingExpenses}
              onToggleSupplier={handleToggleSupplier}
            />

            {/* Servicios e Impuestos Recurrentes (Luz, Gas, Software, etc.) */}
            <ServicesSummary
              services={recurringServices}
              selectedServiceIds={selectedServiceIds}
              onToggleService={handleToggleService}
              onSelectAllServices={handleSelectAllServices}
              onDeselectAllServices={handleDeselectAllServices}
              includeInMessage={includeUpcomingExpenses}
              onToggleInclude={setIncludeUpcomingExpenses}
            />

            {/* Gastos pendientes no asociados a servicios si existieran */}
            {upcomingExpenses.length > 0 && (
              <UpcomingExpenses
                expenses={upcomingExpenses}
                categories={categories}
                selectedCategoryIds={selectedCategoryIds}
                onToggleCategory={handleToggleCategory}
                onSelectAllCategories={handleSelectAllCategories}
                onDeselectAllCategories={handleDeselectAllCategories}
                includeInMessage={includeUpcomingExpenses}
                onToggleInclude={setIncludeUpcomingExpenses}
              />
            )}

            {/* Panel de Teléfono Destinatario */}
            <RecipientPanel
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              phoneDigits={phoneDigits}
              setPhoneDigits={setPhoneDigits}
            />

            {/* Acciones de Envío Manual WhatsApp & Portapapeles */}
            <ActionButtons
              fullPhone={fullPhone}
              formattedText={formattedText}
              hasSelection={selectedCount > 0}
              onOpenPreview={() => setIsPreviewOpen(true)}
            />
          </>
        )}

        {/* Vista 2: Reporte Diario de Movimientos (Transferencias y Cta Cte) */}
        {activeTab === 'daily' && (
          <DailyMovementsReport
            countryCode={countryCode}
            phoneDigits={phoneDigits}
          />
        )}

        {/* Vista 3: Arqueo de Caja y Ventas */}
        {activeTab === 'arqueo' && (
          <CashCountReportView
            countryCode={countryCode}
            phoneDigits={phoneDigits}
          />
        )}
      </main>

      {/* Modales */}
      <ScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        config={scheduleConfig}
        onSaveConfig={handleSaveScheduleConfig}
        selectedCount={selectedCount}
      />

      <MessagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        formattedText={formattedText}
        fullPhone={fullPhone}
      />
    </div>
  );
}
