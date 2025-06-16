@echo off
echo Removendo arquivos problematicos...

:: Deletar arquivo de configuracao problematico
if exist react-native.config.js del react-native.config.js

:: Deletar metro.config.js se existir
if exist metro.config.js del metro.config.js

:: Limpar node_modules
if exist node_modules rmdir /s /q node_modules

:: Limpar cache npm
npm cache clean --force

:: Reinstalar dependencias
npm install --legacy-peer-deps

echo.
echo Configuracao limpa! Executando app...
npm run android