// src/lib/fudo.ts
import {
  SupplierBalance,
  UpcomingExpense,
  ExpenseCategory,
  BalancesResponse,
  RecurringService,
  DailyMovement,
  DailyMovementsResponse,
  CashCountReport,
  CashExpenseItem,
  CashMovementItem,
} from '@/types/fudo';

// Cache en memoria para balances con TTL de 10 minutos
interface CachedFudoData {
  suppliers: SupplierBalance[];
  upcomingExpenses: UpcomingExpense[];
  recurringServices: RecurringService[];
  categories: ExpenseCategory[];
  timestamp: number;
  syncedAtISO: string;
}

let fudoMemoryCache: CachedFudoData | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

// Cache de token JWT de Fudo
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

// Servicios recurrentes típicos identificados en la operación del local
const BASE_RECURRING_SERVICES: Array<Omit<RecurringService, 'status' | 'actualDueDate' | 'actualAmount'>> = [
  {
    id: 'fudo-software',
    name: 'Fudo (Software)',
    categoryName: 'Software',
    providerName: 'Fudo',
    typicalDueDay: 7,
    approxAmount: 87000,
    notes: 'Abono mensual sistema Fudo',
  },
  {
    id: 'medisen-salud',
    name: 'Medisen (Área Protegida)',
    categoryName: 'Servicios',
    providerName: 'Medisen',
    typicalDueDay: 10,
    approxAmount: 60000,
    notes: 'Emergencias y servicio médico',
  },
  {
    id: 'fed-patronal-seguro',
    name: 'Fed. Patronal (Seguro)',
    categoryName: 'Servicios',
    providerName: 'FEDERACION PATRONAL Seguros SA',
    typicalDueDay: 11,
    approxAmount: 128812,
    notes: 'Seguro de comercio / Juan',
  },
  {
    id: 'dgr-rentas',
    name: 'DGR Salta (Act. Económicas)',
    categoryName: 'Impuestos',
    providerName: 'DGR',
    typicalDueDay: 12,
    approxAmount: 110700,
    notes: 'Impuesto a las Actividades Económicas',
  },
  {
    id: 'gasnor-gas',
    name: 'NaturGY / GasNor (Gas)',
    categoryName: 'Gas',
    providerName: 'NaturGY (GasNor)',
    typicalDueDay: 14,
    approxAmount: 95000,
    notes: 'Gas natural del local (Cliente 40292472)',
  },
  {
    id: 'edesa-luz',
    name: 'Edesa S.A. (Luz)',
    categoryName: 'Luz',
    providerName: 'Edesa S.A.',
    typicalDueDay: 16,
    approxAmount: 1440000,
    notes: 'Consumo eléctrico (NIS 3089395 / 3088328)',
  },
  {
    id: 'afip-f931-autonomos',
    name: 'ARCA / AFIP (Cargas Sociales / F931)',
    categoryName: 'Impuestos',
    providerName: 'ARCA (Afip)',
    typicalDueDay: 18,
    approxAmount: 1390000,
    notes: 'Aportes, contribuciones y autónomos',
  },
  {
    id: 'uthgra-gremio',
    name: 'Uthgra (Sindicato)',
    categoryName: 'Impuestos',
    providerName: 'Uthgra',
    typicalDueDay: 18,
    approxAmount: 495500,
    notes: 'Cuota sindical gastronómicos',
  },
];

/**
 * Helpers para Zona Horaria Salta / Argentina (GMT-3)
 */
export function getSaltaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Salta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Retorna "YYYY-MM-DD"
}

export function getSaltaTimeFormatted(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Salta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getSaltaDateFromISO(isoString: string): string {
  const d = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Salta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Obtiene el token JWT autenticándose en https://auth.fu.do/api
 */
async function getFudoToken(apiKey: string, apiSecret: string): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > nowSec + 60) {
    return cachedToken;
  }

  const authUrl = process.env.FUDO_AUTH_URL || 'https://auth.fu.do/api';
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ apiKey, apiSecret }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fallo de autenticación en Fudo (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.token) {
    throw new Error('Fudo no devolvió token de autenticación.');
  }

  cachedToken = String(data.token);
  tokenExpiresAt = typeof data.exp === 'number' ? data.exp : nowSec + 3600;
  return cachedToken;
}

/**
 * Obtiene los saldos, servicios recurrentes y categorías desde Fudo API.
 */
