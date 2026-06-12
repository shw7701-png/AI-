@echo off
echo [공급업체 평가 자동화 스케줄러 등록]
echo.

schtasks /create /tn "SupplierEvalScheduler" /tr "\"C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe\" \"C:\Users\Admin\Desktop\ai 샘플\supplier-eval\scheduler.py\"" /sc DAILY /st 08:00 /ru "%USERNAME%" /f

if %errorlevel%==0 (
    echo.
    echo [성공] 매일 오전 08:00 자동 실행 등록 완료
    echo 작업명: SupplierEvalScheduler
) else (
    echo.
    echo [실패] 관리자 권한으로 다시 실행해 주세요.
    echo 파일을 우클릭 ^> 관리자 권한으로 실행
)
echo.
pause
