@echo off
taskkill /F /IM python.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: 방화벽 규칙 등록 (이미 있으면 무시)
netsh advfirewall firewall show rule name="SupplierEval" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="SupplierEval" dir=in action=allow protocol=TCP localport=5000 >nul
)

:: 서버 시작
start "SupplierEval" /d "C:\Users\Admin\Desktop\ai 샘플\supplier-eval" "C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe" "C:\Users\Admin\Desktop\ai 샘플\supplier-eval\app.py"
timeout /t 4 /nobreak >nul

:: 로컬 브라우저 열기
start http://localhost:5000

:: 네트워크 IP 출력
echo.
echo ====================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169"') do (
    set ip=%%a
    goto :found
)
:found
set ip=%ip: =%
echo  [로컬]    http://localhost:5000
echo  [네트워크] http://%ip%:5000
echo  다른 PC에서 위 네트워크 주소로 접속하세요.
echo ====================================
echo.
pause