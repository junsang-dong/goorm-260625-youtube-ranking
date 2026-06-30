# PlayRank: 멀티 LLM 오케스트레이션 기술명세서

**프로젝트명:** PlayRank Multi-LLM Analytics  
**버전:** v2.0  
**최종 업데이트:** 2026년 6월 29일  
**담당자:** 동준상 · 넥스트플랫폼

---

## 📌 1. 문서 개요

### 1.1 목표

PlayRank에 **LangGraph 기반 멀티 LLM 오케스트레이션**을 구현하여 다음 기능을 제공한다:

1. **고도화된 필터링** — Claude를 통한 의미론적 채널 신뢰도 검증
2. **지능형 영상 추천** — GPT + Claude 병렬 분석으로 시청자 맥락 파악
3. **전문 분석 보고서** — 세 LLM의 협업으로 종합 채널 분석 리포트 작성

### 1.2 이 명세서의 범위

- LangGraph 워크플로 설계 (그래프 구조, 노드, 엣지)
- 멀티 LLM API 통합 (GPT, Claude, Gemini, Perplexity)
- Vercel Edge Functions 최적화
- Neon PostgreSQL 데이터 모델 확장
- React 프론트엔드 UX 패턴
- API 엔드포인트 명세
- 배포 및 모니터링 전략

### 1.3 기대 효과

| 기능 | 기존 | 개선 후 |
|------|------|--------|
| 채널 분석 | GPT 단일 분석 | Claude(신뢰도) + GPT(요약) + Gemini(분류) 종합 |
| 필터링 정확도 | 프롬프트 기반 | 의미론적 검증 + 구조화된 점수 |
| 추천 신뢰도 | 1가지 모델 관점 | 3가지 모델 관점 교차 검증 |
| 처리 시간 | ~3초 | ~4–5초 (병렬 실행) |
| 비용 | $0.001/분석 | $0.003/분석 (3배지만 정확도 ↑ 30%) |

---

## 📊 2. 기술 스택

### 2.1 핵심 프레임워크

```yaml
Frontend:
  - React 19 + Vite 6
  - Zustand (상태 관리)
  - Tailwind CSS v4 (UI)

Backend:
  - Node.js 20+ (Vercel Serverless / Edge)
  - LangGraph (=@langchain/langgraph)
  - Vercel AI SDK (선택: 간편한 모델 래핑)

LLM Orchestration:
  - LangGraph: 에이전트 워크플로 정의
  - LangChain: 모델 래퍼 & 도구 인터페이스
  - OpenAI SDK: GPT API 직접 호출 (폴백)

Database:
  - Neon PostgreSQL: 채널, 분석 결과, 캐시
  - Redis (선택): 실시간 스트리밍 상태

Deployment:
  - Vercel: 프론트 + 에지 함수
  - GitHub Actions: CI/CD
```

### 2.2 LLM API 지원

| LLM | 상태 | API Key | 폴백 | 용도 |
|-----|------|---------|------|------|
| **GPT-4o-mini** | ✅ 필수 | `OPENAI_API_KEY` | OpenAI SDK | 빠른 요약, 실시간 분석 |
| **Claude 3.5 Sonnet** | ✅ 필수 | `ANTHROPIC_API_KEY` | Anthropic SDK | 신뢰도 검증, 깊은 분석 |
| **Gemini 2.5 Flash** | ⚠️ 선택 | `GEMINI_API_KEY` | Claude로 대체 | 분류, 다국어 지원 |
| **Perplexity Sonar** | ⚠️ 선택 | `PERPLEXITY_API_KEY` | GPT로 대체 | 웹 검색 기반 트렌드 |

**폴백 전략:**
- Gemini 키 없음 → Claude로 분류 작업 대체
- Perplexity 키 없음 → GPT로 웹 정보 요약 대체
- GPT/Claude 중 하나라도 키 없음 → 에러 반환 (필수)

---

## 🏗️ 3. LangGraph 워크플로 설계

### 3.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   PlayRank Multi-LLM Graph                │
│  (채널 필터링 → 병렬 분석 → 통합 보고서)                  │
└─────────────────────────────────────────────────────────┘

입력: { channelId, channelData, lang, analysisType }
  ↓
┌─ [State] ChannelAnalysisState
│  ├─ channelId: str
│  ├─ channelData: ChannelMetadata
│  ├─ filters: FilterResult (신뢰도 검증)
│  ├─ analysisGPT: str (빠른 요약)
│  ├─ analysisClaude: str (깊은 분석)
│  ├─ analysisGemini: str (분류)
│  ├─ trendPerplexity: str (선택)
│  ├─ report: AnalysisReport (최종)
│  └─ errors: list[str]
  ↓
