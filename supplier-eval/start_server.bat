@echo off
echo [공급업체 평가 관리 시스템 시작]
cd /d "C:\Users\Admin\Desktop\ai 샘플\supplier-eval"
start "" "C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe" app.py
timeout /t 2 /nobreak >nul
start "" "http://localhost:5000"
