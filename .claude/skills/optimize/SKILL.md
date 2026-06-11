---
name: optimize
description: 프로젝트 분석 → 이슈 생성 → 이슈 해결 → 평가 → 반복하는 전체 최적화 루프를 실행한다.
disable-model-invocation: true
allowed-tools: Read Edit Write Glob Grep Bash(git *) Bash(gh *) Bash(git rev-parse *) WebFetch WebSearch
---

## 프로젝트 스킬 목록

이 프로젝트에는 아래 3개의 스킬이 있다. 각 스킬의 역할을 이해하고 최적화 루프에 활용하라.

| 스킬 | 경로 | 역할 |
|------|------|------|
| `daily-ai-briefing` | `.claude/scheduled-tasks/daily-ai-briefing/SKILL.md` | 매일 AI 뉴스 수집·브리핑 생성·커밋 |
| `review-and-issue` | `.claude/skills/review-and-issue/SKILL.md` | 프로젝트 검토 후 버그·개선점을 GitHub 이슈로 등록 |
| `optimize` (현재 스킬) | `.claude/skills/optimize/SKILL.md` | 전체 최적화 루프 오케스트레이터 |

## 현재 프로젝트 상태

!`git rev-parse --show-toplevel`

!`git log --oneline -5`

!`gh repo view --json nameWithOwner -q .nameWithOwner`

## 최적화 루프 실행 규칙

- 최대 **3회** 반복한다. 이슈가 0개이면 즉시 종료한다.
- 각 라운드마다 새로 등록된 이슈가 0개이면 루프를 종료한다.
- 파일 수정 후 반드시 커밋한다. 커밋 없이 다음 라운드로 넘어가지 않는다.
- 해결하기 어렵거나 판단이 필요한 이슈는 코멘트를 남기고 건너뛴다.

---

## 라운드 실행 절차

각 라운드는 아래 4단계를 순서대로 실행한다.

### 1단계: 프로젝트 분석

아래 파일을 모두 읽고 현재 상태를 파악한다:

- `README.md`
- `.claude/settings.local.json`
- `.claude/scheduled-tasks/daily-ai-briefing/SKILL.md`
- `.claude/skills/review-and-issue/SKILL.md`
- `.claude/skills/optimize/SKILL.md`
- `.gitignore`

파악할 항목:
- 경로·명령어 오류, 권한 누락, 논리 모순
- 하드코딩된 값 중 환경 의존적인 것
- 누락된 에러 처리 또는 안내
- 스킬 간 불일치 (예: review-and-issue가 언급하지 않는 파일, settings에 없는 권한)

### 2단계: 이슈 생성

분석 결과를 바탕으로 신규 이슈를 등록한다. `review-and-issue` 스킬과 동일한 기준을 적용한다.

1. 기존 오픈 이슈 목록을 확인해 중복을 방지한다:
   ```
   gh issue list --repo <REPO> --state open --limit 50
   ```
2. 발견한 항목마다 이슈를 등록한다:
   ```
   gh issue create --repo <REPO> --title "[Bug] ..." --body "..." --label "bug"
   gh issue create --repo <REPO> --title "[Enhancement] ..." --body "..." --label "enhancement"
   ```
3. 신규 이슈가 0개이면 이 라운드를 종료하고 루프를 끝낸다.

### 3단계: 이슈 해결

오픈 이슈 목록을 가져와 해결 가능한 것부터 순서대로 처리한다:

```
gh issue list --repo <REPO> --state open --limit 50 --json number,title,body,labels
```

각 이슈에 대해:

1. 이슈 본문을 읽고 원인이 되는 파일을 특정한다.
2. 파일을 수정한다 (Edit 또는 Write 사용).
3. 수정 후 아래 git 명령으로 커밋한다:
   ```
   git add <수정된-파일>
   git commit -m "fix: <이슈 제목 요약> (#<이슈번호>)"
   ```
4. 이슈를 close한다:
   ```
   gh issue close <번호> --repo <REPO> --comment "fix: <커밋 해시>에서 해결"
   ```
5. 판단이 필요하거나 파일 외 작업(저장소 설정 변경 등)이 필요한 이슈는 코멘트를 남기고 건너뛴다:
   ```
   gh issue comment <번호> --repo <REPO> --body "수동 처리 필요: <이유>"
   ```

모든 수정이 끝나면 한 번에 push한다:
```
git push
```

### 4단계: 평가

이번 라운드 결과를 아래 형식으로 출력한다:

```
## 라운드 N 결과

### 분석
- 검토한 파일: N개
- 발견한 문제: N개 (Bug N, Enhancement N)

### 이슈 생성
- 신규 등록: #번호 제목, ...
- 중복 건너뜀: N개

### 이슈 해결
- 해결 완료: #번호 제목 (커밋 해시), ...
- 수동 처리 필요: #번호 제목 (이유), ...

### 다음 라운드
- 잔여 오픈 이슈: N개
- 판정: [계속 / 종료]
```

잔여 오픈 이슈가 0개이거나 최대 반복 횟수(3회)에 도달하면 루프를 종료하고 최종 요약을 출력한다.

---

## 최종 요약 형식

```
## 최적화 루프 완료

### 전체 결과
- 실행 라운드: N회
- 총 등록 이슈: N개
- 총 해결 이슈: N개
- 미해결 (수동 필요): N개

### 주요 개선 내역
- ...

### 잔여 오픈 이슈
- #번호 제목 (이유)
```
