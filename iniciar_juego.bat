@echo off
cd /d "%~dp0"
echo Abriendo La torre de Vela en http://localhost:8000 (cerra esta ventana para parar)
start "" http://localhost:8000/index.html
python -m http.server 8000
