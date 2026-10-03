// types/fudo.ts

export interface SupplierBalance {
  id: string;
  name: string;
  balance: number;
  isSelected?: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  count?: number;
}

export interface UpcomingExpense {
  id: string;
  supplierId?: string;
  supplierName: string;
  amount: number;
  dueDate: string | null;
  status: 'pending' | 'paid';
  categoryId?: string;
  categoryName?: string;
}

export interface ConsolidatedReportPayload {
  recipientPhone: string; // Formato E.164 sin símbolos (ej: 5493871234567)
  supplierIds: string[];  // IDs seleccionados para consolidar
  includeUpcomingExpenses: boolean;
  selectedCategoryIds?: string[];
}

export interface ScheduledReportConfig {
  id: string;
  enabled: boolean;
  targetPhone: string;
  targetTime: string; // Formato "HH:mm" (24hs)
  autoSelectAll: boolean; // Si toma todos con balance > 0 o lista fija
  selectedSupplierIds?: string[];
  selectedCategoryIds?: string[];
  lastRunAt?: string | null;
  lastRunStatus?: 'success' | 'failed' | null;
  lastRunMessage?: string | null;
}

export interface RecurringService {
  id: string;
  name: string;
  categoryName: string;
  providerName: string;
  typicalDueDay: number; // Día del mes aproximado (ej: 7, 10, 11, 16)
  approxAmount: number;   // Monto aproximado mensual
  notes?: string;
  status: 'pending' | 'paid' | 'estimated';
  actualDueDate?: string | null;
  actualAmount?: number | null;
}

export interface DailyMovement {
  id: string;
  type: 'payment' | 'expense';
  amount: number;
  providerId: string;
  providerName: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  expenseId?: string;
  expenseDescription?: string;
  createdAt: string;
  timeFormatted: string; // "HH:mm"
}

export interface DailyMovementsResponse {
  date: string; // YYYY-MM-DD
  payments: DailyMovement[];
  newExpenses: DailyMovement[];
  totalPayments: number;
  totalNewExpenses: number;
  netChange: number; // totalNewExpenses - totalPayments
  availablePaymentMethods: { id: string; name: string; count: number }[];
  lastSyncedAt: string;
  error?: string;
}

export interface BalancesResponse {
  suppliers: SupplierBalance[];
  upcomingExpenses: UpcomingExpense[];
  recurringServices: RecurringService[];
  categories: ExpenseCategory[];
  lastSyncedAt: string;
  isFallback: boolean;
  totalDebt: number;
  error?: string;
}

export interface BuildMessageRequest {
  selectedSupplierIds: string[];
  includeUpcomingExpenses: boolean;
  selectedCategoryIds?: string[];
  selectedServiceIds?: string[];
}

export interface BuildMessageResponse {
  formattedText: string;
  totalSelectedDebt: number;
  selectedCount: number;
  expensesCount: number;
}

export interface CashExpenseItem {
  id: string;
  providerName: string;
  description: string;
  amount: number;
  timeFormatted: string;
}

export interface CashMovementItem {
  id: string;
  type: 'inflow' | 'outflow'; // Ingreso o Retiro
  amount: number;
  description: string;
  timeFormatted: string;
}

export interface CashCountReport {
  date: string; // "YYYY-MM-DD"
  shiftType: 'dinner' | 'lunch' | 'full';
  shiftName: string; // "Cena" | "Almuerzo" | "Día Completo"
  totalSales: number;
  cardPayments: number;
  cashPayments: number;
  transferPayments: number;
  otherPayments: number;
  tips: number;
  cardTips?: number;
  cashTips?: number;
  expenses: CashExpenseItem[];
  totalExpenses: number;
  movements: CashMovementItem[];
  totalMovements: number; // ingresos positivos, retiros negativos
  initialCash: number;
  finalRemainingCash: number; // initialCash + cashPayments - totalExpenses + totalMovements
  cashCountId?: string;
  isClosed?: boolean;
  openedAt?: string;
  closedAt?: string;
  realLeftover?: number;
  systemCardPayments?: number;
  systemCashPayments?: number;
  userCardPayments?: number;
  userCashLeftover?: number;
  userCashPayments?: number;
  hasApiPermissions: boolean;
  lastSyncedAt: string;
  error?: string;
}


