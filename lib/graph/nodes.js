// Multi-LLM analysis nodes. Each node takes the shared analysis state and
// returns a partial state patch. Nodes use plain fetch wrappers (Edge-safe)
// and implement the spec's fallback strategy:
//   - Gemini key missing      -> fall back to Claude
//   - Perplexity key missing   -> fall back to GPT
//   - GPT/Claude key missing   -> handled upstream (required)

import {
  callOpenAI,
  callClaude,
  callGemini,
  callPerplexity,
  estimateCostUsd,
  extractJson,
  has,
} from '../llm/clients.js'

// Build a normalized metrics record for a single LLM call.
// `result` is the { text, usage, model } object returned by a client wrapper.
function buildMeta(provider, result, ms) {
  const usage = result?.usage || {}
  const model = result?.model || ''
  return {
    provider,
    model,
    ms,
    inputTokens: usage.inputTokens || 0,
    outputTokens: usage.outputTokens || 0,
    totalTokens:
      usage.totalTokens || (usage.inputTokens || 0) + (usage.outputTokens || 0),
    costUsd: estimateCostUsd(model, usage),
  }
}

const LANG_NAMES = {
  en: 'English',
  ko: 'Korean (한국어)',
  ja: 'Japanese (日本語)',
  zh: 'Chinese (中文)',
}

function langName(lang) {
  return LANG_NAMES[lang] || LANG_NAMES.en
}

function num(value, fallback = 'unknown') {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-US')
    : fallback
}

function channelFacts(channelData) {
  const tags = Array.isArray(channelData.tags) ? channelData.tags.join(', ') : ''
  return [
    `Title: ${channelData.title || '-'}`,
    `Description: ${(channelData.description || '').slice(0, 500)}`,
    `Subscribers: ${num(channelData.subscriberCountNum)}`,
    `Total views: ${num(channelData.viewCountNum)}`,
    `Video count: ${num(channelData.videoCountNum)}`,
    `Average views (last 10): ${num(channelData.avgViewsNum)}`,
    `Engagement rate: ${
      typeof channelData.engagementRateNum === 'number'
        ? `${channelData.engagementRateNum}%`
        : 'unknown'
    }`,
    `Tags: ${tags || 'none'}`,
    `Category: ${channelData.category || 'unknown'}`,
  ].join('\n')
}

// [Node 1] validateChannel — trust scoring (Claude, GPT fallback)
export async function validateChannel(state) {
  const { channelData, lang } = state
  const prompt = `You are a YouTube channel trust evaluation expert.

Channel data:
${channelFacts(channelData)}

Evaluate the following and respond in ${langName(lang)} for text fields:

1. Trust score (0.0–1.0)
   - 0.0–0.3: untrustworthy (spam, low quality)
   - 0.3–0.6: low (new or unstable channel)
   - 0.6–0.8: medium (typical channel)
   - 0.8–1.0: high (established channel)
2. Risk flags from this set only: ["spam", "misleading", "inactive", "lowEngagement", "suspicious"]
3. A 1–2 sentence reason.

Respond ONLY with JSON in this exact shape:
{"score": 0.75, "trusted": true, "flags": [], "reason": "..."}`

  const provider = has('anthropic') ? 'anthropic' : 'openai'
  const start = Date.now()
  const result =
    provider === 'anthropic'
      ? await callClaude(prompt, { maxTokens: 700 })
      : await callOpenAI(prompt, { json: true, maxTokens: 700, temperature: 0.3 })
  const meta = buildMeta(provider, result, Date.now() - start)

  const parsed = extractJson(result.text)
  const score = typeof parsed.score === 'number' ? parsed.score : 0
  return {
    filters: {
      score,
      trusted: typeof parsed.trusted === 'boolean' ? parsed.trusted : score >= 0.6,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      reason: parsed.reason || '',
    },
    metrics: { validate: meta },
  }
}

// [Node 2] quickSummaryGPT — fast overview (GPT)
export async function quickSummaryGPT(state) {
  const { channelData, lang } = state
  const prompt = `Analyze this YouTube channel concisely.

${channelFacts(channelData)}

Respond ONLY with JSON in ${langName(lang)}:
{
  "summary": "one-sentence summary",
  "contentType": "education/entertainment/news/etc.",
  "targetAudience": "primary audience",
  "strengths": ["strength1", "strength2"]
}`

  const start = Date.now()
  const result = await callOpenAI(prompt, { json: true, maxTokens: 500 })
  const meta = buildMeta('openai', result, Date.now() - start)

  const parsed = extractJson(result.text)
  return {
    analysisGPT: {
      summary: parsed.summary || '',
      contentType: parsed.contentType || '',
      targetAudience: parsed.targetAudience || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    },
    metrics: { gpt: meta },
  }
}

