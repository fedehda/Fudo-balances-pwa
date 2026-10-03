# 📱 Fudo Saldos & WhatsApp PWA

Módulo web mobile-first y Progressive Web App (PWA) desarrollado con **Next.js 15 (App Router)**, **TypeScript**, y **Tailwind CSS 4**. Permite auditar saldos adeudados a proveedores, monitorear vencimientos de facturas y generar el **Arqueo de Caja del Turno** directamente desde la API de Fudo, consolidando información clave para su despacho ágil por **WhatsApp**.

---

## 🚀 Características Principales

### 1. 📊 Auditoría de Saldos a Proveedores
- **Sincronización en tiempo real**: Consulta `/suppliers` y `/expenses?status=pending` en el servidor manteniendo protegidas las credenciales.
- **Selección granular**: Buscador interactivo, selección individual y botones de acción rápida (*Tildar todos* / *Destildar todos*).
- **Subtotales dinámicos**: Cálculo instantáneo de deuda total y seleccionada.
- **Gestión de vencimientos**: Acordeón con facturas pendientes, filtros por categorías de gasto de Fudo y opción de inclusión en el mensaje.

### 2. 🧾 Arqueo de Caja del Turno
- **Detección automática de turno**:
  - Prioridad 1: Detección de turno abierto en curso en Fudo (`closedAt === null`) con indicador visual pulsante.
  - Prioridad 2: Cálculo inteligente según horario de Salta (GMT-3) alternando entre Almuerzo y Cena.
- **Desglose de métricas KPI**:
  - Venta total y montos cobrados por medio de pago (Efectivo, Tarjetas / Payway, Propinas con desglose digital/efectivo).
  - Total de Egresos consolidado (gastos de caja + retiros de socios/caja).
- **Valores finales declarados por el usuario**:
  - Permite contrastar y ajustar montos reales declarados frente a los valores registrados en el sistema, mostrando el valor del sistema tachado para control de diferencias.
- **Movimientos manuales**:
  - Registro ágil de retiros e ingresos eventuales de caja durante el turno.

### 3. 💬 Despacho WhatsApp Dual
- **Manual (wa.me)**: Generación de deep-link nativo con formato profesional enriquecido (negritas, viñetas, totales) listo para enviar desde WhatsApp Web o la App móvil.
- **Programado (Cron desatendido)**: Integración opcional con proveedores de mensajería (Evolution API / Meta Cloud API) para despachos automáticos en segundo plano a la hora configurada.
- **Contactos frecuentes**: Guardado y administración local de destinatarios frecuentes con formato internacional E.164.

### 4. 🔒 Seguridad y Control de Acceso
- **Middleware en Backend**: Rutas críticas `/api/fudo/*` y `/api/reports/*` protegidas con verificación de sesión (`fudo_app_auth`) o token Bearer.
- **Pantalla de bloqueo con PIN**: Acceso restringido por PIN de 4 dígitos configurable.
- **Protección contra fuerza bruta**: Bloqueo temporal (lockout) de 30 segundos tras 5 intentos fallidos consecutivos.
- **Ocultamiento de credenciales**: En modo producción no se revelan sugerencias de PIN en la interfaz.

### 5. 📱 PWA & Accesibilidad (WCAG 2.1 AA)
- Instalable como aplicación nativa en iOS (Safari "Agregar a Inicio") y Android (Chrome PWA).
- Service Worker precacheado con estrategia *Network-First* y soporte de navegación offline.
- Totalmente navegable mediante teclado físico (<kbd>Tab</kbd>, <kbd>Espacio</kbd>, <kbd>Enter</kbd>) y compatible con lectores de pantalla (roles ARIA, estados dinámicos).
- Optimizado para evitar el auto-zoom indeseado en dispositivos móviles.

---

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Lenguaje**: [TypeScript 5](https://www.typescriptlang.org/)
- **Estilos**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Iconos**: [Lucide React](https://lucide.dev/)
- **PWA**: Service Worker nativo + Web App Manifest

---

## ⚙️ Configuración (`.env.local`)

Copia la plantilla `.env.example` para crear tu entorno local:

```bash
cp .env.example .env.local
```

Configura las siguientes variables:

```env
# Credenciales API Fudo (Requeridas)
FUDO_API_KEY=tu_api_key
FUDO_API_SECRET=tu_api_secret
FUDO_API_URL=https://api.fu.do/v1

# Seguridad interna para Cron Handlers
CRON_SECRET=clave_secreta_para_proteger_endpoints

# PIN de 4 dígitos para acceder a la aplicación
APP_ACCESS_PIN=1234

# Opcional: Integración WhatsApp desatendida en segundo plano
WHATSAPP_API_URL=https://tu-instancia-evolution.com
WHATSAPP_API_TOKEN=tu_token_evolution
WHATSAPP_INSTANCE_NAME=instancia_principal
```

> [!NOTE]
> Si no configuras las credenciales de Fudo inicialmente, la aplicación funcionará automáticamente en **Modo Simulación / Demo** para permitir evaluar la interfaz y los flujos.

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/fudo-balances-pwa.git
cd fudo-balances-pwa
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar en modo desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 4. Compilar para producción
```bash
npm run build
npm run start
```

### 5. En Windows (1 Clic)
El proyecto incluye un script listo para ejecutar sin abrir consolas:
- Haz doble clic en **`iniciar-fudo.bat`** para instalar, compilar y abrir la aplicación en tu navegador de forma automática.

---

## 🧪 Pruebas y Control de Calidad

```bash
# Verificación de linter (ESLint)
npm run lint

# Verificación de tipos TypeScript
npx tsc --noEmit

# Suite completa de pruebas End-to-End y seguridad de API
npm run test:e2e
```

---

## 📡 Endpoints de Backend

| Método | Endpoint | Autenticación | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/fudo/balances` | 🔒 PIN / Cookie | Normaliza y devuelve saldos y vencimientos pendientes. Soporta `?refresh=true`. |
| `GET` | `/api/fudo/cash-count` | 🔒 PIN / Cookie | Calcula el arqueo de caja del turno (Almuerzo / Cena / Auto). |
| `POST` | `/api/reports/build-message` | 🔒 PIN / Cookie | Genera el texto consolidado y formateado para WhatsApp. |
| `GET` | `/api/settings/schedule` | Público local | Lee la configuración de envíos automáticos. |
| `POST` | `/api/settings/schedule` | Público local | Guarda la programación del reporte automático. |
| `GET` | `/api/cron/send-report` | 🔑 Bearer Token | Invocado por cron jobs. Parámetro `?force=true` para prueba forzada. |
| `POST` | `/api/auth/pin` | Libre | Valida el PIN y emite la cookie segura `fudo_app_auth`. |

---

## ☁️ Despliegue en la Nube (Vercel)

1. Sube tu código a un repositorio privado en **GitHub**.
2. Importa el proyecto en [Vercel](https://vercel.com).
3. En la sección **Settings > Environment Variables**, carga las variables definidas en `.env.local` (`FUDO_API_KEY`, `FUDO_API_SECRET`, `APP_ACCESS_PIN`, `CRON_SECRET`).
4. Vercel ejecutará automáticamente el cron programado (`vercel.json`) para envíos periódicos.

---

## 📄 Licencia

Este proyecto es de uso privado y comercial interno. Todos los derechos reservados.

