// src/app/api/auth/pin/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'fudo_app_auth';

function getValidToken(): string {
  const pin = process.env.APP_ACCESS_PIN || '';
  const secret = process.env.CRON_SECRET || 'fudo_salt';
  return Buffer.from(`${pin}:${secret}`).toString('base64');
}

export async function GET(request: NextRequest) {
  const pinConfigured = !!process.env.APP_ACCESS_PIN && process.env.APP_ACCESS_PIN.trim().length > 0;

  if (!pinConfigured) {
    return NextResponse.json({ authenticated: true, pinRequired: false });
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  const isValid = cookie?.value === getValidToken();

  return NextResponse.json({
    authenticated: isValid,
    pinRequired: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    const expectedPin = process.env.APP_ACCESS_PIN;

    if (!expectedPin || pin === expectedPin) {
      const response = NextResponse.json({ success: true, message: 'Autenticado' });
      response.cookies.set({
        name: COOKIE_NAME,
        value: getValidToken(),
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 días
      });
      return response;
    }

    return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Error procesando solicitud' }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada' });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