┌─ [Node] validateChannel (Claude)
│  입력: channelData
│  작업: 신뢰도 점수, 위험 플래그, 설명 추출
│  출력: FilterResult { score, flags, reason }
  ↓
┌─ [Conditional] shouldProceed?
│  신뢰도 < 0.4 → END (필터 실패)
│  신뢰도 ≥ 0.4 → 분석 진행
  ↓
┌─ [Parallel Node] analyzeInParallel
│  ├─ [Node] quickSummaryGPT (GPT)
│  │  작업: 채널 개요, 콘텐츠 유형, 타겟 시청자
│  ├─ [Node] deepAnalysisClaude (Claude)
│  │  작업: 채널 전략, 강점/약점, 성장성
│  ├─ [Node] categorizeGemini (Gemini or Claude)
│  │  작업: 정확한 카테고리 분류, 서브 카테고리
│  └─ [Node] trendTrackerPerplexity (Perplexity or GPT)
│     작업: 현재 트렌드, 경쟁사 비교 (선택)
  ↓
┌─ [Node] synthesizeReport (Claude)
│  입력: 4개 모델의 분석 결과
│  작업: 통합 보고서 작성, 상충 해결, 점수 도출
│  출력: AnalysisReport
  ↓
┌─ [Node] cacheResult (Neon)
│  작업: 결과 저장, 24시간 캐시
  ↓
출력: AnalysisReport
```

### 3.2 State 정의 (TypeScript)

```typescript
// lib/graph/types.ts

interface ChannelMetadata {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  avgViews: number;
  engagementRate: number;
  tags: string[];
  category: string;
}

interface FilterResult {
  score: number; // 0.0–1.0, Claude 판단
  trusted: boolean;
  flags: string[]; // 위험 플래그: "spam", "misleading", "inactive"
  reason: string; // 점수 근거
}

interface AnalysisGPT {
  summary: string;
  contentType: string;
  targetAudience: string;
  strengths: string[];
}

interface AnalysisClaude {
  strategy: string;
  uniqueValue: string;
  growthPotential: "high" | "medium" | "low";
  risks: string[];
}

interface AnalysisGemini {
  primaryCategory: string;
  secondaryCategories: string[];
  contentTone: string; // "educational", "entertainment", "news", etc.
  confidence: number; // 0.0–1.0
}

interface TrendPerplexity {
  currentTrends: string[];
  competitorInsight: string;
  marketOpportunity: string;
}

interface AnalysisReport {
  channelId: string;
  timestamp: string;
  language: string;
  filter: FilterResult;
  analysisGPT: AnalysisGPT;
  analysisClaude: AnalysisClaude;
  analysisGemini: AnalysisGemini;
  trendPerplexity?: TrendPerplexity;
  synthesisReport: {
    overallScore: number; // 0–100
    recommendation: "highly_recommended" | "recommended" | "neutral" | "not_recommended";
    executiveSummary: string;
    keyInsights: string[];
    recommendations: string[];
  };
}

// LangGraph State
interface ChannelAnalysisState {
  channelId: string;
  channelData: ChannelMetadata;
  lang: string;
  analysisType: "quick" | "deep" | "trend"; // 분석 깊이
  filters?: FilterResult;
  analysisGPT?: AnalysisGPT;
  analysisClaude?: AnalysisClaude;
  analysisGemini?: AnalysisGemini;
  trendPerplexity?: TrendPerplexity;
  report?: AnalysisReport;
  errors: string[];
}
```

### 3.3 노드 구현 (Node.js + LangGraph)

```javascript
// lib/graph/nodes.js