export async function fetchFudoBalances(forceRefresh: boolean = false): Promise<BalancesResponse> {
  const apiKey = process.env.FUDO_API_KEY;
  const apiSecret = process.env.FUDO_API_SECRET;
  const now = Date.now();

  // Si tenemos caché reciente y no se solicita refresco forzado
  if (!forceRefresh && fudoMemoryCache && now - fudoMemoryCache.timestamp < CACHE_TTL_MS) {
    const totalDebt = fudoMemoryCache.suppliers.reduce((acc, s) => acc + s.balance, 0);
    return {
      suppliers: fudoMemoryCache.suppliers,
      upcomingExpenses: fudoMemoryCache.upcomingExpenses,
      recurringServices: fudoMemoryCache.recurringServices,
      categories: fudoMemoryCache.categories,
      lastSyncedAt: fudoMemoryCache.syncedAtISO,
      isFallback: false,
      totalDebt,
    };
  }

  // Si no hay credenciales configuradas
  if (!apiKey || !apiSecret || apiKey === 'tu_api_key' || apiSecret === 'tu_api_secret') {
    return {
      suppliers: [],
      upcomingExpenses: [],
      recurringServices: [],
      categories: [],
      lastSyncedAt: new Date().toISOString(),
      isFallback: true,
      totalDebt: 0,
      error: 'Modo Demostración: FUDO_API_KEY / FUDO_API_SECRET no configurados en .env.local',
    };
  }

  try {
    const token = await getFudoToken(apiKey, apiSecret);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    // Consultar proveedores, categorías y gastos
    const [providersRes, categoriesRes, expensesRes] = await Promise.all([
      fetch(
        'https://api.fu.do/v1alpha1/providers?fields[provider]=name,providerHouseAccountBalance&page[size]=250',
        {
          headers,
          signal: controller.signal,
          cache: 'no-store',
        }
      ),
      fetch(
        'https://api.fu.do/v1alpha1/expense-categories?fields[expenseCategory]=name&page[size]=100',
        {
          headers,
          signal: controller.signal,
          cache: 'no-store',
        }
      ),
      fetch(
        'https://api.fu.do/v1alpha1/expenses?sort=-createdAt&page[size]=250&fields[expense]=amount,dueDate,status,canceled,description,createdAt,provider,expenseCategory&fields[expenseCategory]=name&fields[provider]=name&include=provider,expenseCategory',
        {
          headers,
          signal: controller.signal,
          cache: 'no-store',
        }
      ),
    ]);

    clearTimeout(timeoutId);

    if (providersRes.status === 403 || expensesRes.status === 403) {
      throw new Error(
        'El usuario en Fudo no tiene permisos para Proveedores ni Gastos (Rol "Integraciones"). Asigna el rol "Admin" o "Auditoría" en Administración > Usuarios en Fudo.'
      );
    }

    if (!providersRes.ok) {
      throw new Error(`Error en Proveedores Fudo: HTTP ${providersRes.status}`);
    }

    const providersData = await providersRes.json();
    const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { data: [] };
    const expensesData = expensesRes.ok ? await expensesRes.json() : { data: [] };

    // Mapa de nombres de proveedores
    const providersMap = new Map<string, string>();
    const rawProviders = Array.isArray(providersData?.data) ? providersData.data : [];
    for (const p of rawProviders) {
      providersMap.set(String(p.id), String(p.attributes?.name || 'Proveedor').trim());
    }

    // Mapa de categorías de gastos
    const categoriesMap = new Map<string, string>();
    const rawCategories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
    for (const c of rawCategories) {
      categoriesMap.set(String(c.id), String(c.attributes?.name || '').trim());
    }

    // Integrar recursos incluidos en expenses sin sobreescribir con vacíos
    if (Array.isArray(expensesData?.included)) {
      for (const inc of expensesData.included) {
        if (inc.type === 'Provider' && inc.attributes?.name) {
          providersMap.set(String(inc.id), String(inc.attributes.name).trim());
        }
        if (inc.type === 'ExpenseCategory' && inc.attributes?.name) {
          categoriesMap.set(String(inc.id), String(inc.attributes.name).trim());
        }
      }
    }

    // Normalizar proveedores con saldo de cuenta corriente deudor
    const houseAccountSupplierIds = new Set<string>();
    const normalizedSuppliers: SupplierBalance[] = rawProviders
      .map((item: Record<string, unknown>) => {
        const id = String(item.id || item._id);
        const attrs = (item.attributes || item) as Record<string, unknown>;
        const name = String(attrs.name || 'Proveedor').trim();

        // En Fudo el saldo adeudado al proveedor es un número negativo en providerHouseAccountBalance
        const rawBal = Number(attrs.providerHouseAccountBalance ?? attrs.balance ?? 0);
        let debt = 0;
        if (rawBal < 0) {
          debt = Math.round(Math.abs(rawBal));
          houseAccountSupplierIds.add(id);
        } else if (rawBal > 0 && !attrs.providerHouseAccountBalance) {
          debt = Math.round(rawBal);
          houseAccountSupplierIds.add(id);
        }

        return { id, name, balance: debt };
      })
      .filter((s: SupplierBalance) => s.balance > 0)
      .sort((a: SupplierBalance, b: SupplierBalance) => b.balance - a.balance);

    const rawExpenses = Array.isArray(expensesData?.data) ? expensesData.data : [];

    // Categorías asociadas a Servicios e Impuestos
    const serviceCategoryIds = new Set(['13', '14', '15', '16', '17', '18', '19', '20', '23', '27']);

    // Construcción de la lista enriquecida de Servicios Recurrentes (Vencimientos y Montos Estimados)
    const currentSalDate = getSaltaDateString(new Date());
    const currentYearMonth = currentSalDate.slice(0, 7); // "YYYY-MM"

    const enrichedRecurringServices: RecurringService[] = BASE_RECURRING_SERVICES.map((base) => {
      // Buscar si existe un gasto reciente en Fudo para este servicio
      const matchingExpenses = rawExpenses.filter((e: Record<string, unknown>) => {
        const attrs = (e.attributes || {}) as Record<string, unknown>;
        const rels = (e.relationships || {}) as Record<string, unknown>;
        if (attrs.canceled === true) return false;

        const providerRel = rels.provider as { data?: { id?: string } } | undefined;
        const pId = providerRel?.data?.id ? String(providerRel.data.id) : '';
        const pName = (pId && providersMap.get(pId)) || '';

        const categoryRel = rels.expenseCategory as { data?: { id?: string } } | undefined;
        const cId = categoryRel?.data?.id ? String(categoryRel.data.id) : '';
        const cName = (cId && categoriesMap.get(cId)) || '';
        const desc = String(attrs.description || '');

        const target = `${pName} ${cName} ${desc}`.toLowerCase();
        const baseNameMatch = base.providerName.toLowerCase().includes(pName.toLowerCase()) ||
          pName.toLowerCase().includes(base.providerName.toLowerCase()) ||
          target.includes(base.name.toLowerCase().split(' ')[0]);

        return baseNameMatch;
      });

      // Ordenar más recientes primero
      matchingExpenses.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aAttrs = (a.attributes || {}) as Record<string, unknown>;
        const bAttrs = (b.attributes || {}) as Record<string, unknown>;
        const da = new Date(String(aAttrs.createdAt || 0)).getTime();
        const db = new Date(String(bAttrs.createdAt || 0)).getTime();
        return db - da;
      });

      const latest = matchingExpenses[0];

      let status: 'pending' | 'paid' | 'estimated' = 'estimated';
      let actualDueDate: string | null = null;
      let actualAmount: number | null = null;

      if (latest) {
        const latestAttrs = (latest.attributes || {}) as Record<string, unknown>;
        const isUnpaid = String(latestAttrs.status || '').toUpperCase() === 'UNPAID';
        const expDate = String(latestAttrs.dueDate || latestAttrs.createdAt || '');
        
        // Si hay un gasto pendiente cargado para este mes o próximo
        if (isUnpaid) {
          status = 'pending';
          actualDueDate = (latestAttrs.dueDate || null) as string | null;
          actualAmount = Math.round(Number(latestAttrs.amount || 0));
        } else if (expDate.startsWith(currentYearMonth)) {
          // Ya fue pagado en el mes corriente
          status = 'paid';
          actualDueDate = (latestAttrs.dueDate || null) as string | null;
          actualAmount = Math.round(Number(latestAttrs.amount || 0));
        }
      }

      // Si es estimado, calculamos la fecha aproximada en base al día típico
      if (!actualDueDate) {
        const dayStr = String(base.typicalDueDay).padStart(2, '0');
        actualDueDate = `${currentYearMonth}-${dayStr}`;
      }

      return {
        ...base,
        status,
        actualDueDate,
        actualAmount: actualAmount || base.approxAmount,
      };
    });

    // Normalizar gastos pendientes excluyendo proveedores de cuenta corriente
    // (a solicitud expresa del usuario: los proveedores de cuenta corriente se saldan por pago global
    // y no requieren fechas de vencimiento individuales)
    const normalizedExpenses: UpcomingExpense[] = rawExpenses
      .filter((item: Record<string, unknown>) => {
        const attrs = (item.attributes || {}) as Record<string, unknown>;
        const rels = (item.relationships || {}) as Record<string, unknown>;
        const isCanceled = attrs.canceled === true;
        const status = String(attrs.status || '').toUpperCase();
        if (isCanceled || (status !== 'UNPAID' && status !== 'PENDING' && status !== '')) return false;

        const providerRel = rels.provider as { data?: { id?: string } } | undefined;
        const providerId = providerRel?.data?.id ? String(providerRel.data.id) : undefined;
        const categoryRel = rels.expenseCategory as { data?: { id?: string } } | undefined;
        const categoryId = categoryRel?.data?.id ? String(categoryRel.data.id) : undefined;

        // Si es un proveedor de cuenta corriente habitual y NO es de servicios, suprimimos el vencimiento
        const isHouseAccount = providerId && houseAccountSupplierIds.has(providerId);
        const isService = categoryId && serviceCategoryIds.has(categoryId);

        if (isHouseAccount && !isService) {
          return false;
        }

        return true;
      })
      .map((item: Record<string, unknown>) => {
        const id = String(item.id);
        const attrs = (item.attributes || {}) as Record<string, unknown>;
        const rels = (item.relationships || {}) as Record<string, unknown>;

        const providerRel = rels.provider as { data?: { id?: string } } | undefined;
        const providerId = providerRel?.data?.id ? String(providerRel.data.id) : undefined;

        const categoryRel = rels.expenseCategory as { data?: { id?: string } } | undefined;
        const categoryId = categoryRel?.data?.id ? String(categoryRel.data.id) : undefined;

        let cleanSupplierName = 'Gasto general';
        if (providerId && providersMap.has(providerId)) {
          cleanSupplierName = providersMap.get(providerId)!;
        } else if (categoryId && categoriesMap.has(categoryId)) {
          cleanSupplierName = categoriesMap.get(categoryId)!;
        } else {
          const desc = String(attrs.description || '').split('\n')[0].trim();
          cleanSupplierName = desc.length > 0 && desc.length <= 40 ? desc : 'Gasto pendiente';
        }

        const categoryName = categoryId && categoriesMap.has(categoryId)
          ? categoriesMap.get(categoryId)!
          : 'Sin categoría';

        return {
          id,
          supplierId: providerId,
          supplierName: cleanSupplierName,
          amount: Math.round(Number(attrs.amount || 0)),
          dueDate: (attrs.dueDate || null) as string | null,
          status: 'pending' as const,
          categoryId: categoryId || 'uncategorized',
          categoryName,
        };
      })
      .sort((a: UpcomingExpense, b: UpcomingExpense) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.amount - a.amount;
      });

    // Calcular categorías activas y su conteo
    const categoryCountMap = new Map<string, { id: string; name: string; count: number }>();
    for (const exp of normalizedExpenses) {
      const cId = exp.categoryId || 'uncategorized';
      const cName = exp.categoryName || 'Sin categoría';
      if (!categoryCountMap.has(cId)) {
        categoryCountMap.set(cId, { id: cId, name: cName, count: 0 });
      }
      categoryCountMap.get(cId)!.count++;
    }

    const availableCategories: ExpenseCategory[] = Array.from(categoryCountMap.values()).sort(
      (a, b) => b.count - a.count
    );

    const syncedAtISO = new Date().toISOString();

    fudoMemoryCache = {
      suppliers: normalizedSuppliers,
      upcomingExpenses: normalizedExpenses,
      recurringServices: enrichedRecurringServices,
      categories: availableCategories,
      timestamp: Date.now(),
      syncedAtISO,
    };

    const totalDebt = normalizedSuppliers.reduce((acc, s) => acc + s.balance, 0);

    return {
      suppliers: normalizedSuppliers,
      upcomingExpenses: normalizedExpenses,
      recurringServices: enrichedRecurringServices,
      categories: availableCategories,
      lastSyncedAt: syncedAtISO,
      isFallback: false,
      totalDebt,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Fudo API Sync Error]:', errorMsg);

    if (fudoMemoryCache) {
      const totalDebt = fudoMemoryCache.suppliers.reduce((acc, s) => acc + s.balance, 0);
      return {
        suppliers: fudoMemoryCache.suppliers,
        upcomingExpenses: fudoMemoryCache.upcomingExpenses,
        recurringServices: fudoMemoryCache.recurringServices,
        categories: fudoMemoryCache.categories,
        lastSyncedAt: fudoMemoryCache.syncedAtISO,
        isFallback: true,
        totalDebt,
        error: `Sincronización falló: ${errorMsg}`,
      };
    }

    return {
      suppliers: [],
      upcomingExpenses: [],
      recurringServices: [],
      categories: [],
      lastSyncedAt: new Date().toISOString(),
      isFallback: true,
      totalDebt: 0,
      error: `Error Fudo: ${errorMsg}`,
    };
  }
}

