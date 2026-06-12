# ai-briefing-agent

매일 오전 7시 KST LLM & 생성AI 동향 브리핑을 자동 생성·커밋하는 Claude Code 스케줄 태스크 프로젝트.

## 프로젝트 구조

```
.claude/
├── agents/                          # 서브에이전트 (역할별 위임)
│   ├── news-collector.md            # WebSearch/WebFetch 전용, Haiku
│   ├── git-publisher.md             # Write + git 전용, Haiku
│   └── project-reviewer.md         # Read + gh 전용, Haiku
├── rules/                           # 경로별 자동 로드 규칙
│   ├── briefing-format.md           # briefings/** 에만 적용
│   └── git-workflow.md              # 커밋 컨벤션, git 경로 규칙
├── skills/                          # 수동 호출 슬래시 커맨드
│   ├── optimize/SKILL.md            # /optimize: 최적화 루프
│   └── review-and-issue/SKILL.md   # /review-and-issue: 이슈 등록
├── scheduled-tasks/
│   └── daily-ai-briefing/SKILL.md  # 매일 7시 자동 실행
└── settings.local.json              # 권한 설정 + 에이전트 팀 활성화
briefings/                           # 날짜별 HTML 브리핑 출력물
```

## 하네스 구조

이 프로젝트는 Claude Code의 공식 하네스 구성을 따른다.

### 서브에이전트 위임 흐름

```
[daily-ai-briefing 스케줄 태스크]
    ↓ 뉴스 수집 위임
[news-collector] — WebSearch/WebFetch만 허용, Haiku 모델
    ↓ 결과 반환
[Lead] — show_widget으로 HTML 렌더링
    ↓ 저장·커밋 위임
[git-publisher] — Write + git만 허용, Haiku 모델
```

### 에이전트별 역할 및 도구 제한

| 에이전트 | 역할 | 허용 도구 | 모델 |
|---------|------|----------|------|
| `news-collector` | LLM·AI 뉴스 수집 | WebSearch, WebFetch | Haiku |
| `git-publisher` | 파일 저장 + git 커밋·푸시 | Write, git 명령 | Haiku |
| `project-reviewer` | 프로젝트 검토 + 이슈 등록 | Read, Glob, Grep, gh | Haiku |

### 규칙 로드 방식

| 규칙 파일 | 로드 조건 |
|----------|----------|
| `rules/briefing-format.md` | `briefings/**` 파일 작업 시에만 로드 |
| `rules/git-workflow.md` | 모든 세션에 로드 |

### 에이전트 팀 (실험적, 활성화됨)

`settings.local.json`의 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` 로 활성화.
복잡한 병렬 작업이 필요할 때 팀 생성 가능. 단순 브리핑 생성은 서브에이전트로 충분.

## 핵심 규칙

- git 명령은 반드시 `-C "{REPO_ROOT}"` 형식 사용 (`git rev-parse --show-toplevel` 으로 동적 결정)
- 하드코딩된 절대 경로(`C:\Users\...`) 사용 금지
- `briefings/*-error.txt` 파일은 커밋하지 않음
- push 실패 시 오류 출력 후 종료 (다음 실행에서 재시도)

## 스킬 (수동 호출)

| 명령어 | 에이전트 | 설명 |
|--------|---------|------|
| `/review-and-issue` | project-reviewer | 프로젝트 검토 후 GitHub 이슈 등록 |
| `/optimize` | (직접 실행) | 분석→이슈→해결→평가 최적화 루프 (최대 3라운드) |

## 설치 요구사항

- Claude Code 데스크탑 앱 (v2.1.32 이상 권장)
- GitHub CLI (`gh auth login` 완료)
- Git
