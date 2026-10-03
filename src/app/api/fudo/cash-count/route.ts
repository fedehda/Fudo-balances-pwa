// src/app/api/fudo/cash-count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchCashCountReport } from '@/lib/fudo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || undefined;
    const shiftParam = (searchParams.get('shift') as 'auto' | 'dinner' | 'lunch' | 'full') || 'auto';
    const initialCashParam = searchParams.get('initialCash');
    const customInitialCash = initialCashParam !== null && !isNaN(Number(initialCashParam))
      ? Number(initialCashParam)
      : undefined;

    const data = await fetchCashCountReport(dateParam, shiftParam, customInitialCash);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error al obtener reporte de arqueo';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