/**
 * Consulta y clasifica los movimientos diarios de cuenta corriente de proveedores:
 * - Transferencias y pagos realizados (amount > 0)
 * - Nuevos gastos cargados en cta. cte. (amount < 0)
 */
export async function fetchDailyMovements(
  dateStr?: string,
  paymentMethodId?: string
): Promise<DailyMovementsResponse> {
  const apiKey = process.env.FUDO_API_KEY;
  const apiSecret = process.env.FUDO_API_SECRET;

  const targetDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : getSaltaDateString(new Date());

  if (!apiKey || !apiSecret || apiKey === 'tu_api_key') {
    return {
      date: targetDate,
      payments: [],
      newExpenses: [],
      totalPayments: 0,
      totalNewExpenses: 0,
      netChange: 0,
      availablePaymentMethods: [],
      lastSyncedAt: new Date().toISOString(),
      error: 'Credenciales FUDO_API_KEY no configuradas.',
    };
  }

  try {
    const token = await getFudoToken(apiKey, apiSecret);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    // Traer las transacciones de cuenta corriente recientes y métodos de pago
    const [txRes, pmRes] = await Promise.all([
      fetch(
        'https://api.fu.do/v1alpha1/provider-house-account-transactions?sort=-createdAt&page[size]=200&include=provider,expense,paymentMethod',
        { headers, cache: 'no-store' }
      ),
      fetch('https://api.fu.do/v1alpha1/payment-methods', { headers, cache: 'no-store' }),
    ]);

    if (!txRes.ok) {
      throw new Error(`Error en transacciones de Fudo: HTTP ${txRes.status}`);
    }

    const txData = await txRes.json();
    const pmData = pmRes.ok ? await pmRes.json() : { data: [] };

    // Mapa de recursos incluidos (proveedores, métodos de pago)
    const includedMap = new Map<string, string>();
    for (const inc of txData.included || []) {
      const name = inc.attributes?.name || inc.attributes?.description || '';
      includedMap.set(`${inc.type}_${inc.id}`, String(name).trim());
    }

    // Mapa general de métodos de pago
    const paymentMethodsMap = new Map<string, string>();
    for (const pm of pmData.data || []) {
      paymentMethodsMap.set(String(pm.id), String(pm.attributes?.name || 'Otro').trim());
    }

    const allPayments: DailyMovement[] = [];
    const allNewExpenses: DailyMovement[] = [];
    const methodCounts = new Map<string, { id: string; name: string; count: number }>();

    for (const tx of txData.data || []) {
      if (tx.attributes?.canceled === true) continue;

      const createdAt = String(tx.attributes?.createdAt || '');
      const txDate = getSaltaDateFromISO(createdAt);

      if (txDate !== targetDate) continue;

      const rawAmount = Number(tx.attributes?.amount || 0);
      const provId = String(tx.relationships?.provider?.data?.id || '');
      const provName = provId
        ? (includedMap.get(`Provider_${provId}`) || 'Proveedor')
        : 'Proveedor';

      const pmId = tx.relationships?.paymentMethod?.data?.id
        ? String(tx.relationships.paymentMethod.data.id)
        : undefined;
      const pmName = pmId
        ? (includedMap.get(`PaymentMethod_${pmId}`) || paymentMethodsMap.get(pmId) || 'Otro')
        : undefined;

      const expId = tx.relationships?.expense?.data?.id
        ? String(tx.relationships.expense.data.id)
        : undefined;

      const timeFormatted = getSaltaTimeFormatted(createdAt);

      // Si amount > 0: Pago realizado al proveedor
      if (rawAmount > 0) {
        const movement: DailyMovement = {
          id: String(tx.id),
          type: 'payment',
          amount: Math.round(rawAmount * 100) / 100,
          providerId: provId,
          providerName: provName,
          paymentMethodId: pmId,
          paymentMethodName: pmName || 'Transferencia',
          createdAt,
          timeFormatted,
        };

        allPayments.push(movement);

        // Contabilizar medio de pago
        const mKey = pmId || 'unknown';
        const mName = pmName || 'Transferencia';
        if (!methodCounts.has(mKey)) {
          methodCounts.set(mKey, { id: mKey, name: mName, count: 0 });
        }
        methodCounts.get(mKey)!.count++;
      } else if (rawAmount < 0) {
        // Si amount < 0: Nuevo gasto / compra cargada en cuenta corriente
        const movement: DailyMovement = {
          id: String(tx.id),
          type: 'expense',
          amount: Math.abs(Math.round(rawAmount * 100) / 100),
          providerId: provId,
          providerName: provName,
          expenseId: expId,
          createdAt,
          timeFormatted,
        };

        allNewExpenses.push(movement);
      }
    }

    // Filtrar pagos por medio de pago si se especificó (ej: solo transferencias)
    let filteredPayments = allPayments;
    if (paymentMethodId && paymentMethodId !== 'all') {
      filteredPayments = allPayments.filter((p) => p.paymentMethodId === paymentMethodId);
    }

    const totalPayments = filteredPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalNewExpenses = allNewExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netChange = totalNewExpenses - totalPayments;

    const availablePaymentMethods = Array.from(methodCounts.values());

    return {
      date: targetDate,
      payments: filteredPayments,
      newExpenses: allNewExpenses,
      totalPayments,
      totalNewExpenses,
      netChange,
      availablePaymentMethods,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Fudo Daily Movements Error]:', errorMsg);
    return {
      date: targetDate,
      payments: [],
      newExpenses: [],
      totalPayments: 0,
      totalNewExpenses: 0,
      netChange: 0,
      availablePaymentMethods: [],
      lastSyncedAt: new Date().toISOString(),
      error: `Error al consultar movimientos: ${errorMsg}`,
    };
  }
}

