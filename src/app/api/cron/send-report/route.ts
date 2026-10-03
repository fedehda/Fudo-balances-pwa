// src/app/api/cron/send-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getScheduleConfig, saveScheduleConfig } from '@/lib/storage';
import { fetchFudoBalances } from '@/lib/fudo';
import { buildWhatsAppMessage, dispatchAutomatedWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');
    const forceExecute = searchParams.get('force') === 'true';

    // Validación de seguridad CRON_SECRET si está configurado
    if (cronSecret && cronSecret !== 'token_secreto_para_proteger_endpoints') {
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;
      const isQueryValid = querySecret === cronSecret;

      if (!isBearerValid && !isQueryValid) {
        return NextResponse.json(
          { error: 'No autorizado. Se requiere CRON_SECRET válido.' },
          { status: 401 }
        );
      }
    }

    // 1. Obtener configuración guardada
    const config = await getScheduleConfig();

    if (!config.enabled && !forceExecute) {
      return NextResponse.json({
        status: 'skipped',
        reason: 'La automatización de reportes se encuentra deshabilitada (enabled: false).',
      });
    }

    if (!config.targetPhone) {
      return NextResponse.json({
        status: 'error',
        reason: 'No hay un número de teléfono de destino configurado.',
      }, { status: 400 });
    }

    // 2. Evaluar hora actual en zona horaria America/Argentina/Salta
    const formatter = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Salta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const currentHour = parts.find((p) => p.type === 'hour')?.value || '00';
    const currentMinute = parts.find((p) => p.type === 'minute')?.value || '00';
    const currentTimeStr = `${currentHour}:${currentMinute}`;

    // Chequeo de ventana horaria: si no es forzado, verificamos si coincide la hora
    if (!forceExecute && config.targetTime) {
      const [targetH, targetM] = config.targetTime.split(':').map(Number);
      const [currH, currM] = [Number(currentHour), Number(currentMinute)];

      const targetTotalMinutes = targetH * 60 + targetM;
      const currentTotalMinutes = currH * 60 + currM;

      // Tolerancia de 30 minutos para crons por hora (o coincidencia exacta si es cada minuto)
      const diffMinutes = Math.abs(currentTotalMinutes - targetTotalMinutes);
      const isWithinWindow = diffMinutes <= 30 || Math.abs(diffMinutes - 1440) <= 30;

      if (!isWithinWindow) {
        return NextResponse.json({
          status: 'skipped',
          reason: `Fuera de ventana horaria. Hora actual en Salta: ${currentTimeStr}, hora objetivo: ${config.targetTime}`,
          currentTimeSalta: currentTimeStr,
          targetTime: config.targetTime,
        });
      }
    }

    // 3. Consultar saldos en Fudo
    const { suppliers, upcomingExpenses } = await fetchFudoBalances(true);

    // 4. Determinar proveedores a incluir según criterio
    const supplierIdsToInclude = config.autoSelectAll
      ? suppliers.map((s) => s.id)
      : (config.selectedSupplierIds && config.selectedSupplierIds.length > 0
          ? config.selectedSupplierIds
          : suppliers.map((s) => s.id));

    // 5. Construir mensaje consolidado
    const { formattedText, totalSelectedDebt, selectedCount } = buildWhatsAppMessage({
      suppliers,
      upcomingExpenses,
      selectedSupplierIds: supplierIdsToInclude,
      includeUpcomingExpenses: true,
    });

    // 6. Despachar mensaje vía WhatsApp
    const dispatchResult = await dispatchAutomatedWhatsApp({
      phone: config.targetPhone,
      text: formattedText,
    });

    // 7. Guardar registro de ejecución en persistencia
    const nowISO = new Date().toISOString();
    await saveScheduleConfig({
      lastRunAt: nowISO,
      lastRunStatus: dispatchResult.success ? 'success' : 'failed',
      lastRunMessage: dispatchResult.message,
    });

    return NextResponse.json({
      status: dispatchResult.success ? 'success' : 'failed',
      timestamp: nowISO,
      currentTimeSalta: currentTimeStr,
      targetPhone: config.targetPhone,
      selectedCount,
      totalSelectedDebt,
      dispatch: dispatchResult,
      messagePreview: formattedText,
    });
  } catch (error) {
    console.error('Error in /api/cron/send-report:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);

    await saveScheduleConfig({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'failed',
      lastRunMessage: `Excepción interna: ${errorMsg}`,
    });

    return NextResponse.json(
      {
        status: 'error',
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