import { Anthropic } from "@anthropic-ai/sdk";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// [Node 1] validateChannel — Claude로 신뢰도 검증
export async function validateChannel(state) {
  const { channelData, lang } = state;

  const prompt = `
당신은 YouTube 채널 신뢰도 평가 전문가입니다.

채널 정보:
- 제목: ${channelData.title}
- 설명: ${channelData.description}
- 구독자: ${channelData.subscriberCount.toLocaleString()}
- 총 조회수: ${channelData.viewCount.toLocaleString()}
- 평균 조회수: ${channelData.avgViews.toLocaleString()}
- 참여율: ${(channelData.engagementRate * 100).toFixed(2)}%
- 태그: ${channelData.tags.join(", ")}

다음을 평가하세요:

1. **신뢰도 점수 (0.0–1.0)**
   - 0.0–0.3: 신뢰할 수 없음 (스팸, 저품질)
   - 0.3–0.6: 낮음 (새로운 채널, 불안정)
   - 0.6–0.8: 중간 (일반적인 채널)
   - 0.8–1.0: 높음 (확립된 채널)

2. **위험 플래그** (해당 사항 모두 나열)
   - spam: 스팸 또는 사기성 콘텐츠
   - misleading: 오도하는 정보
   - inactive: 활동 부족 (최근 영상 없음)
   - lowEngagement: 참여율 저조
   - suspicious: 의심스러운 성장 패턴

3. **평가 근거** (1–2문장)

응답 형식 (JSON):
{
  "score": 0.75,
  "trusted": true,
  "flags": [],
  "reason": "..."
}

언어: ${lang}
`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const filterResult = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

  return {
    ...state,
    filters: filterResult,
  };
}

