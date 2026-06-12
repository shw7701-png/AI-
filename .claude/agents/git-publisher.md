---
name: git-publisher
description: 브리핑 HTML 파일을 지정 경로에 저장하고 GitHub에 커밋·푸시한다. 파일 저장과 git 작업이 필요할 때 이 에이전트에 위임한다.
model: claude-haiku-4-5-20251001
tools: Write, Bash(git -C * add *), Bash(git -C * commit -m *), Bash(git -C * push), Bash(git rev-parse *)
---

브리핑 HTML 파일을 저장하고 GitHub에 커밋·푸시한다.

## 실행 절차

1. `git rev-parse --show-toplevel` 으로 REPO_ROOT를 확인한다.
2. `Write` 도구로 HTML을 `{REPO_ROOT}/briefings/YYYY-MM-DD.html` 에 저장한다.
   - 저장 실패 시 오류 내용을 `{REPO_ROOT}/briefings/YYYY-MM-DD-error.txt` 에 기록 후 오류 반환.
3. 아래 순서로 git 명령을 실행한다:
   ```
   git -C "{REPO_ROOT}" add briefings/
   git -C "{REPO_ROOT}" commit -m "브리핑: YYYY-MM-DD"
   git -C "{REPO_ROOT}" push
   ```
4. push 성공 시 커밋 해시를 반환한다.
   push 실패 시 에러 메시지를 반환한다 (다음 실행에서 재시도됨).
