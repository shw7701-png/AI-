---
name: daily-ai-briefing
description: 매일 오전 7시 LLM & 생성AI 동향 브리핑 (HTML 형식)
---

매일 아침 LLM과 생성AI 위주로 AI 동향 브리핑을 만들어라. 아래 순서로 구성하고, 결과는 HTML 위젯(show_widget)으로 출력한 뒤 파일로 저장하고 GitHub에 커밋하라.

## 브리핑 구성

1. **오늘의 핵심 뉴스 Top 3** — 모델 출시, 연구 논문, 업계 발표 중 가장 중요한 소식 3건. 각각 제목, 2~3문장 요약, 출처 링크 포함.
2. **주목 트렌드** — 이번 주 AI 업계에서 부상 중인 기술·비즈니스 흐름 3~4가지를 칩 형태로 표시.
3. **주목할 도구 & 서비스** — 새로 출시되거나 업데이트된 AI 툴·API·플랫폼 2~3개. 이름, 한 줄 설명, 상태 태그(신규 출시/업데이트/급성장) 포함.
4. **오늘의 추천 읽을거리** — 심층 아티클 또는 연구 논문 2편. 제목, 출처, 링크 포함.

## 실행 방법

1. WebSearch로 당일 날짜 기준 최신 LLM·생성AI 뉴스를 검색한다. 검색어 예시:
   - "LLM generative AI news [오늘 날짜]"
   - "OpenAI Anthropic Google AI model release [오늘 날짜]"
   - "생성AI LLM 최신 뉴스 [오늘 날짜]"
2. 검색 결과를 바탕으로 실제 뉴스·발표만 사용한다. 추측이나 오래된 정보는 제외.
3. show_widget으로 HTML 브리핑을 렌더링한다.
4. 동일한 HTML 내용을 `briefings/YYYY-MM-DD.html` 형식으로 파일 저장한다. (YYYY-MM-DD는 실제 오늘 날짜)
   - 저장 전 `git -C . rev-parse --show-toplevel` 명령으로 레포 루트(REPO_ROOT)를 확인한다.
   - 저장 경로: `<REPO_ROOT>\briefings\YYYY-MM-DD.html`
5. 아래 git 명령을 순서대로 실행하여 GitHub에 자동 커밋한다. REPO_ROOT는 4단계에서 확인한 값으로 대체한다:
   - `git -C "<REPO_ROOT>" add briefings/`
   - `git -C "<REPO_ROOT>" commit -m "브리핑: YYYY-MM-DD"`
   - `git -C "<REPO_ROOT>" push`

## 출력 형식 요구사항

- HTML 위젯으로 출력 (show_widget 사용)
- 상단에 날짜와 "AI 모닝 브리핑" 제목 표시
- "LLM & 생성AI 특화" 태그 표시
- 각 뉴스 카드에 왼쪽 색상 보더(border-left) 적용
- 하단에 "다음 브리핑 — 내일 오전 7:00 KST" 표시
- 관련 심화 질문을 유도하는 sendPrompt 버튼 2~3개 포함
- 다크모드 호환 CSS 변수 사용
- 언어: 한국어 요약 + 원문 출처 링크(영문 포함)