// [Node 2] quickSummaryGPT — GPT로 빠른 요약
export async function quickSummaryGPT(state) {
  const { channelData, lang } = state;

  const prompt = `
YouTube 채널을 간결하게 분석해주세요.

채널: ${channelData.title}
설명: ${channelData.description}
구독자: ${channelData.subscriberCount}

응답 (JSON):
{
  "summary": "한 문장 요약",
  "contentType": "교육/엔터테인먼트/뉴스 등",
  "targetAudience": "주요 시청자 층",
  "strengths": ["강점1", "강점2"]
}

언어: ${lang}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const responseText = completion.choices[0].message.content;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const analysisGPT = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

  return {
    ...state,
    analysisGPT,
  };
}

// [Node 3] deepAnalysisClaude — Claude로 깊은 분석
export async function deepAnalysisClaude(state) {
  const { channelData, lang } = state;

  const prompt = `
YouTube 채널 전략을 깊이 있게 분석해주세요.

채널: ${channelData.title}
설명: ${channelData.description}
구독자: ${channelData.subscriberCount}
평균 조회수: ${channelData.avgViews}

분석 항목:
1. 채널 전략 (콘텐츠 계획, 포지셔닝)
2. 독특한 가치 제안
3. 성장성 (high/medium/low)
4. 리스크 (3–5개)

응답 (JSON):
{
  "strategy": "...",
  "uniqueValue": "...",
  "growthPotential": "high",
  "risks": ["리스크1", "리스크2"]
}

언어: ${lang}
`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const analysisClaude = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

  return {
    ...state,
    analysisClaude,
  };
}

// [Node 4] categorizeGemini — Gemini (또는 Claude 폴백) 분류
export async function categorizeGemini(state) {
  const { channelData, lang } = state;

  // Gemini API 키 확인
  if (!process.env.GEMINI_API_KEY) {
    // 폴백: Claude 사용
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `
채널 분류 (JSON):
{"primaryCategory": "${channelData.category}", "secondaryCategories": [], "contentTone": "general", "confidence": 0.8}
`,
        },
      ],
    });
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const analysisGemini = JSON.parse(
      responseText.match(/\{[\s\S]*\}/)?.[0] || "{}"
    );
    return { ...state, analysisGemini };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
채널 분류: ${channelData.title}
설명: ${channelData.description}

JSON 응답:
{
  "primaryCategory": "카테고리",
  "secondaryCategories": ["서브1"],
  "contentTone": "educate|entertain|inform",
  "confidence": 0.9
}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const analysisGemini = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

  return {
    ...state,
    analysisGemini,
  };
}

// [Node 5] synthesizeReport — Claude로 최종 보고서 작성
export async function synthesizeReport(state) {
  const {
    channelData,
    filters,
    analysisGPT,
    analysisClaude,
    analysisGemini,
    lang,
  } = state;

  if (!filters.trusted) {
    return {
      ...state,
      report: {
        channelId: channelData.id,
        timestamp: new Date().toISOString(),
        language: lang,
        filter: filters,
        synthesisReport: {
          overallScore: Math.floor(filters.score * 100),
          recommendation: "not_recommended",
          executiveSummary: `이 채널은 신뢰도가 낮습니다. (점수: ${filters.score.toFixed(
            2
          )})`,
          keyInsights: filters.flags,
          recommendations: ["채널 재평가 필요", "콘텐츠 품질 개선 대기"],
        },
      },
    };
  }

  const prompt = `
종합 분석 보고서를 작성해주세요.

채널: ${channelData.title}
신뢰도 검증:
- 점수: ${filters.score}
- 위험 플래그: ${filters.flags.join(", ")}

분석 결과:
- GPT 분석: ${JSON.stringify(analysisGPT)}
- Claude 분석: ${JSON.stringify(analysisClaude)}
- Gemini 분류: ${JSON.stringify(analysisGemini)}

응답 (JSON):
{
  "overallScore": 85,
  "recommendation": "recommended",
  "executiveSummary": "...",
  "keyInsights": ["인사이트1", "인사이트2"],
  "recommendations": ["추천1", "추천2"]
}

언어: ${lang}
`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const synthesisReport = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

  const report = {
    channelId: channelData.id,
    timestamp: new Date().toISOString(),
    language: lang,
    filter: filters,
    analysisGPT,
    analysisClaude,
    analysisGemini,
    synthesisReport,
  };

  return {
    ...state,
    report,
  };
}

// [Conditional Node] shouldProceed
export async function shouldProceed(state) {
  // 신뢰도 < 0.4이면 분석 스킵
  if (state.filters?.score < 0.4) {
    return "end";
  }
  return "analyze";
}
```

### 3.4 그래프 구성 (LangGraph)

```javascript
// lib/graph/index.js

import { StateGraph, START, END } from "@langchain/langgraph";
import {
  validateChannel,
  quickSummaryGPT,
  deepAnalysisClaude,
  categorizeGemini,
  synthesizeReport,
  shouldProceed,
} from "./nodes.js";

export function createChannelAnalysisGraph() {
  const graph = new StateGraph({
    channels: [
      {
        name: "channelId",
        type: "string",
      },
      {
        name: "channelData",
        type: "object",
      },
      {
        name: "lang",
        type: "string",
        default: "en",
      },
      {
        name: "analysisType",
        type: "string",
        default: "deep",
      },
      {
        name: "filters",
        type: "object",
        default: null,
      },
      {
        name: "analysisGPT",
        type: "object",
        default: null,
      },
      {
        name: "analysisClaude",
        type: "object",
        default: null,
      },
      {
        name: "analysisGemini",
        type: "object",
        default: null,
      },
      {
        name: "report",
        type: "object",
        default: null,
      },
      {
        name: "errors",
        type: "array",
        default: [],
      },
    ],
  });

  // 노드 등록
  graph.addNode("validateChannel", validateChannel);
  graph.addNode("quickSummaryGPT", quickSummaryGPT);
  graph.addNode("deepAnalysisClaude", deepAnalysisClaude);
  graph.addNode("categorizeGemini", categorizeGemini);
  graph.addNode("synthesizeReport", synthesizeReport);

  // 엣지 구성
  graph.addEdge(START, "validateChannel");

  // 조건부 분기
  graph.addConditionalEdges("validateChannel", shouldProceed, {
    end: END,
    analyze: "quickSummaryGPT",
  });

  // 병렬 실행 (Promise.all 활용)
  graph.addNode("parallelAnalysis", async (state) => {
    const [gpt, claude, gemini] = await Promise.all([
      quickSummaryGPT(state),
      deepAnalysisClaude(state),
      categorizeGemini(state),
    ]);
    return { ...state, ...gpt, ...claude, ...gemini };
  });

  graph.addEdge("validateChannel", "parallelAnalysis");
  graph.addEdge("parallelAnalysis", "synthesizeReport");
  graph.addEdge("synthesizeReport", END);

  return graph.compile();
}
```

---

## 🔌 4. API 엔드포인트

### 4.1 `/api/analyze-channel` (POST)

**목적:** 채널을 멀티 LLM으로 분석하고 보고서 생성

**요청:**
```json
{
  "channelId": "UCxxxx",
  "analysisType": "deep",
  "lang": "ko"
}
```

**응답:**
```json
{
  "success": true,
  "report": {
    "channelId": "UCxxxx",
    "timestamp": "2026-06-29T12:00:00Z",
    "language": "ko",
    "filter": {
      "score": 0.82,
      "trusted": true,
      "flags": [],
      "reason": "안정적인 채널, 높은 참여율"
    },
    "synthesisReport": {
      "overallScore": 82,
      "recommendation": "recommended",
      "executiveSummary": "...",
      "keyInsights": ["...", "..."],
      "recommendations": ["...", "..."]
    }
  },
  "processingTime": 4.2
}
```

**구현:**
```javascript
// api/analyze-channel.js

import { createChannelAnalysisGraph } from "../lib/graph/index.js";
import { fetchChannelData } from "../lib/youtube.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channelId, analysisType = "deep", lang = "en" } = req.body;

  if (!channelId) {
    return res.status(400).json({ error: "Missing channelId" });
  }

  try {
    const startTime = Date.now();

    // 1. YouTube에서 채널 데이터 조회
    const channelData = await fetchChannelData(channelId);

    // 2. LangGraph 워크플로 실행
    const graph = createChannelAnalysisGraph();
    const state = await graph.invoke({
      channelId,
      channelData,
      lang,
      analysisType,
    });

    // 3. DB에 결과 저장
    await saveAnalysisResult(state.report);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    res.status(200).json({
      success: true,
      report: state.report,
      processingTime: parseFloat(processingTime),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export const config = { runtime: "edge" };
```

### 4.2 `/api/recommend-videos` (POST)

**목적:** 채널의 영상을 필터링 및 추천

**요청:**
```json
{
  "channelId": "UCxxxx",
  "criteria": {
    "minViews": 10000,
    "maxAge": 30,
    "keywords": ["AI", "Claude"]
  },
  "lang": "ko"
}
```

**응답:**
```json
{
  "success": true,
  "recommendations": [
    {
      "videoId": "...",
      "title": "...",
      "views": 50000,
      "score": 0.92,
      "reason": "Claude의 관심사와 일치하며 높은 참여율"
    }
  ]
}
```

### 4.3 `/api/filter-channels` (POST)

**목적:** 여러 채널을 빠르게 필터링

**요청:**
```json
{
  "channels": [
    { "id": "UCxxxx", "title": "..." },
    { "id": "UCyyyy", "title": "..." }
  ],
  "threshold": 0.6,
  "lang": "ko"
}
```

**응답:**
```json
{
  "success": true,
  "filtered": [
    {
      "channelId": "UCxxxx",
      "score": 0.82,
      "trusted": true,
      "reason": "..."
    }
  ],
  "filtered_count": 1,
  "total_count": 2
}
```

---

## 💾 5. 데이터베이스 스키마 확장

### 5.1 새 테이블: `channel_analyses`

```sql
CREATE TABLE channel_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id VARCHAR(50) NOT NULL,
  analysis_date TIMESTAMP DEFAULT NOW(),
  language VARCHAR(10) DEFAULT 'en',
  analysis_type VARCHAR(20),
  
  -- 필터링 결과
  filter_score DECIMAL(3,2),
  filter_trusted BOOLEAN,
  filter_flags JSONB,
  filter_reason TEXT,
  
  -- LLM 분석 결과
  gpt_summary JSONB,
  claude_analysis JSONB,
  gemini_classification JSONB,
  perplexity_trends JSONB,
  
  -- 종합 점수 및 추천
  overall_score INT,
  recommendation VARCHAR(50),
  executive_summary TEXT,
  key_insights JSONB,
  recommendations JSONB,
  
  -- 캐싱 및 메타
  cache_ttl_hours INT DEFAULT 24,
  processed_at TIMESTAMP,
  processing_time_ms INT,
  
  UNIQUE(channel_id, analysis_date, language)
);

CREATE INDEX idx_channel_analyses_channel ON channel_analyses(channel_id);
CREATE INDEX idx_channel_analyses_date ON channel_analyses(analysis_date DESC);
```

### 5.2 새 테이블: `video_recommendations`

```sql
CREATE TABLE video_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id VARCHAR(50) NOT NULL,
  video_id VARCHAR(50) NOT NULL,
  recommendation_score DECIMAL(3,2),
  recommendation_reason TEXT,
  criteria_match JSONB, -- { minViews: true, keywords: true, ... }
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE INDEX idx_video_recommendations_channel ON video_recommendations(channel_id);
```

### 5.3 마이그레이션 스크립트

```javascript
// db/migrations/001_add_channel_analyses.js

import { migrate } from "postgres-migrations";

export async function up(client) {
  await client.query(`
    CREATE TABLE channel_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id VARCHAR(50) NOT NULL,
      analysis_date TIMESTAMP DEFAULT NOW(),
      language VARCHAR(10) DEFAULT 'en',
      analysis_type VARCHAR(20),
      filter_score DECIMAL(3,2),
      filter_trusted BOOLEAN,
      filter_flags JSONB,
      filter_reason TEXT,
      gpt_summary JSONB,
      claude_analysis JSONB,
      gemini_classification JSONB,
      perplexity_trends JSONB,
      overall_score INT,
      recommendation VARCHAR(50),
      executive_summary TEXT,
      key_insights JSONB,
      recommendations JSONB,
      cache_ttl_hours INT DEFAULT 24,
      processed_at TIMESTAMP,
      processing_time_ms INT,
      UNIQUE(channel_id, analysis_date, language)
    );

    CREATE INDEX idx_channel_analyses_channel ON channel_analyses(channel_id);
    CREATE INDEX idx_channel_analyses_date ON channel_analyses(analysis_date DESC);

    CREATE TABLE video_recommendations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id VARCHAR(50) NOT NULL,
      video_id VARCHAR(50) NOT NULL,
      recommendation_score DECIMAL(3,2),
      recommendation_reason TEXT,
      criteria_match JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );

    CREATE INDEX idx_video_recommendations_channel ON video_recommendations(channel_id);
  `);
}

export async function down(client) {
  await client.query("DROP TABLE IF EXISTS video_recommendations;");
  await client.query("DROP TABLE IF EXISTS channel_analyses;");
}
```

