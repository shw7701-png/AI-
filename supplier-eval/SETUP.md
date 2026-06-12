# 공급업체 평가 관리 시스템 — 설치 및 실행 가이드

## 1. Python 설치

```powershell
winget install Python.Python.3.11
```
또는 https://python.org 에서 직접 설치 (PATH 추가 옵션 체크 필수)

설치 확인:
```powershell
python --version
```

---

## 2. 의존성 설치

```powershell
cd "C:\Users\Admin\Desktop\ai 샘플\supplier-eval"
pip install -r requirements.txt
```

---

## 3. Gmail 앱 비밀번호 설정

1. https://myaccount.google.com → **보안** → **2단계 인증** 활성화
2. **앱 비밀번호** → 앱: 메일 / 기기: Windows → 16자리 비밀번호 복사
3. `config.json` 수정:

```json
{
  "email": {
    "sender": "실제_gmail계정@gmail.com",
    "app_password": "xxxx xxxx xxxx xxxx",
    "recipients": ["알림받을_이메일@company.com"],
    "alert_days": [90, 60, 30]
  }
}
```

---

## 4. 웹앱 실행

```powershell
cd "C:\Users\Admin\Desktop\ai 샘플\supplier-eval"
python app.py
```

브라우저에서 http://localhost:5000 접속

---

## 5. 테스트 실행

```powershell
cd "C:\Users\Admin\Desktop\ai 샘플\supplier-eval"
pytest tests/ -v
```

---

## 6. Windows Task Scheduler 등록 (자동화)

PowerShell **관리자 권한**으로 실행:

```powershell
$pythonPath = (Get-Command python).Source
$scriptPath = "C:\Users\Admin\Desktop\ai 샘플\supplier-eval\scheduler.py"
$workDir    = "C:\Users\Admin\Desktop\ai 샘플\supplier-eval"

$action   = New-ScheduledTaskAction -Execute $pythonPath -Argument $scriptPath -WorkingDirectory $workDir
$trigger  = New-ScheduledTaskTrigger -Daily -At "08:00AM"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
  -TaskName "SupplierEvalScheduler" `
  -Action   $action `
  -Trigger  $trigger `
  -Settings $settings `
  -RunLevel Highest `
  -Force
```

등록 확인:
```powershell
Get-ScheduledTask -TaskName "SupplierEvalScheduler"
```

수동 실행 테스트:
```powershell
Start-ScheduledTask -TaskName "SupplierEvalScheduler"
```

---

## 7. 사용 흐름

```
① 웹앱 실행: python app.py → http://localhost:5000

② 업체관리 탭 → 공급업체 등록

③ 실적입력 탭 → 업체 선택 → 납기율/부적합율 입력 → 저장
   (직전 데이터 자동불러오기, 실시간 점수 미리보기)

④ Task Scheduler가 매일 08:00 자동 실행:
   - D-90/60/30: 경고 이메일 발송
   - 평가일 도래: 자동 평가 생성 → 이메일 발송

⑤ 평가이력 탭 → 보고서 보기 → 브라우저 인쇄(PDF)
   상단 CSV / Excel / 백업 버튼으로 데이터 내보내기
```

---

## 등급별 재평가 주기

| 등급 | 총점 | 결과 | 재평가 주기 |
|------|------|------|------------|
| A | 90~100 | 승인 | 3년 |
| B | 70~89  | 승인 | 2년 |
| C | 50~69  | 조건부 승인 | 1년 |
| D | 0~49   | 승인불가 | 즉시 재평가 |
