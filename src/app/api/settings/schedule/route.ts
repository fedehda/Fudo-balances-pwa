// src/app/api/settings/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getScheduleConfig, saveScheduleConfig } from '@/lib/storage';
import { ScheduledReportConfig } from '@/types/fudo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getScheduleConfig();
    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error fetching schedule config:', error);
    return NextResponse.json(
      { error: 'Error al recuperar configuración de envío programado.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ScheduledReportConfig>;

    // Validaciones básicas
    if (body.targetTime && !/^\d{2}:\d{2}$/.test(body.targetTime)) {
      return NextResponse.json(
        { error: 'El formato de hora debe ser HH:mm (24 horas).' },
        { status: 400 }
      );
    }

    const updated = await saveScheduleConfig(body);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error saving schedule config:', error);
    return NextResponse.json(
      { error: 'Error al guardar configuración de envío programado.' },
      { status: 500 }
    );
  }
}
