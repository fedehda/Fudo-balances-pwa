// test-endpoints.mjs
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function runTests() {
  console.log('--- Iniciando Verificación de Endpoints Fudo & WhatsApp ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Seguridad: GET /api/fudo/balances sin autenticación debe retornar 401
    console.log('\n1. Testeando Seguridad: GET /api/fudo/balances sin auth (debe retornar 401)...');
    const unauthRes = await fetch(`${BASE_URL}/api/fudo/balances`);
    assert(unauthRes.status === 401, `Status HTTP 401 sin credenciales (actual: ${unauthRes.status})`);

    // 2. Test Autenticación: POST /api/auth/pin con PIN por defecto
    console.log('\n2. Testeando POST /api/auth/pin...');
    const pinRes = await fetch(`${BASE_URL}/api/auth/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: process.env.APP_ACCESS_PIN || '1234' }),
    });
    assert(pinRes.status === 200, `Status HTTP 200 autenticación exitosa (actual: ${pinRes.status})`);
    
    // Extraer cookie fudo_app_auth del header Set-Cookie
    const setCookieHeader = pinRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookieHeader.match(/fudo_app_auth=([^;]+)/);
    const authCookie = cookieMatch ? `fudo_app_auth=${cookieMatch[1]}` : '';
    assert(authCookie.length > 0, 'Cookie fudo_app_auth obtenida correctamente');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Cookie': authCookie,
    };

    // 3. Test GET /api/fudo/balances autenticado
    console.log('\n3. Testeando GET /api/fudo/balances con autenticación...');
    const balancesRes = await fetch(`${BASE_URL}/api/fudo/balances`, {
      headers: { 'Cookie': authCookie },
    });
    assert(balancesRes.status === 200, `Status HTTP 200 (actual: ${balancesRes.status})`);
    const balancesData = await balancesRes.json();
    assert(Array.isArray(balancesData.suppliers), 'Contiene array de suppliers');
    assert(balancesData.suppliers.length > 0, `Suppliers encontrados: ${balancesData.suppliers.length}`);
    assert(balancesData.suppliers.every(s => s.balance > 0), 'Todos los proveedores tienen saldo mayor a cero');
    assert(Array.isArray(balancesData.upcomingExpenses), 'Contiene array de upcomingExpenses');
    assert(typeof balancesData.totalDebt === 'number' && balancesData.totalDebt > 0, `Total Debt calculado: ${balancesData.totalDebt}`);
    assert(typeof balancesData.lastSyncedAt === 'string', `Timestamp sincronización: ${balancesData.lastSyncedAt}`);

    const supp1 = balancesData.suppliers[0];
    const supp2 = balancesData.suppliers[1];

    // 4. Test POST /api/reports/build-message
    console.log('\n4. Testeando POST /api/reports/build-message...');
    const buildRes = await fetch(`${BASE_URL}/api/reports/build-message`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        selectedSupplierIds: [supp1.id, supp2.id],
        includeUpcomingExpenses: true,
      }),
    });
    assert(buildRes.status === 200, `Status HTTP 200 (actual: ${buildRes.status})`);
    const buildData = await buildRes.json();
    assert(typeof buildData.formattedText === 'string', 'Mensaje formateado recibido');
    assert(buildData.formattedText.includes('ESTADO DE CUENTA - PROVEEDORES'), 'Contiene encabezado de estado de cuenta');
    assert(buildData.formattedText.includes(supp1.name), `Contiene nombre del proveedor 1 (${supp1.name})`);
    assert(buildData.formattedText.includes(supp2.name), `Contiene nombre del proveedor 2 (${supp2.name})`);
    assert(buildData.formattedText.includes('Total Consolidado:'), 'Contiene Total Consolidado');
    assert(buildData.totalSelectedDebt === supp1.balance + supp2.balance, `Total seleccionado exacto: ${buildData.totalSelectedDebt}`);
    console.log('\nTexto Formateado Generado:\n' + buildData.formattedText);

    // 5. Test POST /api/settings/schedule
    console.log('\n5. Testeando POST /api/settings/schedule...');
    const testPhone = '5493874998877';
    const testTime = '10:30';
    const saveRes = await fetch(`${BASE_URL}/api/settings/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        targetPhone: testPhone,
        targetTime: testTime,
        autoSelectAll: true,
      }),
    });
    assert(saveRes.status === 200, `Status HTTP 200 (actual: ${saveRes.status})`);
    const savedConfig = await saveRes.json();
    assert(savedConfig.enabled === true, 'enabled guardado como true');
    assert(savedConfig.targetPhone === testPhone, `targetPhone guardado como ${testPhone}`);
    assert(savedConfig.targetTime === testTime, `targetTime guardado como ${testTime}`);

    // 6. Test GET /api/settings/schedule
    console.log('\n6. Testeando GET /api/settings/schedule...');
    const getScheduleRes = await fetch(`${BASE_URL}/api/settings/schedule`);
    assert(getScheduleRes.status === 200, 'Status HTTP 200');
    const readConfig = await getScheduleRes.json();
    assert(readConfig.targetPhone === testPhone, 'Persistencia verificada por GET');

    // 7. Test GET /api/cron/send-report
    console.log('\n7. Testeando GET /api/cron/send-report (ejecución forzada)...');
    const cronRes = await fetch(`${BASE_URL}/api/cron/send-report?force=true`);
    assert(cronRes.status === 200, `Status HTTP 200 (actual: ${cronRes.status})`);
    const cronData = await cronRes.json();
    assert(cronData.status === 'success', `Resultado exitoso: ${cronData.status}`);
    assert(typeof cronData.currentTimeSalta === 'string', `Hora en Salta detectada: ${cronData.currentTimeSalta}`);
    assert(cronData.dispatch && cronData.dispatch.success === true, 'Despacho reportado exitoso');

    console.log(`\n================================`);
    console.log(`Resultados Finales: ${passed} PASSED | ${failed} FAILED`);
    console.log(`================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error durante la ejecución del test:', err);
    process.exit(1);
  }
}

runTests();
