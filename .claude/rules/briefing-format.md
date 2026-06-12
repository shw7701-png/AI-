---
paths:
  - "briefings/**"
---

# 브리핑 HTML 형식 규칙

`briefings/` 폴더 작업 시 아래 형식을 준수한다.

## 필수 구성 요소

- 상단: 날짜 + "AI 모닝 브리핑" 제목
- "LLM & 생성AI 특화" 태그
- 뉴스 카드에 왼쪽 색상 보더(`border-left`) 적용
- 하단: "다음 브리핑 — 내일 오전 7:00 KST"
- `sendPrompt` 버튼 2~3개 (심화 질문 유도)

## 스타일 요구사항

- 다크모드 호환 CSS 변수 사용 (`var(--color-*)`)
- 별도 외부 CSS 파일 없이 인라인 스타일 또는 `<style>` 태그 사용
- 언어: 한국어 요약 + 원문 출처 링크 (영문 포함)

## 파일 명명 규칙

- 저장 경로: `briefings/YYYY-MM-DD.html`
- 오류 발생 시: `briefings/YYYY-MM-DD-error.txt`
- `*-error.txt` 파일은 `.gitignore`에 의해 커밋 제외됨
