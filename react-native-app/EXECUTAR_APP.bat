@echo off
echo ========================================
echo EXECUTANDO AMIGOMONTADOR REACT NATIVE
echo ========================================
echo.

echo 1. Verificando emulador...
adb devices
echo.

echo 2. Limpando arquivos problematicos...
if exist react-native.config.js del react-native.config.js
if exist metro.config.js del metro.config.js
echo.

echo 3. Instalando dependencias (se necessario)...
if not exist node_modules (
    echo Instalando dependencias...
    npm install --legacy-peer-deps
)
echo.

echo 4. Executando aplicativo...
echo Aguarde enquanto o app e compilado e instalado...
npm run android

echo.
echo ========================================
echo Se o app nao abriu, tente:
echo npx react-native run-android --verbose
echo ========================================
pause