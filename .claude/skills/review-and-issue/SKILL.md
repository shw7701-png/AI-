---
name: review-and-issue
description: 프로젝트 내용을 검토하여 버그와 개선점을 파악하고 GitHub 이슈로 등록한다.
disable-model-invocation: true
allowed-tools: Read Glob Grep Bash(gh issue create *) Bash(gh issue list *)
---

프로젝트 파일을 꼼꼼히 검토하여 버그와 개선점을 찾아내고, 각각을 GitHub 이슈로 등록하라.

## 현재 프로젝트 파일 목록

!`cd "C:\Users\Admin\Desktop\ai 샘플" && git ls-files`

## 단계별 실행 방법

### 1단계: 파일 검토

아래 파일들을 순서대로 읽고 분석한다:

- `.claude/scheduled-tasks/daily-ai-briefing/SKILL.md` — 스케줄 태스크 프롬프트
- `.claude/skills/review-and-issue/SKILL.md` — 이 스킬 자체
- `.claude/settings.local.json` — 권한 설정
- `README.md` — 설치 및 사용 가이드

### 2단계: 이슈 발굴 기준

각 파일을 읽으며 아래 항목을 체크한다:

**버그 (Bug)**
- 잘못된 경로, 명령어 오류, 실행 시 실패할 가능성이 있는 부분
- 누락된 필수 설정이나 권한
- 논리적 모순 또는 불일치

**개선점 (Enhancement)**
- 하드코딩된 값 (경로, 날짜 등) 중 환경에 따라 달라져야 할 것
- 빠진 에러 처리 또는 fallback
- 사용성 개선 (명확하지 않은 설명, 누락된 단계 등)
- 유지보수성 향상 아이디어

### 3단계: 기존 이슈 확인

중복 등록을 방지하기 위해 기존 이슈 목록을 먼저 확인한다:

```
gh issue list --repo shw7701-png/AI- --state open --limit 50
```

### 4단계: GitHub 이슈 등록

발견한 항목마다 아래 형식으로 이슈를 등록한다. 기존 이슈와 동일한 내용은 건너뛴다.

```
gh issue create \
  --repo shw7701-png/AI- \
  --title "[Bug] 이슈 제목" \
  --body "## 문제 설명\n\n...\n\n## 재현 방법\n\n1. ...\n\n## 예상 동작\n\n...\n\n## 실제 동작\n\n..." \
  --label "bug"
```

```
gh issue create \
  --repo shw7701-png/AI- \
  --title "[Enhancement] 개선 제목" \
  --body "## 개선 설명\n\n...\n\n## 현재 상태\n\n...\n\n## 제안 방법\n\n..." \
  --label "enhancement"
```

라벨이 없으면 `--label` 옵션을 생략한다.

## 출력 형식

이슈 등록이 모두 끝나면 아래 형식으로 결과를 요약한다:

```
## 검토 결과 요약

### 등록된 이슈
- [Bug] 제목 — #이슈번호
- [Enhancement] 제목 — #이슈번호

### 건너뛴 항목 (기존 이슈 중복)
- 제목 — 기존 #이슈번호

### 특이사항
- ...
```
