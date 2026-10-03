@echo off
setlocal
cd /d "%~dp0"
title Fudo Saldos y WhatsApp PWA - Servidor Local

echo ===================================================
echo     FUDO SALDOS Y WHATSAPP PWA - WINDOWS 10
echo ===================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto err_node

echo [OK] Node.js detectado:
node -v
echo.

if not exist "package.json" goto err_package

if not exist ".env.local" goto create_env
:after_env

if not exist "node_modules\" goto install_deps
:after_deps

echo ===================================================
echo   Iniciando aplicacion en http://localhost:3000
echo   Abriendo tu navegador web...
echo ===================================================
echo.
echo Presiona Ctrl + C en esta ventana para detener la app.
echo.

start "" http://localhost:3000

call npm.cmd run dev

echo.
echo El servidor se ha detenido.
pause
exit /b 0

:create_env
echo [INFO] Creando archivo .env.local...
copy .env.example .env.local >nul
echo [OK] Archivo .env.local creado.
echo.
goto after_env

:install_deps
echo [INFO] Primera ejecucion: Instalando dependencias de Node.js...
echo Esto puede demorar 1 o 2 minutos...
call npm.cmd install
if errorlevel 1 goto err_install
echo [OK] Dependencias instaladas con exito.
echo.
goto after_deps

:err_node
echo.
echo [ERROR] Node.js no esta instalado en este equipo.
echo Por favor descarga e instala Node.js LTS gratis desde:
echo https://nodejs.org/
echo.
echo Presiona cualquier tecla para salir...
pause >nul
exit /b 1

:err_package
echo.
echo ========================================================
echo [ERROR] No se encontro el archivo package.json aqui.
echo ========================================================
echo.
echo Esto suele ocurrir si:
echo 1. Copiaste unicamente el archivo .bat en lugar de toda la carpeta.
echo 2. Abriste el .bat directamente desde un archivo ZIP sin extraerlo antes.
echo.
echo SOLUCION:
echo 1. Si descargaste un archivo ZIP, hazle clic derecho y elige "Extraer todo".
echo 2. Abre la carpeta descomprimida y ejecuta iniciar-fudo.bat desde ahi dentro.
echo.
pause
exit /b 1

:err_install
echo.
echo [ERROR] No se pudieron instalar las dependencias con npm.
echo Revisa tu conexion a internet e intenta nuevamente.
echo.
pause
exit /b 1
