---
name: optimize
description: 프로젝트 스킬 3종을 파악하고 분석→이슈생성→해결→평가→반복하는 최적화 루프를 실행한다. 오픈 이슈가 0개가 될 때까지 최대 3라운드 반복한다.
disable-model-invocation: true
allowed-tools: Read Edit Write Glob Grep Bash(git *) Bash(gh *) WebFetch WebSearch mcp__scheduled-tasks__update_scheduled_task
---

## 프로젝트 스킬 목록

실행 전 아래 3개 스킬 파일을 모두 읽어 현재 상태를 파악한다.

| 스킬 | 경로 | 역할 |
|------|------|------|
| `daily-ai-briefing` | `.claude/scheduled-tasks/daily-ai-briefing/SKILL.md` | 매일 AI 뉴스 수집·브리핑 생성·GitHub 커밋 |
| `review-and-issue` | `.claude/skills/review-and-issue/SKILL.md` | 프로젝트 검토 후 버그·개선점을 GitHub 이슈로 등록 |
| `optimize` | `.claude/skills/optimize/SKILL.md` | 전체 최적화 루프 오케스트레이터 (현재 스킬) |

## 시작 전 상태 수집

!`git log --oneline -3`

!`gh repo view --json nameWithOwner -q .nameWithOwner`

---

## 루프 실행 규칙

- 최대 **3라운드** 반복. 오픈 이슈 0개이면 즉시 종료.
- 라운드당 신규 이슈 0개이면 루프 종료.
- 파일 수정 후 반드시 커밋 완료 후 다음 라운드 진행.
- 해결 불가(저장소 설정 변경, 외부 서비스 등) 이슈는 코멘트 후 skip.
- `daily-ai-briefing` SKILL.md 수정 시 `mcp__scheduled-tasks__update_scheduled_task`로 실행 파일도 동기화.

---

## 라운드 절차

### 1단계: 프로젝트 분석

아래 파일을 모두 읽고 문제를 발굴한다.

```
CLAUDE.md
README.md
.gitignore
.claude/settings.local.json
.claude/scheduled-tasks/daily-ai-briefing/SKILL.md
.claude/skills/review-and-issue/SKILL.md
.claude/skills/optimize/SKILL.md
.claude/agents/news-collector.md
.claude/agents/git-publisher.md
.claude/agents/project-reviewer.md
.claude/rules/briefing-format.md
.claude/rules/git-workflow.md
```

점검 항목:

| 범주 | 확인 내용 |
|------|----------|
| **버그** | 잘못된 경로·명령어, 실행 실패 가능성, 권한 누락, 논리 모순 |
| **일관성** | 스킬 간 파일 목록 불일치, settings와 allowed-tools 간 누락 |
| **개선점** | 하드코딩 값, 누락된 에러 처리, 불명확한 설명, 동기화 필요 항목 |

### 2단계: 이슈 생성

```bash
# 1. 기존 오픈 이슈 확인 (중복 방지)
gh issue list --repo {REPO} --state open --limit 50

# 2. 신규 이슈 등록
gh issue create --repo {REPO} --title "[Bug] ..."       --body "..." --label "bug"
gh issue create --repo {REPO} --title "[Enhancement] ..." --body "..." --label "enhancement"
```

신규 이슈 0개 → 루프 즉시 종료.

### 3단계: 이슈 해결

```bash
# 오픈 이슈 목록 조회
gh issue list --repo {REPO} --state open --limit 50 --json number,title,body,labels
```

각 이슈를 순서대로 처리한다:

1. 이슈 본문을 읽고 대상 파일 특정
2. `Edit` 또는 `Write`로 파일 수정
3. 커밋:
   ```bash
   git add <파일>
   git commit -m "fix: <이슈 요약> (#<번호>)"
   ```
4. `daily-ai-briefing` SKILL.md를 수정한 경우 → `mcp__scheduled-tasks__update_scheduled_task` 호출하여 실행 파일 동기화
5. 이슈 close:
   ```bash
   gh issue close <번호> --repo {REPO} --comment "fix: <커밋 해시>에서 해결"
   ```
6. 해결 불가 시:
   ```bash
   gh issue comment <번호> --repo {REPO} --body "수동 처리 필요: <이유>"
   ```

모든 이슈 처리 완료 후 push:
```bash
git push
```

### 4단계: 평가 및 반복 판정

```
## 라운드 N 결과

분석한 파일: N개 | 발견: Bug N건, Enhancement N건
등록된 이슈: #번호 제목, ...
해결 완료:  #번호 제목 (커밋), ...
수동 처리:  #번호 제목 (이유), ...
잔여 오픈:  N개 → [계속 | 종료]
```

---

## 최종 요약

루프 종료 시 출력:

```
## 최적화 완료

실행 라운드: N회 | 총 등록: N건 | 해결: N건 | 수동 처리: N건

주요 개선 내역:
- ...

잔여 오픈 이슈: N개
- #번호 제목 (이유)
```
