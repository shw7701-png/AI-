# AI 샘플

매일 오전 7시 KST (UTC+9) LLM & 생성AI 동향 브리핑 자동화 프로젝트

## 브리핑 구성

1. 오늘의 핵심 뉴스 Top 3
2. 주목 트렌드
3. 주목할 도구 & 서비스
4. 오늘의 추천 읽을거리

결과물은 `briefings/YYYY-MM-DD.html` 형식으로 저장되며 자동으로 이 레포에 커밋됩니다.

## 사전 요구사항

- [Claude Code](https://claude.ai/code) 데스크탑 앱 설치
- [GitHub CLI](https://cli.github.com/) 설치 및 `gh auth login` 완료
- Git 설치 및 이 레포 클론

## 스케줄 태스크 설치 방법

1. 이 레포를 클론합니다:
   ```
   git clone https://github.com/shw7701-png/AI-.git "C:\Users\Admin\Desktop\ai 샘플"
   ```
2. Claude Code 앱을 열고, `scheduled-tasks/daily-ai-briefing/SKILL.md` 내용을 스케줄 태스크로 등록합니다.
3. Windows 작업 스케줄러에 Claude Code 자동 실행을 등록합니다 (아래 참고).

## Windows 작업 스케줄러 등록 (앱 자동 실행)

PowerShell을 관리자 권한으로 열고 아래 명령을 실행하세요:

```powershell
$action = New-ScheduledTaskAction -Execute "explorer.exe" -Argument "shell:AppsFolder\Claude_pzs8sxrjxfjjc!Claude"
$trigger = New-ScheduledTaskTrigger -Daily -At "06:55AM"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "Claude Code - AI 브리핑 자동 실행" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
```

## 실행 제약 사항

- Claude Code 앱이 열려 있어야 스케줄 태스크가 실행됩니다.
- 위 작업 스케줄러를 등록하면 매일 오전 6:55에 앱이 자동으로 실행됩니다.
- PC가 꺼져 있으면 다음 앱 실행 시 브리핑이 실행됩니다.

## 시간대

모든 스케줄은 **KST (UTC+9)** 기준입니다. 시스템 시간대 확인:
```powershell
Get-TimeZone
```

## 브리핑 파일 확인

`briefings/` 폴더에 날짜별 HTML 파일이 쌓입니다. 브라우저로 열어 확인하세요.