// [Node 3] deepAnalysisClaude — strategy & growth (Claude, GPT fallback)
export async function deepAnalysisClaude(state) {
  const { channelData, lang } = state
  const prompt = `Analyze this YouTube channel's strategy in depth.

${channelFacts(channelData)}

Cover: 1) channel strategy & positioning, 2) unique value proposition,
3) growth potential (high/medium/low), 4) 3–5 risks.

Keep each text field concise (under ~2 sentences) so the full JSON is short.

Respond ONLY with JSON in ${langName(lang)}:
{
  "strategy": "...",
  "uniqueValue": "...",
  "growthPotential": "high",
  "risks": ["risk1", "risk2"]
}`

  const provider = has('anthropic') ? 'anthropic' : 'openai'
  const start = Date.now()
  const result =
    provider === 'anthropic'
      ? await callClaude(prompt, { maxTokens: 2000 })
      : await callOpenAI(prompt, { json: true, maxTokens: 2000 })
  const meta = buildMeta(provider, result, Date.now() - start)

  const parsed = extractJson(result.text)
  const growth = ['high', 'medium', 'low'].includes(parsed.growthPotential)
    ? parsed.growthPotential
    : 'medium'
  return {
    analysisClaude: {
      strategy: parsed.strategy || '',
      uniqueValue: parsed.uniqueValue || '',
      growthPotential: growth,
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    },
    metrics: { claude: meta },
  }
}

// [Node 4] categorizeGemini — classification (Gemini, Claude fallback)
export async function categorizeGemini(state) {
  const { channelData, lang } = state
  const prompt = `Classify this YouTube channel.

${channelFacts(channelData)}

Respond ONLY with JSON in ${langName(lang)}:
{
  "primaryCategory": "category",
  "secondaryCategories": ["sub1"],
  "contentTone": "educational|entertainment|news|informative",
  "confidence": 0.9
}`

  let provider
  let result
  const start = Date.now()
  if (has('gemini')) {
    provider = 'gemini'
    result = await callGemini(prompt)
  } else if (has('anthropic')) {
    provider = 'anthropic'
    result = await callClaude(prompt, { maxTokens: 300 })
  } else {
    provider = 'openai'
    result = await callOpenAI(prompt, { json: true, maxTokens: 300, temperature: 0.3 })
  }
  const meta = buildMeta(provider, result, Date.now() - start)

  const parsed = extractJson(result.text)
  return {
    analysisGemini: {
      primaryCategory: parsed.primaryCategory || channelData.category || 'general',
      secondaryCategories: Array.isArray(parsed.secondaryCategories)
        ? parsed.secondaryCategories
        : [],
      contentTone: parsed.contentTone || 'general',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    },
    metrics: { gemini: meta },
  }
}

// [Node 5] trendTrackerPerplexity — current trends (Perplexity, GPT fallback)
export async function trendPerplexity(state) {
  const { channelData, lang } = state
  const prompt = `Identify current trends and competitive landscape for this YouTube channel's niche.

${channelFacts(channelData)}

Respond ONLY with JSON in ${langName(lang)}:
{
  "currentTrends": ["trend1", "trend2"],
  "competitorInsight": "...",
  "marketOpportunity": "..."
}`

  const provider = has('perplexity') ? 'perplexity' : 'openai'
  const start = Date.now()
  const result = has('perplexity')
    ? await callPerplexity(prompt, { maxTokens: 500 })
    : await callOpenAI(prompt, { json: true, maxTokens: 500 })
  const meta = buildMeta(provider, result, Date.now() - start)

  const parsed = extractJson(result.text)
  return {
    trendPerplexity: {
      currentTrends: Array.isArray(parsed.currentTrends) ? parsed.currentTrends : [],
      competitorInsight: parsed.competitorInsight || '',
      marketOpportunity: parsed.marketOpportunity || '',
    },
    metrics: { perplexity: meta },
  }
}

// [Node 6] synthesizeReport — final integrated report (Claude, GPT fallback)
export async function synthesizeReport(state) {
  const { channelData, filters, analysisGPT, analysisClaude, analysisGemini, trendPerplexity, lang } =
    state

  const prompt = `Write an integrated channel analysis report.

Channel: ${channelData.title}
Trust verification:
- Score: ${filters?.score}
- Risk flags: ${(filters?.flags || []).join(', ') || 'none'}

Analysis results:
- GPT summary: ${JSON.stringify(analysisGPT || {})}
- Claude deep analysis: ${JSON.stringify(analysisClaude || {})}
- Gemini classification: ${JSON.stringify(analysisGemini || {})}
- Perplexity trends: ${JSON.stringify(trendPerplexity || {})}

Resolve any conflicts and produce a final verdict.
recommendation must be one of: "highly_recommended", "recommended", "neutral", "not_recommended".

Respond ONLY with JSON in ${langName(lang)}:
{
  "overallScore": 85,
  "recommendation": "recommended",
  "executiveSummary": "...",
  "keyInsights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"]
}`

  const provider = has('anthropic') ? 'anthropic' : 'openai'
  const start = Date.now()
  const result =
    provider === 'anthropic'
      ? await callClaude(prompt, { maxTokens: 2000 })
      : await callOpenAI(prompt, { json: true, maxTokens: 2000 })
  const meta = buildMeta(provider, result, Date.now() - start)

  const parsed = extractJson(result.text)
  const validRecs = ['highly_recommended', 'recommended', 'neutral', 'not_recommended']
  return {
    metrics: { synthesis: meta },
    synthesisReport: {
      overallScore:
        typeof parsed.overallScore === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
          : Math.round((filters?.score || 0) * 100),
      recommendation: validRecs.includes(parsed.recommendation)
        ? parsed.recommendation
        : 'neutral',
      executiveSummary: parsed.executiveSummary || '',
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    },
  }
}