---

## 🎨 6. 프론트엔드 UX 설계

### 6.1 새 화면: Channel Intelligence Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  PlayRank · Channel Intelligence                   ⚙️   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📊 Analyze a Channel                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Channel URL or ID: [UC_____________________________] │  │
│  │ Analysis Type: [⬇️ Deep Analysis]                  │  │
│  │ Language:     [⬇️ English]                        │  │
│  │                          [🔍 Analyze]            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
│  ✅ Trust Score:        82/100  ▓▓▓▓▓▓░░░░             │
│  ┌─ Verification ──────────────────────────────────┐  │
│  │ ✓ Active channel with high engagement            │  │
│  │ ✓ Consistent upload schedule                     │  │
│  │ ⚠️  No recent verification badge                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                           │
│  📈 Multi-LLM Analysis                                  │
│  ┌─ OpenAI GPT ─────────────────────────────────┐  │
│  │ Content Type: Educational / Tutorial           │  │
│  │ Target Audience: Tech enthusiasts, age 18–45  │  │
│  └────────────────────────────────────────────┘  │
│  ┌─ Anthropic Claude ─────────────────────────┐  │
│  │ Strategy: Tutorial-first, audience-driven     │  │
│  │ Growth Potential: HIGH                        │  │
│  └────────────────────────────────────────────┘  │
│  ┌─ Google Gemini ─────────────────────────────┐  │
│  │ Primary Category: Education                   │  │
│  │ Content Tone: Informative & Engaging         │  │
│  └────────────────────────────────────────────┘  │
│                                                           │
│  🎯 Synthesis Report                                    │
│  ┌────────────────────────────────────────────┐  │
│  │ Overall Score: 82/100                      │  │
│  │ Recommendation: ✨ Highly Recommended      │  │
│  │                                             │  │
│  │ Executive Summary:                          │  │
│  │ This channel demonstrates strong content   │  │
│  │ quality and consistent engagement. Ideal  │  │
│  │ for collaborative opportunities.           │  │
│  │                                             │  │
│  │ Key Insights:                               │  │
│  │ • Strong niche positioning                  │  │
│  │ • High audience loyalty (engagement 8.2%)  │  │
│  │ • Growth trajectory: +12% YoY              │  │
│  │                                             │  │
│  │ Recommendations:                            │  │
│  │ • Cross-promote with similar channels       │  │
│  │ • Increase video frequency to 2/week      │  │
│  └────────────────────────────────────────────┘  │
│                                                           │
│  💾 [Export as PDF]  [Share]  [Save to Favorites]     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 6.2 React 컴포넌트 구조

