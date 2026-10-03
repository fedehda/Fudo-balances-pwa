// src/app/api/fudo/daily-movements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchDailyMovements } from '@/lib/fudo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || undefined;
    const methodParam = searchParams.get('method') || undefined;

    const data = await fetchDailyMovements(dateParam, methodParam);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido al consultar movimientos';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
