# PlayRank

YouTube 채널 인기도 랭킹 + AI 인사이트 MVP

PlayBoard 스타일의 YouTube 채널 랭킹 서비스입니다. 카테고리·국가별 인기 채널을 조회하고, Gemini AI가 채널 트렌드를 분석해 줍니다.

**Repository:** [github.com/junsang-dong/goorm-260625-youtube-ranking](https://github.com/junsang-dong/goorm-260625-youtube-ranking)

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 카테고리별 랭킹 | 엔터테인먼트·게임·음악·교육·테크·스포츠·푸드·뷰티·라이프스타일 (8종) |
| 국가 필터 | 전 세계 / 한국 / 미국 / 일본 / 인도 / 브라질 / 영국 |
| 채널 상세 분석 | 구독자·조회수·평균 조회수·참여율·태그 등 |
| AI 트렌드 인사이트 | Gemini 2.5 Flash 스트리밍 응답 (선택 언어로 생성, 일 10회 제한) |
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
- Gemini 2.5 Flash

---

## 프로젝트 구조

```
api/                  # Vercel Serverless API
  ranking.js          # GET /api/ranking
  channel/[id].js     # GET /api/channel/:id
  search.js           # GET /api/search
  insight.js          # POST /api/insight
  favorites.js        # GET/POST /api/favorites
  health.js           # GET /api/health
db/migrations/        # Neon DB 스키마
lib/                  # YouTube·DB·랭킹 유틸
src/                  # React SPA
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
| `GEMINI_API_KEY` | Gemini API 키 (서버 전용) |
| `GEMINI_MODEL` | (선택) Gemini 모델명, 기본값 `gemini-2.5-flash` |
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 (서버 전용) |
| `VITE_APP_TITLE` | 앱 표시명 |

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
3. 환경 변수 3종 등록 (`YOUTUBE_API_KEY`, `GEMINI_API_KEY`, `DATABASE_URL`)
4. 프로덕션 DB에 `npm run db:migrate` 실행

`vercel.json`에 SPA rewrite 및 Neon 콜드 스타트 방지용 health cron(6시간)이 설정되어 있습니다.

---

## 구현 및 오류 수정 이력

### MVP 구현 (Phase 0–7)

- Vite + React + Tailwind + Zustand 스캐폴딩
- YouTube API 연동 랭킹·검색·채널 상세
- Neon DB 캐싱 (`channels`, `rankings`, `ai_insights`, `favorites`)
- Gemini AI 인사이트 스트리밍
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

**수정:** `api/insight.js` 모델을 **`gemini-2.5-flash`**로 교체(`GEMINI_MODEL` 환경변수로 오버라이드 가능)

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

### 4. AI 인사이트 모델 교체

- `gemini-2.0-flash` → `gemini-2.5-flash` (위 오류 수정 항목 참고)

### 5. 푸터 정보 추가

- 개발일(2026.06.26), 개발사(Jay.NextPlatform), 개발 스택 배지

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/ranking` | 카테고리·국가별 랭킹 (`?category=&region=&limit=48`) |
| GET | `/api/channel/:id` | 채널 상세 정보 |
| GET | `/api/search` | 채널 검색 (`?q=`) |
| POST | `/api/insight` | AI 인사이트 (스트리밍, `{ channelId, channelData, lang }`) |
| GET/POST | `/api/favorites` | 즐겨찾기 조회·추가·삭제 |
| GET | `/api/health` | DB 헬스체크 |

---

## 라이선스

교육 실습용 MVP — 구름 AI 어시스턴트 80H 교육과정
