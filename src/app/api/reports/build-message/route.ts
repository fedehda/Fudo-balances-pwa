// src/app/api/reports/build-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchFudoBalances } from '@/lib/fudo';
import { buildWhatsAppMessage } from '@/lib/whatsapp';
import { BuildMessageRequest } from '@/types/fudo';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BuildMessageRequest;
    const { selectedSupplierIds = [], includeUpcomingExpenses = true, selectedCategoryIds } = body;

    // Obtenemos los saldos actuales (usa la caché de 10 min si está disponible)
    const { suppliers, upcomingExpenses } = await fetchFudoBalances(false);

    const { formattedText, totalSelectedDebt, selectedCount, expensesCount } = buildWhatsAppMessage({
      suppliers,
      upcomingExpenses,
      selectedSupplierIds,
      includeUpcomingExpenses,
      selectedCategoryIds,
    });

    return NextResponse.json({
      formattedText,
      totalSelectedDebt,
      selectedCount,
      expensesCount,
    });
  } catch (error) {
    console.error('Error in /api/reports/build-message:', error);
    return NextResponse.json(
      {
        error: 'Error al formatear mensaje de reporte.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
