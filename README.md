# PlayRank

YouTube 채널 인기도 랭킹 + AI 인사이트 MVP

PlayBoard 스타일의 YouTube 채널 랭킹 서비스입니다. 카테고리·국가별 인기 채널을 조회하고, GPT AI가 채널 트렌드를 분석해 줍니다.

**Repository:** [github.com/junsang-dong/goorm-260625-youtube-ranking](https://github.com/junsang-dong/goorm-260625-youtube-ranking)

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 카테고리별 랭킹 | 엔터테인먼트·게임·음악·교육·테크·스포츠·푸드·뷰티·라이프스타일 (8종) |
| 국가 필터 | 전 세계 / 한국 / 미국 / 일본 / 인도 / 브라질 / 영국 |
| 채널 상세 분석 | 구독자·조회수·평균 조회수·참여율·태그 등 |
| AI 트렌드 인사이트 | GPT (gpt-4o-mini) 스트리밍 응답 (선택 언어로 생성, 일 10회 제한) |
| 멀티 LLM 채널 분석 | GPT·Claude·Gemini·Perplexity 오케스트레이션 (신뢰도 검증 → 병렬 분석 → 종합 보고서) |
| 채널 검색 | 300ms 디바운스, 최대 10개 결과 |
| 즐겨찾기 | 익명 세션 기반 Neon DB 저장 |
| 랭킹 변동 배지 | ▲ 상승 / ▼ 하락 / NEW / - |
| 다국어 (i18n) | 영어(기본)·한국어·일본어·중국어 |
| 테마 | 라이트/다크 모드 토글 (선택값 localStorage 저장) |

### 랭킹 출력 규칙

- 초기 **24개** 표시, 하단 **[더 보기]** 클릭 시 **12개 단위**로 추가 (최대 48개 조회)
- 카테고리·국가 변경 시 표시 개수 자동 초기화(24개)
- 인기도 점수: `채널 총 조회수 + (인기 영상 평균 좋아요 × 10)`
- Neon DB 24시간 캐시로 YouTube API 쿼터 절약

---

## 기술 스택

- React 19 + Vite 6
- Tailwind CSS v4 (라이트/다크 테마)
- Zustand (랭킹·즐겨찾기·UI[테마/언어] 상태)
- Vercel Serverless Functions
- Neon PostgreSQL
- YouTube Data API v3
- 멀티 LLM: OpenAI GPT · Anthropic Claude · Google Gemini · Perplexity (경량 fetch 오케스트레이터, Edge 호환)

---

## 프로젝트 구조

```
api/                  # Vercel Serverless/Edge API
  ranking.js          # GET /api/ranking
  channel/[id].js     # GET /api/channel/:id
  search.js           # GET /api/search
  insight.js          # POST /api/insight
  analyze-channel.js  # POST /api/analyze-channel (멀티 LLM 분석)
  filter-channels.js  # POST /api/filter-channels (신뢰도 일괄 필터링)
  favorites.js        # GET/POST /api/favorites
  health.js           # GET /api/health
db/migrations/        # Neon DB 스키마 (001_init, 002_multi_llm)
lib/                  # YouTube·DB·랭킹 유틸
  llm/clients.js      # GPT/Claude/Gemini/Perplexity fetch 래퍼
  graph/              # 멀티 LLM 노드 + 경량 오케스트레이터
  youtube/            # YouTube 클라이언트 + 채널 상세 조립
src/                  # React SPA
  pages/              # Home, Search, Favorites, ChannelIntelligence
  components/intelligence/  # TrustScoreCard, LLMAnalysisPanel, SynthesisReport
  i18n/               # 다국어 번역(en/ko/ja/zh) + useT 훅
  store/              # Zustand (rankingStore, favoriteStore, uiStore)
scripts/              # 로컬 API dev server
```

---

## 로컬 개발

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env`에 아래 값을 입력합니다.

| 변수 | 설명 |
|------|------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 (서버 전용) |
| `OPENAI_API_KEY` | OpenAI API 키 (서버 전용, 인사이트·분석 필수) |
| `OPENAI_MODEL` | (선택) OpenAI 모델명, 기본값 `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API 키 (멀티 LLM 분석의 신뢰도·종합 담당, 필수) |
| `ANTHROPIC_MODEL` | (선택) Claude 모델명, 기본값 `claude-sonnet-4-6` |
| `GEMINI_API_KEY` | (선택) Gemini 키 — 분류 노드, 없으면 Claude로 폴백 |
| `PERPLEXITY_API_KEY` | (선택) Perplexity 키 — 트렌드 노드, 없으면 GPT로 폴백 |
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 (서버 전용) |
| `VITE_APP_TITLE` | 앱 표시명 |

> 멀티 LLM 폴백: Gemini 키 없음 → Claude 대체, Perplexity 키 없음 → GPT 대체. GPT/Claude 키가 모두 없으면 분석이 실패합니다.

> `VITE_` 접두사가 없는 변수는 클라이언트에 노출되지 않습니다.

### 2. 설치 및 DB 마이그레이션

```bash
npm install
npm run db:migrate
```

### 3. 개발 서버 실행

```bash
npm run dev
```

| 서비스 | 주소 |
|--------|------|
| UI | http://localhost:5181 |
| API | http://localhost:3005 (Vite proxy 경유) |

---

## Vercel 배포

1. GitHub에 push
2. [Vercel](https://vercel.com)에서 프로젝트 import (Framework: **Vite**)
3. 환경 변수 3종 등록 (`YOUTUBE_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`)
4. 프로덕션 DB에 `npm run db:migrate` 실행

`vercel.json`에 SPA rewrite 및 Neon 콜드 스타트 방지용 health cron(6시간)이 설정되어 있습니다.

---

## 구현 및 오류 수정 이력

### MVP 구현 (Phase 0–7)

- Vite + React + Tailwind + Zustand 스캐폴딩
- YouTube API 연동 랭킹·검색·채널 상세
- Neon DB 캐싱 (`channels`, `rankings`, `ai_insights`, `favorites`)
- GPT AI 인사이트 스트리밍
- 즐겨찾기·랭킹 변동 배지·ErrorBoundary

### 오류 수정

#### 1. 채널 상세 500 — 모듈 경로 오류

**증상:** 채널 카드 클릭 시 `Cannot find module 'api/lib/db/client.js'` 500 에러

**원인:** `api/channel/[id].js`가 `../lib/`로 import하여 `api/lib/`를 참조함

**수정:** import 경로를 `../../lib/`로 변경

#### 2. 랭킹 데이터 없음 — YouTube API 호출 방식

**증상:** 홈 화면에 "랭킹 데이터가 없습니다" 표시

**원인:** `search.list` + `order=viewCount` + `videoCategoryId` 조합이 결과 0건 반환

**수정:** `videos.list` + `chart=mostPopular` + `videoCategoryId`로 변경하여 카테고리별 인기 영상 → 채널 dedupe → 랭킹 산출

#### 3. DB 마이그레이션 실패 — SQL 파싱

**증상:** `relation "channels" does not exist` during migrate

**원인:** SQL 파일 상단 주석(`--`) 때문에 첫 `CREATE TABLE` 문이 필터링되어 건너뜀

**수정:** `db/migrate.js`에서 줄 단위로 `--` 주석 제거 후 실행

#### 4. Gemini 모델 폐기 오류

**증상:** AI 인사이트 요청 시 `This model models/gemini-2.0-flash is no longer available.`

**원인:** `gemini-2.0-flash` 모델이 서비스 종료됨

**수정:** `api/insight.js` 모델을 `gemini-2.5-flash`로 교체 (이후 #6에서 OpenAI GPT로 전면 교체)

#### 5. Vercel 배포 앱 런타임 오류 — `Unexpected token 'A', "An error o"... is not valid JSON`

**증상:** 빌드는 성공했으나 배포된 앱 실행 시 위 JSON 파싱 에러 발생

**원인:** API 핸들러가 웹 표준 `Request`/`Response` 시그니처(`new URL(req.url)`)로 작성됐는데, Vercel이 기본 **Node.js 런타임**으로 실행 → Node에서 `req.url`은 상대 경로라 `new URL()`이 예외 → 함수 크래시 → 플랫폼이 평문 `"An error occurred..."` 반환 → 프론트엔드 `res.json()` 파싱 실패

**수정:** 모든 `api/*.js`에 `export const config = { runtime: 'edge' }` 선언으로 **Edge 런타임** 지정. 인사이트의 캐시 저장은 `context.waitUntil`로 응답 종료 후에도 완료되도록 보장

#### 6. AI 인사이트 GPT 전환

**증상:** 요구사항 변경 — Gemini 대신 OpenAI GPT 사용

**수정:** `api/insight.js`를 OpenAI Chat Completions(SSE 스트리밍)로 교체
- 엔드포인트 `https://api.openai.com/v1/chat/completions`, `Authorization: Bearer` 헤더 인증
- 요청 본문 `messages: [{ role: 'user', content }]` + `stream: true`
- SSE 파싱 `choices[0].delta.content`
- 환경변수 `GEMINI_API_KEY`/`GEMINI_MODEL` → `OPENAI_API_KEY`/`OPENAI_MODEL`(기본값 `gpt-4o-mini`)

#### 7. 로컬 DB 연결 실패 — `.env` `DATABASE_URL` 손상

**증상:** 로컬 실행 시 `NeonDbError: fetch failed` / `getaddrinfo ENOTFOUND api.c-4...`

**원인:** `.env`의 `DATABASE_URL` 한 줄에 실제 연결 문자열과 예시 placeholder가 붙어 있어 호스트 파싱 실패

**수정:** 올바른 단일 Neon 연결 문자열로 정리 (`?sslmode=require&channel_binding=require`)

#### 8. 멀티 LLM 분석 실패 — Claude 모델 은퇴

**증상:** 분석 시 `errors: ["validateChannel: model: claude-3-5-sonnet-20241022"]` 반환, Claude 담당 항목(신뢰도·심층·종합)이 비어 출력

**원인:** 기본값으로 사용하던 `claude-3-5-sonnet-20241022` 모델이 계정에서 더 이상 제공되지 않음 (Anthropic `/v1/models` 조회로 확인)

**수정:** 기본 Claude 모델을 `claude-sonnet-4-6`으로 갱신 (`lib/llm/clients.js`, `.env.example`, `ANTHROPIC_MODEL` 환경변수로 재정의 가능)

#### 9. Claude 응답 잘림 — 긴 한국어 출력의 JSON 파싱 실패

**증상:** 심층 분석(`strategy`/`uniqueValue`/`risks`)과 종합 보고서 텍스트 필드가 빈 값으로 출력

**원인:** 한국어는 토큰 소모가 커서 `max_tokens` 한도에서 응답이 잘려 닫는 `}`가 없는 미완성 JSON이 되고, 기존 정규식 추출(`/\{[\s\S]*\}/`)이 파싱에 실패해 전부 기본값으로 대체됨

**수정:** 노드별 `max_tokens` 상향(validate 700 / deep 2000 / synthesis 2000)과 간결성 프롬프트 추가, `extractJson`에 **잘린 JSON 자동 복구**(문자열·괄호 상태 추적 후 미완성 값 제거·열린 괄호 보정) 로직 도입

#### 10. `@handle` 입력 시 캐시 미적중

**증상:** `@handle` URL로 같은 채널을 재분석해도 항상 새로 분석(캐시 미적중)되어 LLM 비용·시간이 반복 발생

**원인:** 캐시 조회는 입력 원문(`@handle`)으로, 저장은 해석된 채널 ID(`UC...`)로 수행되어 키가 영구 불일치

**수정:** `api/analyze-channel.js`에서 채널을 먼저 해석한 뒤 **해석된 채널 ID를 캐시 키로 사용**하도록 순서 조정 (저장·조회 키 일원화)

---

## 변경 이력 (UI/UX 개선)

### 1. 랭킹 페이지네이션 (더 보기)

- 초기 24개 표시 → **[더 보기]** 12개 단위 추가 노출
- API 최대 조회 개수를 48개로 확대 (`api/ranking.js`), 카테고리·국가 변경 시 표시 개수 초기화

### 2. 라이트/다크 테마

- Tailwind v4 `dark` 커스텀 variant + `<html>.dark` 클래스 토글
- `uiStore`에 테마 상태·localStorage 영속화, 헤더 우측 토글 버튼
- 전 컴포넌트 라이트/다크 스타일 페어 적용

### 3. 다국어 지원 (i18n)

- `src/i18n/translations.js`에 영어·한국어·일본어·중국어 전체 UI 문자열
- `useT` 훅 + `uiStore` 언어 상태(기본 영어, localStorage 저장), 헤더 언어 선택 드롭다운
- AI 인사이트는 선택 언어로 생성하며 언어별로 캐시(`channelId:lang`)

### 4. AI 인사이트 엔진 교체 (Gemini → OpenAI GPT)

- Google Gemini → **OpenAI GPT (gpt-4o-mini)** Chat Completions 스트리밍으로 전환
- 환경변수 `OPENAI_API_KEY` / `OPENAI_MODEL`(기본 `gpt-4o-mini`) 사용

### 5. 푸터 정보 추가

- 개발일(2026.06.26), 개발사(Jay.NextPlatform), 개발 스택 배지

### 6. Vercel 배포 안정화 — Edge 런타임

- 모든 API 함수를 Edge 런타임으로 선언해 웹 표준 `Request`/`Response` 시그니처 정상 동작
- 런타임 불일치로 발생하던 `Unexpected token 'A'... is not valid JSON` 오류 해결

### 7. 멀티 LLM 오케스트레이션 (v2.0)

- 기술명세서 기반으로 GPT·Claude·Gemini·Perplexity를 결합한 채널 분석 기능 추가
- LangGraph 대신 **Edge 호환 경량 오케스트레이터**(순수 `fetch`)로 동일 워크플로 구현: 신뢰도 검증(Claude) → 게이트(0.4) → 병렬 분석(GPT 요약·Claude 심층·Gemini 분류·Perplexity 트렌드) → 종합 보고서(Claude)
- 키 미보유 시 폴백(Gemini→Claude, Perplexity→GPT), `analysisType`(quick/deep/trend)으로 노드 수 조절
- `channel_analyses` 테이블에 언어·분석유형별 24시간 캐시, Channel Intelligence 대시보드(`/intelligence`)와 채널 모달의 "심층 분석" 진입점 제공

#### 멀티 LLM 워크플로

```
validateChannel(Claude) → [score<0.4 ? 미달 보고서]
  → Promise.all[ quickSummary(GPT), deepAnalysis(Claude), categorize(Gemini), trend(Perplexity) ]
  → synthesizeReport(Claude) → Neon 캐시 → JSON
```

### 8. LLM 소요 시간·비용 표시 (v2.1)

- 각 LLM 호출의 **소요 시간(ms/s)**, **토큰 사용량**(input/output/total), **추정 비용(USD)**을 측정해 분석 결과에 포함
- Channel Intelligence 대시보드의 각 LLM 패널 헤더 우측에 `시간 · 토큰 · 비용` 배지 표시, 페이지 상단에 전체 합계(총 토큰·총 비용·LLM 호출 수) 표시
- 비용은 모델별 공개 단가표(`lib/llm/clients.js`의 `PRICING`) 기반 추정치이며, `channel_analyses.metrics`(JSONB)에 함께 캐시되어 캐시 결과에서도 그대로 노출
- 부가 수정: `@handle` 입력 시 캐시가 적중하지 않던 문제 해결 — 채널을 먼저 해석한 뒤 해석된 채널 ID를 캐시 키로 사용
- Claude 응답이 길어 잘리는 경우를 대비해 `extractJson`에 **잘린 JSON 자동 복구** 로직 추가, Claude 기본 모델을 `claude-sonnet-4-6`으로 갱신

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/ranking` | 카테고리·국가별 랭킹 (`?category=&region=&limit=48`) |
| GET | `/api/channel/:id` | 채널 상세 정보 |
| GET | `/api/search` | 채널 검색 (`?q=`) |
| POST | `/api/insight` | AI 인사이트 (스트리밍, `{ channelId, channelData, lang }`) |
| POST | `/api/analyze-channel` | 멀티 LLM 종합 분석 (`{ channelId, analysisType, lang }`) |
| POST | `/api/filter-channels` | 채널 일괄 신뢰도 필터링 (`{ channels, threshold, lang }`) |
| GET/POST | `/api/favorites` | 즐겨찾기 조회·추가·삭제 |
| GET | `/api/health` | DB 헬스체크 |

---

## 라이선스

교육 실습용 MVP — 구름 AI 어시스턴트 80H 교육과정