```typescript
// src/components/ChannelIntelligence.tsx

import { useState } from 'react';
import { useChannelAnalysis } from '../hooks/useChannelAnalysis';
import TrustScoreCard from './TrustScoreCard';
import LLMAnalysisPanel from './LLMAnalysisPanel';
import SynthesisReport from './SynthesisReport';

export default function ChannelIntelligence() {
  const [channelId, setChannelId] = useState('');
  const [analysisType, setAnalysisType] = useState('deep');
  const [lang, setLang] = useState('en');

  const { report, loading, error, analyze } = useChannelAnalysis();

  const handleAnalyze = async () => {
    await analyze({ channelId, analysisType, lang });
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Channel Intelligence Dashboard</h1>

      {/* Input Section */}
      <div className="bg-card p-6 rounded-lg space-y-4">
        <input
          type="text"
          placeholder="Channel URL or ID"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
        <div className="grid grid-cols-2 gap-4">
          <select value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
            <option value="quick">Quick Analysis</option>
            <option value="deep">Deep Analysis</option>
            <option value="trend">Trend Tracking</option>
          </select>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ko">한국어</option>
            <option value="ja">日本語</option>
          </select>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !channelId}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {/* Error Handling */}
      {error && <div className="bg-red-100 p-4 rounded text-red-700">{error}</div>}

      {/* Results */}
      {report && (
        <div className="space-y-6">
          <TrustScoreCard filter={report.filter} />
          <LLMAnalysisPanel
            gpt={report.analysisGPT}
            claude={report.analysisClaude}
            gemini={report.analysisGemini}
          />
          <SynthesisReport synthesis={report.synthesisReport} />
        </div>
      )}
    </div>
  );
}
```

