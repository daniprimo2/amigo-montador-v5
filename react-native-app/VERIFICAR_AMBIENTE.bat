@echo off
echo ================================
echo    VERIFICACAO DO AMBIENTE
echo ================================
echo.

echo 1. Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js OK
)
echo.

echo 2. Verificando Java...
java -version
if %errorlevel% neq 0 (
    echo ❌ Java nao encontrado
    echo Baixe JDK 11 em: https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html
    pause
    exit /b 1
) else (
    echo ✅ Java OK
)
echo.

echo 3. Verificando ANDROID_HOME...
if "%ANDROID_HOME%"=="" (
    echo ❌ ANDROID_HOME nao configurado
    echo Configure: ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    pause
    exit /b 1
) else (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
)
echo.

echo 4. Verificando emulador Android...
adb devices
if %errorlevel% neq 0 (
    echo ❌ ADB nao encontrado - Android Studio nao instalado?
    pause
    exit /b 1
) else (
    echo ✅ ADB OK - Verifique se mostra um dispositivo acima
)
echo.

echo 5. Verificando pasta do projeto...
if exist "package.json" (
    echo ✅ Pasta do projeto OK
) else (
    echo ❌ Execute este script dentro da pasta react-native-app
    pause
    exit /b 1
)
echo.

echo 6. Verificando node_modules...
if exist "node_modules" (
    echo ✅ Dependencias instaladas
) else (
    echo ⚠️  Dependencias nao instaladas
    echo Execute: npm install
)
echo.

echo ================================
echo    AMBIENTE VERIFICADO!
echo ================================
echo.
echo Se tudo estiver OK, execute:
echo npm run android
echo.
pause