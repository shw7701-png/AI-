# SETUP: ai-briefing-agent 설치 및 실행 가이드

이 가이드를 따라 30분 내 ai-briefing-agent를 설정하고 매일 오전 7시 자동 브리핑 생성을 시작하세요.

## 요구사항

- **Claude Code 데스크탑 앱**: v2.1.32 이상
- **GitHub CLI**: `gh auth login` 완료
- **Git**: 커밋 서명 설정 완료

## 설치 절차

### 1단계: 저장소 클론

```powershell
git clone https://github.com/your-org/ai-briefing-agent.git
cd ai-briefing-agent
```

### 2단계: Claude Code 데스크탑 앱에서 프로젝트 폴더 열기

1. Claude Code 데스크탑 앱 실행
2. **Open Folder** 클릭
3. 프로젝트 디렉토리(`ai-briefing-agent`) 선택
4. Claude Code 채팅이 열리면 프로젝트 로드 완료

### 3단계: GitHub CLI 인증 확인

GitHub 연동이 필요합니다:

```powershell
gh auth login
```

프롬프트에 따라:
- GitHub.com 선택 (호스트)
- HTTPS 프로토콜 선택
- Personal access token 또는 웹 로그인 완료

인증 확인:

```powershell
gh auth status
```

### 4단계: 스케줄 태스크 확인

Claude Code 채팅에서 다음 명령 입력:

```
/scheduled-tasks
```

목록에 **daily-ai-briefing**이 보이면 이미 활성화된 상태입니다. 보이지 않으면 `/daily-ai-briefing` 명령으로 수동 생성 가능합니다.

### 5단계: 수동 테스트 실행

설정 확인을 위해 한 번 수동으로 실행하세요:

```
/daily-ai-briefing
```

완료 후:
- `briefings/` 폴더에 **YYYY-MM-DD.html** 파일 생성 확인
- GitHub에 자동 커밋되었는지 확인 (`git log` 또는 GitHub 웹사이트)

## 하네스 구조 개요

### 서브에이전트 (자동 위임)

| 에이전트 | 역할 |
|---------|------|
| **news-collector** | LLM·AI 관련 뉴스 수집 (웹 검색) |
| **git-publisher** | 생성된 브리핑을 파일로 저장 및 git 커밋·푸시 |
| **project-reviewer** | 프로젝트 상태 검토 및 GitHub 이슈 등록 |

### 출력물

- **briefings/** 폴더: 날짜별 HTML 파일 저장
- 각 브리핑에는 와이어로프 구매 담당자 기준 우선순위별 뉴스 정렬 및 Action Point 포함

## 수동 실행 스킬

### /review-and-issue

프로젝트 코드를 검토하고 개선 사항을 GitHub 이슈로 자동 등록:

```
/review-and-issue
```

### /optimize

3라운드 최적화 루프 (분석 → 이슈 등록 → 해결):

```
/optimize
```

## 트러블슈팅

### push 실패

**증상**: 깃허브 푸시 실패, `briefings/YYYY-MM-DD-error.txt` 파일 생성

**해결**:
- 오류 파일 내용 확인
- Git 인증 상태 재확인: `gh auth status`
- 다음 자동 실행 시 자동 재시도 (별도 조치 불필요)

### 오류 파일 수동 정리

```powershell
Remove-Item briefings/*-error.txt -Force
```

### 스케줄 태스크가 자동 실행되지 않음

**확인 사항**:
- Claude Code 데스크탑 앱이 실행 중인지 확인
- 시스템 시간이 올바른지 확인 (KST 오전 7시)
- `/scheduled-tasks` 로 등록 상태 재확인

**수동 실행으로 테스트**:

```
/daily-ai-briefing
```

## 다음 단계

- 첫 번째 자동 브리핑 생성 예약 (오전 7시)
- `/review-and-issue` 로 초기 프로젝트 검토 실행
- 필요시 CLAUDE.md에서 브리핑 대상 프로필 커스터마이징

## 참고

자세한 프로젝트 구조는 CLAUDE.md를 참조하세요.
