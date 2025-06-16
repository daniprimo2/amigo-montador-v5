@echo off
echo ================================
echo VERIFICACAO DO AMBIENTE ANDROID
echo ================================
echo.

echo 1. Verificando Node.js...
node --version
npm --version
echo.

echo 2. Verificando Java...
java -version
echo.

echo 3. Verificando Android SDK...
if exist "%ANDROID_HOME%" (
    echo ANDROID_HOME configurado: %ANDROID_HOME%
) else (
    echo ERRO: ANDROID_HOME nao configurado!
)
echo.

echo 4. Verificando ADB...
adb version
echo.

echo 5. Verificando emuladores...
adb devices
echo.

echo 6. Verificando estrutura do projeto...
if exist package.json (
    echo package.json: OK
) else (
    echo ERRO: package.json nao encontrado!
)

if exist android (
    echo Pasta android: OK
) else (
    echo ERRO: Pasta android nao encontrada!
)

if exist src (
    echo Pasta src: OK
) else (
    echo ERRO: Pasta src nao encontrada!
)
echo.

echo ================================
echo VERIFICACAO CONCLUIDA
echo ================================
pause