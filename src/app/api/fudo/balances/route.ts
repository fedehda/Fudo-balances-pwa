// src/app/api/fudo/balances/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchFudoBalances } from '@/lib/fudo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const result = await fetchFudoBalances(forceRefresh);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Fallback-Mode': result.isFallback ? 'true' : 'false',
      },
    });
  } catch (error) {
    console.error('Error in /api/fudo/balances:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor al procesar saldos de Fudo.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
