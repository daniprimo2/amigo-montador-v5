@echo off
echo ================================
echo    EXECUTANDO AMIGO MONTADOR
echo ================================
echo.

echo Verificando ambiente...
if not exist "package.json" (
    echo ❌ Execute este script dentro da pasta react-native-app
    pause
    exit /b 1
)

echo.
echo Verificando emulador Android...
adb devices | findstr "emulator"
if %errorlevel% neq 0 (
    echo ❌ Emulador Android nao detectado
    echo Abra o Android Studio e inicie um emulador
    pause
    exit /b 1
) else (
    echo ✅ Emulador detectado
)

echo.
echo Instalando dependencias (se necessario)...
if not exist "node_modules" (
    echo Executando npm install...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependencias
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencias ja instaladas
)

echo.
echo ================================
echo    INICIANDO APP ANDROID...
echo ================================
echo.
echo Aguarde... O app sera instalado no emulador
echo Esse processo pode demorar alguns minutos
echo.

npm run android

if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro ao executar o app
    echo.
    echo Tente estas alternativas:
    echo 1. npx @react-native-community/cli run-android
    echo 2. npx react-native run-android
    echo.
    echo Ou execute a limpeza:
    echo cd android
    echo .\gradlew clean
    echo cd ..
    echo npm run android
)

echo.
echo ================================
echo    PROCESSO CONCLUIDO
echo ================================
pause