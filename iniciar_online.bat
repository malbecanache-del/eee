@echo off
cd /d "%~dp0"
echo La torre de Vela ONLINE en http://localhost:8000 (cerra esta ventana para parar)
start "" http://localhost:8000
node server.js