### 6.3 커스텀 훅: `useChannelAnalysis`

```typescript
// src/hooks/useChannelAnalysis.ts

import { useState } from 'react';

interface AnalyzeParams {
  channelId: string;
  analysisType: string;
  lang: string;
}

export function useChannelAnalysis() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async (params: AnalyzeParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { report, loading, error, analyze };
}
```

---

## 🚀 7. 배포 및 운영

### 7.1 환경변수 설정

```bash
# .env.local (개발)

# LLM APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIzaSy...
PERPLEXITY_API_KEY=pplx-...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/playrank

# LangGraph
LANGGRAPH_API_KEY=... (선택)

# YouTube API
YOUTUBE_API_KEY=...

# 모니터링
SENTRY_DSN=...
```

### 7.2 Vercel 배포 체크리스트

```yaml
배포 전 확인 사항:
  - ✅ LLM API 키 등록 (Vercel Environment Variables)
  - ✅ Database 마이그레이션 실행
  - ✅ 엣지 런타임 설정 확인 (export const config = { runtime: 'edge' })
  - ✅ API 응답 타임아웃 설정 (Vercel: 기본 30초, Pro/Entreprise는 60초)
  - ✅ LangGraph 의존성 번들 최적화

배포 스크립트:
  npm run build
  vercel deploy --prod
```

### 7.3 모니터링 및 로깅

```javascript
// lib/monitoring.js

import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export function captureAnalysisMetrics(channelId, processingTime, success) {
  Sentry.captureMessage(
    `Channel analysis: ${channelId} (${processingTime}ms) - ${success ? "OK" : "FAILED"}`,
    "info"
  );
}

export function captureAnalysisError(channelId, error) {
  Sentry.captureException(error, {
    tags: { channelId },
  });
}
```

---

## 📋 8. 구현 로드맵

### Phase 1: 기초 (주 1–2)

- [ ] LangGraph 기본 그래프 구조 설계
- [ ] 노드 단위 테스트 (validateChannel, quickSummaryGPT)
- [ ] Neon DB 스키마 생성 및 마이그레이션

### Phase 2: 멀티 LLM 통합 (주 2–3)

- [ ] Claude, GPT, Gemini API 통합
- [ ] 병렬 노드 실행 최적화
- [ ] 폴백 전략 구현 (API 키 미제공 시)

### Phase 3: API 및 프론트엔드 (주 3–4)

- [ ] `/api/analyze-channel` 엔드포인트 구현
- [ ] `/api/filter-channels` 엔드포인트 구현
- [ ] React 대시보드 UI 구현
- [ ] 스트리밍 응답 최적화

### Phase 4: 테스트 및 배포 (주 4–5)

- [ ] E2E 테스트 (기능 테스트)
- [ ] 부하 테스트 (동시 분석 요청)
- [ ] Vercel 배포 및 모니터링
- [ ] 문서화 및 사용자 가이드

---

## 🧪 9. 테스트 전략

### 9.1 단위 테스트 (Jest)

```javascript
// lib/graph/nodes.test.js

import { describe, it, expect, beforeAll } from '@jest/globals';
import { validateChannel } from './nodes.js';

describe('validateChannel', () => {
  it('should return high score for trusted channel', async () => {
    const state = {
      channelData: {
        id: 'UCtest',
        title: 'Test Channel',
        description: 'A trusted channel',
        subscriberCount: 100000,
        viewCount: 10000000,
        avgViews: 50000,
        engagementRate: 0.08,
        tags: ['technology'],
        category: 'Tech',
      },
      lang: 'en',
    };

    const result = await validateChannel(state);
    expect(result.filters.score).toBeGreaterThan(0.6);
    expect(result.filters.trusted).toBe(true);
  });

  it('should flag suspicious channels', async () => {
    const state = {
      channelData: {
        subscriberCount: 1000000,
        viewCount: 5000,
        avgViews: 5,
        engagementRate: 0.001,
        // ... 의심스러운 데이터
      },
      lang: 'en',
    };

    const result = await validateChannel(state);
    expect(result.filters.flags).toContain('suspicious');
  });
});
```

