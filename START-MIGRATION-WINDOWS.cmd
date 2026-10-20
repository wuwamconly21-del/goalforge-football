@echo off
setlocal
cd /d "%~dp0"
title GoalForge - Cloudflare Migration
echo GoalForge: pindahkan Netlify ke Cloudflare
echo Baca WINDOWS-MIGRATION.md sebelum mula.
echo.
where node >nul 2>nul
if errorlevel 1 goto missingnode
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 goto missingnode
echo Memasang dependencies. Ini mungkin mengambil beberapa minit...
call npm ci
if errorlevel 1 goto failed
call npm exec --yes --package=netlify-cli@27.14.0 -- node migration/windows-migrate.mjs
if errorlevel 1 goto failed
echo.
echo Selesai. Alamat Cloudflare dipaparkan di atas.
pause
exit /b 0
:missingnode
echo Pasang Node.js 24 dahulu dari https://nodejs.org/en/download
echo Kemudian tutup tetingkap ini dan buka pelancar semula.
pause
exit /b 1
:failed
echo.
echo Proses berhenti. Baca mesej terakhir di atas.
echo Jangan padam folder .migration-private atau kongsi kandungannya.
pause
exit /b 1