/**
 * Consulta y calcula el Arqueo de Caja de un turno o fecha:
 * - Venta total
 * - Pagos con tarjeta (Payway/Débito/Crédito)
 * - Pagos con efectivo
 * - Pagos con transferencia
 * - Gastos de caja principal en lista y detallados
 * - Movimientos de caja (ingresos/retiros)
 * - Caja inicial
 * - Restante total en efectivo
 */
export async function fetchCashCountReport(
  dateStr?: string,
  shiftType: 'auto' | 'dinner' | 'lunch' | 'full' = 'auto',
  customInitialCash?: number
): Promise<CashCountReport> {
  const apiKey = process.env.FUDO_API_KEY;
  const apiSecret = process.env.FUDO_API_SECRET;

  const targetDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : getSaltaDateString(new Date());

  const initialShiftType = shiftType === 'auto' ? 'dinner' : shiftType;
  const shiftName = initialShiftType === 'dinner' ? 'Cena' : initialShiftType === 'lunch' ? 'Almuerzo' : 'Día Completo';

  const emptyReport: CashCountReport = {
    date: targetDate,
    shiftType: initialShiftType,
    shiftName,
    totalSales: 0,
    cardPayments: 0,
    cashPayments: 0,
    transferPayments: 0,
    otherPayments: 0,
    tips: 0,
    cardTips: 0,
    cashTips: 0,
    expenses: [],
    totalExpenses: 0,
    movements: [],
    totalMovements: 0,
    initialCash: customInitialCash !== undefined ? customInitialCash : 50000,
    finalRemainingCash: customInitialCash !== undefined ? customInitialCash : 50000,
    hasApiPermissions: false,
    lastSyncedAt: new Date().toISOString(),
  };

  if (!apiKey || !apiSecret || apiKey === 'tu_api_key') {
    return {
      ...emptyReport,
      error: 'Credenciales FUDO_API_KEY no configuradas.',
    };
  }

  try {
    const token = await getFudoToken(apiKey, apiSecret);
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    // Calcular límites de tiempo del turno (en UTC para matchear createdAt de Fudo)
    // Helper para determinar fecha y hora local de Salta
    const getSaltaDateAndHour = (isoString: string) => {
      const d = new Date(isoString);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Salta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(d);
      const year = parts.find((p) => p.type === 'year')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
      return { dateStr: `${year}-${month}-${day}`, hour };
    };

    const getPrevDaySaltaString = (dStr: string) => {
      const [y, m, d] = dStr.split('-').map(Number);
      const prev = new Date(Date.UTC(y, m - 1, d - 1));
      const year = prev.getUTCFullYear();
      const month = String(prev.getUTCMonth() + 1).padStart(2, '0');
      const day = String(prev.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Clasifica un arqueo de Fudo en 'lunch' o 'dinner' y asigna su fecha operativa en Salta
    const getShiftTypeOfCashCount = (openedAtIso: string): { shift: 'lunch' | 'dinner'; businessDate: string } => {
      const { dateStr, hour } = getSaltaDateAndHour(openedAtIso);
      if (hour >= 6 && hour < 18) {
        return { shift: 'lunch', businessDate: dateStr };
      } else {
        // Turnos nocturnos abiertos en la madrugada (00:00 - 05:59) pertenecen a la fecha comercial del día previo
        const businessDate = hour < 6 ? getPrevDaySaltaString(dateStr) : dateStr;
        return { shift: 'dinner', businessDate };
      }
    };

    // Consultas concurrentes a Fudo (con campos requeridos para sparse fieldsets)
    const [cashCountRes, cashMovRes, expRes, payRes] = await Promise.all([
      fetch('https://api.fu.do/v1alpha1/cash-counts?sort=-id&page[size]=25', {
        headers,
        cache: 'no-store',
      }),
      fetch(
        'https://api.fu.do/v1alpha1/cash-movements?sort=-id&page[size]=100&fields[cashMovement]=amount,comment,createdAt,canceled,movementType',
        { headers, cache: 'no-store' }
      ),
      fetch(
        'https://api.fu.do/v1alpha1/expenses?sort=-createdAt&page[size]=100&include=provider,cashRegister&fields[expense]=amount,createdAt,canceled,description,provider,cashRegister&fields[provider]=name',
        { headers, cache: 'no-store' }
      ),
      fetch(
        'https://api.fu.do/v1alpha1/payments?sort=-id&page[size]=250&include=paymentMethod',
        { headers, cache: 'no-store' }
      ),
    ]);

    const hasApiPermissions = cashCountRes.ok && cashMovRes.ok;
    const ccData = cashCountRes.ok ? await cashCountRes.json() : { data: [] };
    const cmData = cashMovRes.ok ? await cashMovRes.json() : { data: [] };
    const expData = expRes.ok ? await expRes.json() : { data: [], included: [] };
    const payData = payRes.ok ? await payRes.json() : { data: [], included: [] };

    // Buscar el arqueo nativo de Fudo correspondiente a la fecha y turno
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchedCC: any = null;
    let effectiveShift: 'dinner' | 'lunch' | 'full' = 'dinner';
    let effectiveDate = targetDate;

    if (Array.isArray(ccData.data) && ccData.data.length > 0) {
      if (shiftType === 'auto') {
        // 1. Prioridad máxima: Turno actualmente ABIERTO en Fudo (closedAt === null o undefined)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const openCC = ccData.data.find((cc: any) => !cc.attributes?.closedAt);
        if (openCC && openCC.attributes?.openedAt) {
          const { shift, businessDate } = getShiftTypeOfCashCount(openCC.attributes.openedAt);
          // Si no se solicitó fecha específica, o la fecha solicitada coincide con el turno abierto
          if (!dateStr || dateStr === businessDate) {
            matchedCC = openCC;
            effectiveShift = shift;
            effectiveDate = businessDate;
          }
        }

        // 2. Si no hay turno abierto (o se pidió otra fecha), buscar el CashCount según horario
        if (!matchedCC) {
          const nowSalta = getSaltaDateAndHour(new Date().toISOString());
          const isToday = effectiveDate === nowSalta.dateStr;
          // Si es hoy: entre 08:00 y 18:59 es Almuerzo, fuera de ese horario es Cena
          const preferredShift: 'lunch' | 'dinner' = isToday
            ? (nowSalta.hour >= 8 && nowSalta.hour < 19 ? 'lunch' : 'dinner')
            : 'dinner'; // Para fechas anteriores, Cena es el cierre principal

          // Buscar coincidencia exacta para effectiveDate y preferredShift
          for (const cc of ccData.data) {
            const openedAt = cc.attributes?.openedAt;
            if (!openedAt) continue;
            const { shift, businessDate } = getShiftTypeOfCashCount(openedAt);
            if (businessDate === effectiveDate && shift === preferredShift) {
              matchedCC = cc;
              effectiveShift = shift;
              break;
            }
          }

          // Si no existió el preferredShift, buscar cualquier CashCount para esa fecha
          if (!matchedCC) {
            for (const cc of ccData.data) {
              const openedAt = cc.attributes?.openedAt;
              if (!openedAt) continue;
              const { shift, businessDate } = getShiftTypeOfCashCount(openedAt);
              if (businessDate === effectiveDate) {
                matchedCC = cc;
                effectiveShift = shift;
                break;
              }
            }
          }

          // Si no hay CashCount para esa fecha, mantener preferredShift
          if (!matchedCC) {
            effectiveShift = preferredShift;
          }
        }
      } else if (shiftType === 'lunch') {
        effectiveShift = 'lunch';
        for (const cc of ccData.data) {
          const openedAt = cc.attributes?.openedAt;
          if (!openedAt) continue;
          const { shift, businessDate } = getShiftTypeOfCashCount(openedAt);
          if (businessDate === targetDate && shift === 'lunch') {
            matchedCC = cc;
            break;
          }
        }
      } else if (shiftType === 'dinner') {
        effectiveShift = 'dinner';
        for (const cc of ccData.data) {
          const openedAt = cc.attributes?.openedAt;
          if (!openedAt) continue;
          const { shift, businessDate } = getShiftTypeOfCashCount(openedAt);
          if (businessDate === targetDate && shift === 'dinner') {
            matchedCC = cc;
            break;
          }
        }
      } else if (shiftType === 'full') {
        effectiveShift = 'full';
        for (const cc of ccData.data) {
          const openedAt = cc.attributes?.openedAt;
          if (!openedAt) continue;
          const { businessDate } = getShiftTypeOfCashCount(openedAt);
          if (businessDate === targetDate) {
            matchedCC = cc;
            break;
          }
        }
      }
    } else {
      effectiveShift = shiftType === 'auto' ? 'dinner' : shiftType;
    }

    const effectiveShiftName =
      effectiveShift === 'dinner'
        ? 'Cena'
        : effectiveShift === 'lunch'
        ? 'Almuerzo'
        : 'Día Completo';

    // Definir timestamps de inicio y fin para el filtrado de gastos y movimientos
    let startTimestamp = 0;
    let endTimestamp = 0;

    if (matchedCC) {
      startTimestamp = new Date(matchedCC.attributes.openedAt).getTime();
      endTimestamp = matchedCC.attributes.closedAt
        ? new Date(matchedCC.attributes.closedAt).getTime()
        : Date.now();
    } else {
      const [y, m, d] = effectiveDate.split('-').map(Number);
      if (effectiveShift === 'dinner') {
        startTimestamp = Date.UTC(y, m - 1, d, 22, 30, 0);
        const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 9, 0, 0));
        endTimestamp = nextDay.getTime();
      } else if (effectiveShift === 'lunch') {
        startTimestamp = Date.UTC(y, m - 1, d, 14, 0, 0);
        endTimestamp = Date.UTC(y, m - 1, d, 22, 30, 0);
      } else {
        startTimestamp = Date.UTC(y, m - 1, d, 12, 0, 0);
        const nextDay = new Date(Date.UTC(y, m - 1, d + 1, 9, 0, 0));
        endTimestamp = nextDay.getTime();
      }
    }

    // Determinar caja inicial
    let initialCash = customInitialCash !== undefined ? customInitialCash : 50000;
    if (matchedCC && customInitialCash === undefined) {
      initialCash = Number(matchedCC.attributes?.init || 0);
    }

    // Filtrar gastos de la caja principal (cashRegister === "1")
    const provMap = new Map<string, string>();
    for (const inc of expData.included || []) {
      if (inc.type === 'Provider') {
        provMap.set(String(inc.id), String(inc.attributes?.name || '').trim());
      }
    }

    const shiftExpenses: CashExpenseItem[] = [];
    let totalExpenses = 0;

    for (const e of expData.data || []) {
      if (e.attributes?.canceled) continue;
      const crId = e.relationships?.cashRegister?.data?.id;
      // Solo gastos vinculados a la Caja Principal ('1')
      if (crId === '1') {
        const eTime = new Date(String(e.attributes?.createdAt || '')).getTime();
        if (eTime >= startTimestamp && eTime <= endTimestamp) {
          const pId = e.relationships?.provider?.data?.id;
          const pName = pId ? provMap.get(String(pId)) || 'Sin proveedor' : 'Sin proveedor';
          const amt = Math.round(Number(e.attributes?.amount || 0));
          const createdAt = String(e.attributes?.createdAt || '');
          const desc = String(e.attributes?.description || '').trim();

          totalExpenses += amt;
          shiftExpenses.push({
            id: String(e.id),
            providerName: pName,
            description: desc,
            amount: amt,
            timeFormatted: getSaltaTimeFormatted(createdAt),
          });
        }
      }
    }

    shiftExpenses.sort((a, b) => a.timeFormatted.localeCompare(b.timeFormatted));

    // Filtrar movimientos de caja nativos de Fudo
    const shiftMovements: CashMovementItem[] = [];
    let totalMovements = 0;

    if (Array.isArray(cmData.data)) {
      for (const m of cmData.data) {
        if (m.attributes?.canceled) continue;
        const mTime = new Date(String(m.attributes?.createdAt || '')).getTime();
        if (mTime >= startTimestamp && mTime <= endTimestamp) {
          const amt = Number(m.attributes?.amount || 0);
          const isOutflow = m.attributes?.movementType === 'outcome' || amt < 0;
          const cleanAmt = Math.abs(amt);
          const mDesc = String(
            m.attributes?.comment || m.attributes?.description || 'Movimiento de caja'
          ).trim();
          const createdAt = String(m.attributes?.createdAt || '');

          const itemType = isOutflow ? 'outflow' : 'inflow';
          totalMovements += isOutflow ? -cleanAmt : cleanAmt;

          shiftMovements.push({
            id: String(m.id),
            type: itemType,
            amount: cleanAmt,
            description: mDesc,
            timeFormatted: getSaltaTimeFormatted(createdAt),
          });
        }
      }
    }

    shiftMovements.sort((a, b) => a.timeFormatted.localeCompare(b.timeFormatted));

    // 1. Valores registrados por el sistema durante el turno
    let systemCardPayments = 0;
    let systemCashPayments = 0;
    let transferPayments = 0;
    let otherPayments = 0;

    if (matchedCC && Number(matchedCC.attributes?.income || 0) > 0) {
      const incDet = matchedCC.attributes.incomeDetail || {};
      systemCashPayments = Number(incDet['1']?.payments || 0);
      systemCardPayments = Number(incDet['3']?.payments || 0);
      transferPayments = Number(incDet['4']?.payments || 0);

      for (const [k, v] of Object.entries(incDet)) {
        // Excluir terminantemente '2' (Cta. Cte. / Cuenta Corriente) del Arqueo de Caja
        if (k === '2') continue;
        if (!['1', '3', '4'].includes(k)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = Number((v as any)?.payments || 0);
          if (p > 0) otherPayments += p;
        }
      }
    } else {
      // Turno en curso: calcular desde /payments (solo medios de Arqueo de Caja)
      const pmMap = new Map<string, { name: string; code?: string }>();
      for (const inc of payData.included || []) {
        if (inc.type === 'PaymentMethod') {
          pmMap.set(String(inc.id), {
            name: String(inc.attributes?.name || '').trim(),
            code: String(inc.attributes?.code || '').trim(),
          });
        }
      }

      for (const p of payData.data || []) {
        if (p.attributes?.canceled) continue;
        const pTime = new Date(String(p.attributes?.createdAt || '')).getTime();
        if (pTime >= startTimestamp && pTime <= endTimestamp) {
          const pmId = String(p.relationships?.paymentMethod?.data?.id || '');
          const pmInfo = pmMap.get(pmId);
          const pmName = (pmInfo?.name || '').toLowerCase();
          const pmCode = (pmInfo?.code || '').toLowerCase();
          const amt = Number(p.attributes?.amount || 0);

          // Excluir terminantemente Cta. Cte. (cuentas corrientes) del Arqueo de Caja
          if (
            pmId === '2' ||
            pmCode === 'house-account' ||
            pmName.includes('cta') ||
            pmName.includes('corriente') ||
            pmName.includes('house')
          ) {
            continue;
          }

          if (
            pmCode === 'credit-card' ||
            pmName.includes('tarjeta') ||
            pmName.includes('payway') ||
            pmName.includes('crédito') ||
            pmName.includes('credito') ||
            pmName.includes('debito') ||
            pmName.includes('débito')
          ) {
            systemCardPayments += amt;
          } else if (pmCode === 'cash' || pmName.includes('efectivo') || pmName.includes('cash')) {
            systemCashPayments += amt;
          } else if (pmCode === 'debit-card' || pmName.includes('transfer')) {
            transferPayments += amt;
          } else {
            otherPayments += amt;
          }
        }
      }
    }

    // 2. Valores declarados por el usuario en el cierre de caja de Fudo (sin errores de carga del sistema)
    // - Payway declarado por usuario (cupón físico): leftoverDetail['3']
    // - Efectivo restante en caja contado por usuario: leftoverDetail['1']
    const userCardPayments =
      matchedCC?.attributes?.leftoverDetail?.['3'] !== undefined
        ? Number(matchedCC.attributes.leftoverDetail['3'])
        : undefined;

    const userCashLeftover =
      matchedCC?.attributes?.leftoverDetail?.['1'] !== undefined
        ? Number(matchedCC.attributes.leftoverDetail['1'])
        : undefined;

    let userCashPayments: number | undefined = undefined;
    if (userCashLeftover !== undefined) {
      // Restante en caja = Caja Inicial + Cobros Efectivo - Gastos + Movimientos
      // Cobros Efectivo = Restante en caja - Caja Inicial + Gastos - Movimientos
      userCashPayments = Math.round((userCashLeftover - initialCash + totalExpenses - totalMovements) * 100) / 100;
    }

    // Tomar los montos del usuario prioritariamente sobre los del sistema
    const finalCardPayments = userCardPayments !== undefined ? userCardPayments : systemCardPayments;
    const finalCashPayments = userCashPayments !== undefined ? userCashPayments : systemCashPayments;

    const totalSales = Math.round((finalCardPayments + finalCashPayments + transferPayments + otherPayments) * 100) / 100;
    const roundedCard = Math.round(finalCardPayments * 100) / 100;
    const roundedCash = Math.round(finalCashPayments * 100) / 100;
    const roundedTransfer = Math.round(transferPayments * 100) / 100;
    const roundedOther = Math.round(otherPayments * 100) / 100;

    const finalRemainingCash =
      userCashLeftover !== undefined && customInitialCash === undefined
        ? userCashLeftover
        : Math.round((initialCash + roundedCash - totalExpenses + totalMovements) * 100) / 100;

    // Propinas registradas en Fudo
    let cardTips = 0;
    let cashTips = 0;
    let transferTips = 0;

    if (matchedCC?.attributes?.incomeDetail) {
      const incDet = matchedCC.attributes.incomeDetail;
      cashTips = Number(incDet['1']?.tip || 0);
      cardTips = Number(incDet['3']?.tip || 0);
      transferTips = Number(incDet['4']?.tip || 0);
    }
    const totalTips = Math.round((cardTips + cashTips + transferTips) * 100) / 100;

    return {
      date: effectiveDate,
      shiftType: effectiveShift,
      shiftName: effectiveShiftName,
      cashCountId: matchedCC ? String(matchedCC.id) : undefined,
      isClosed: matchedCC ? Boolean(matchedCC.attributes?.closedAt) : undefined,
      openedAt: matchedCC?.attributes?.openedAt,
      closedAt: matchedCC?.attributes?.closedAt || undefined,
      realLeftover: userCashLeftover,
      systemCardPayments: Math.round(systemCardPayments * 100) / 100,
      systemCashPayments: Math.round(systemCashPayments * 100) / 100,
      userCardPayments: userCardPayments !== undefined ? Math.round(userCardPayments * 100) / 100 : undefined,
      userCashLeftover: userCashLeftover !== undefined ? Math.round(userCashLeftover * 100) / 100 : undefined,
      userCashPayments: userCashPayments !== undefined ? Math.round(userCashPayments * 100) / 100 : undefined,
      totalSales,
      cardPayments: roundedCard,
      cashPayments: roundedCash,
      transferPayments: roundedTransfer,
      otherPayments: roundedOther,
      tips: totalTips,
      cardTips: Math.round(cardTips * 100) / 100,
      cashTips: Math.round(cashTips * 100) / 100,
      expenses: shiftExpenses,
      totalExpenses,
      movements: shiftMovements,
      totalMovements,
      initialCash,
      finalRemainingCash,
      hasApiPermissions,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Fudo Cash Count Error]:', errorMsg);
    return {
      ...emptyReport,
      error: `Error al calcular arqueo: ${errorMsg}`,
    };
  }
}
