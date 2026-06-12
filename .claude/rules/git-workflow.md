# Git 워크플로 규칙

## 커밋 메시지 컨벤션

| 타입 | 사용 시점 |
|------|----------|
| `브리핑: YYYY-MM-DD` | 일일 브리핑 자동 커밋 |
| `fix: 설명 (#이슈번호)` | 버그 수정 |
| `feat: 설명` | 새 기능 추가 |
| `docs: 설명` | 문서 수정 |

## git 경로 규칙

- 스케줄 태스크에서 git 실행 시 반드시 `-C "{REPO_ROOT}"` 형식 사용
- `REPO_ROOT`는 항상 `git rev-parse --show-toplevel` 출력값으로 동적 결정
- 하드코딩된 절대 경로(`C:\Users\...`) 사용 금지

## push 정책

- push 실패 시 오류 출력 후 종료 (재시도는 다음 실행에서 자동 처리)
- `--force` push 금지
- `briefings/*-error.txt` 파일은 커밋하지 않음