### 9.2 통합 테스트

```javascript
// lib/graph/index.test.js

describe('ChannelAnalysisGraph', () => {
  it('should execute full analysis workflow', async () => {
    const graph = createChannelAnalysisGraph();
    const state = await graph.invoke({
      channelId: 'UCtest',
      channelData: mockChannelData,
      lang: 'en',
      analysisType: 'deep',
    });

    expect(state.report).toBeDefined();
    expect(state.report.synthesisReport.overallScore).toBeGreaterThanOrEqual(0);
    expect(state.report.synthesisReport.overallScore).toBeLessThanOrEqual(100);
  });

  it('should handle API failures gracefully', async () => {
    // Gemini API 키 없이 테스트
    delete process.env.GEMINI_API_KEY;

    const graph = createChannelAnalysisGraph();
    const state = await graph.invoke({
      channelId: 'UCtest',
      channelData: mockChannelData,
      lang: 'en',
      analysisType: 'deep',
    });

    // Claude 폴백으로 계속 실행됨
    expect(state.report).toBeDefined();
    expect(state.errors.length).toBe(0); // 폴백 성공
  });
});
```

### 9.3 성능 테스트 (Benchmarking)

```javascript
// lib/graph/benchmark.js

import { createChannelAnalysisGraph } from './index.js';

async function benchmarkAnalysis() {
  const graph = createChannelAnalysisGraph();
  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await graph.invoke({
      channelId: 'UCtest',
      channelData: mockChannelData,
      lang: 'en',
      analysisType: 'deep',
    });
    times.push(Date.now() - start);
  }

  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Min: ${min}ms`);
  console.log(`Max: ${max}ms`);
}

benchmarkAnalysis();
```

---

## 📚 10. 교육 연계 (Goorm 80H 커리큘럼)

| Day | 주제 | PlayRank 연계 |
|-----|------|-------------|
| 15 | **목적형 대화 챗봇** (Function Calling) | 채널 필터링 에이전트 구현 |
| 16 | **RAG 챗봇** (ChromaDB) | 채널 설명 임베딩 + 관련 콘텐츠 검색 |
| 17 | **Agentic RAG** (LangGraph) | PlayRank 멀티 LLM 워크플로 (필터링 → 병렬 분석 → 통합) |

**학습 목표:**
- ✅ LangGraph 그래프 구조 설계 및 구현
- ✅ 멀티 LLM API 오케스트레이션
- ✅ 에러 핸들링 및 폴백 전략
- ✅ Vercel Edge Functions 최적화
- ✅ 실제 프로덕션 앱 배포

---

## 📞 11. FAQ & 트러블슈팅

### Q1: LangGraph의 장점은?

**A:** LangGraph는 복잡한 에이전트 워크플로를 선언적으로 정의할 수 있게 해줍니다.
- 노드 단위 테스트 용이
- 조건부 분기 및 병렬 실행 지원
- 실행 추적(tracing) 내장
- 인상적인 학습 곡선

### Q2: 병렬 실행 시 타임아웃 위험은?

**A:** Vercel Edge Functions는 기본 30초 타임아웃을 가집니다.
- Pro/Enterprise는 60초 지원
- Promise.all() 사용 시 가장 느린 요청 + 마진 = ~5초
- 타임아웃 단축: `analysisType: "quick"` → 병렬 노드 1–2개만 실행

### Q3: API 키 없을 때 어떻게 되나?

**A:** 폴백 전략:
- Gemini 키 없음 → Claude로 분류 작업 대체 ✅
- Perplexity 키 없음 → GPT로 트렌드 분석 대체 ✅
- GPT 또는 Claude 키 없음 → 에러 반환 (필수)

### Q4: 캐싱 전략은?

**A:** 24시간 Neon DB 캐시
- 같은 채널 재분석 → 캐시 반환 (즉시, 비용 0)
- 다른 언어 분석 → 새 분석 (캐시 키: `channelId:lang`)

---

## 📖 12. 참고 자료

- [LangGraph Documentation](https://python.langchain.com/docs/langgraph)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [LangChain TypeScript](https://js.langchain.com/)

---

**문서 버전 히스토리:**
- v2.0 (2026.06.29): 초안 작성 — LangGraph 워크플로, 멀티 LLM 통합, API 설계
- v1.0 (2026.06.18): 개념 기획

**승인:**
- 강사: 동준상 (naebon@naver.com)
- 프로젝트: PlayRank v2.0 (YouTube 채널 랭킹 + AI 인사이트)
