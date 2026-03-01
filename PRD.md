# 체험단 리뷰 블로그 글 작성기 (Review Writer)

## 개요
체험단 블로거를 위한 전용 블로그 글 작성 SaaS. 제품 정보를 입력하면 멀티 에이전트 파이프라인이 실제 정보를 조사하고, 자연스러운 네이버 블로그 리뷰글을 생성한다.

## 핵심 기능

### 입력 필드
- 제품명 (필수)
- 브랜드명 (필수)
- 제품 카테고리 (식품/화장품/육아/가전/생활용품/기타)
- 체험 내용 / 사용 후기 (자유 작성)
- 제품 장점 (키워드 또는 문장)
- 제품 단점 (솔직 리뷰용)
- 필수 포함 키워드/해시태그 (체험단 가이드라인)
- 필수 포함 문구 (협찬 표시 등)
- 글 톤 선택 (친근/전문/유머러스)
- 사진 매수 (사진 위치 가이드용)

### 멀티 에이전트 파이프라인 (5단계)

**Stage 1: 🔍 리서처 (Research Agent)**
- Brave Search API로 제품/브랜드 실제 정보 수집
- 제품 스펙, 가격, 실사용 후기, 경쟁 제품 비교 정보
- 최신 뉴스/이벤트 정보

**Stage 2: 📋 정리자 (Organizer Agent)**
- 수집된 정보를 구조화
- 핵심 셀링포인트 추출
- 사실 vs 의견 분류
- 글 작성에 필요한 핵심 데이터 정리

**Stage 3: 🎯 기획자 (Planner Agent)**
- 글의 전체 구조/아웃라인 설계
- 도입부 → 제품 소개 → 사용 후기 → 장단점 → 총평 흐름
- 사진 배치 위치 결정
- 필수 키워드 배치 전략

**Stage 4: ✍️ 작성자 (Writer Agent)**
- 실제 블로그 글 작성 (1500자+)
- 네이버 블로그 말투 (해요체, 경험 공유형)
- 필수 문구/해시태그 자동 삽입
- [사진] 마커 삽입

**Stage 5: ✨ 검수자 (Reviewer Agent)**
- SEO 최적화 점수 (키워드 밀도, 제목 최적화)
- AI 말투 탐지 및 제거 (번역체, 딱딱한 표현 교정)
- 맞춤법/어색한 표현 수정
- 최종 글 + SEO 리포트 출력

### 출력물
- 제목 후보 3개
- 최종 본문 (마크다운)
- 해시태그 목록
- SEO 분석 리포트
- AI 말투 제거 리포트
- 사진 배치 가이드

## 기술 스택
- **프레임워크:** Next.js 14+ (App Router)
- **스타일:** Tailwind CSS
- **AI:** OpenAI GPT-4o-mini (각 에이전트별 시스템 프롬프트)
- **검색:** Brave Search API
- **언어:** TypeScript
- **배포:** Vercel

## 환경변수
- `OPENAI_API_KEY` — OpenAI API 키
- `BRAVE_API_KEY` — Brave Search API 키

## 디자인
- 모바일 우선 반응형
- 단계별 진행 상황 표시 (Step 1/5, 2/5...)
- 각 에이전트 작업 결과를 실시간으로 보여주기
- 최종 결과물은 복사 버튼 + 다운로드
- 다크모드 지원

## 파일 구조
```
src/
  app/
    page.tsx              # 입력 폼
    generate/page.tsx     # 결과 페이지 (단계별 진행 표시)
    api/
      generate/route.ts   # 메인 API (5단계 파이프라인 오케스트레이션)
  lib/
    agents/
      researcher.ts       # Stage 1: 리서치
      organizer.ts        # Stage 2: 정리
      planner.ts          # Stage 3: 기획
      writer.ts           # Stage 4: 작성
      reviewer.ts         # Stage 5: 검수
    search.ts             # Brave Search 유틸
    types.ts              # 타입 정의
  components/
    InputForm.tsx          # 입력 폼 컴포넌트
    PipelineProgress.tsx   # 단계별 진행 표시
    ResultView.tsx         # 결과 뷰
```
