import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'fudo_app_auth';

function getExpectedToken(): string | null {
  const pin = process.env.APP_ACCESS_PIN?.trim();
  if (!pin) return null; // Sin PIN configurado en el servidor, acceso no restringido
  const secret = process.env.CRON_SECRET || 'fudo_salt';
  return btoa(`${pin}:${secret}`);
}

export function middleware(request: NextRequest) {
  const expectedToken = getExpectedToken();

  // Si no hay PIN configurado en las variables de entorno, permitimos el paso
  if (!expectedToken) {
    return NextResponse.next();
  }

  // 1. Verificar cookie de autenticación
  const authCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (authCookie && authCookie === expectedToken) {
    return NextResponse.next();
  }

  // 2. Verificar header Authorization (para tests automatizados o llamadas programáticas)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (bearerToken === expectedToken) {
      return NextResponse.next();
    }
  }

  // 3. Denegar acceso no autenticado
  return NextResponse.json(
    {
      error: 'Acceso no autorizado. Se requiere autenticación con PIN.',
      pinRequired: true,
    },
    { status: 401 }
  );
}

export const config = {
  matcher: ['/api/fudo/:path*', '/api/reports/:path*'],
};
