import { getSql } from '../lib/db/client.js'
import { jsonResponse, errorResponse } from '../lib/api-utils.js'
import { fetchChannelDetail } from '../lib/youtube/channelDetail.js'
import { runChannelAnalysis } from '../lib/graph/orchestrator.js'

export const config = { runtime: 'edge' }

const SUPPORTED_LANGS = ['en', 'ko', 'ja', 'zh']
const ANALYSIS_TYPES = ['quick', 'deep', 'trend']
const CACHE_TTL_HOURS = 24

function rowToReport(row) {
  return {
    channelId: row.channel_id,
    timestamp: row.processed_at,
    language: row.language,
    filter: {
      score: row.filter_score !== null ? Number(row.filter_score) : 0,
      trusted: row.filter_trusted ?? false,
      flags: row.filter_flags || [],
      reason: row.filter_reason || '',
    },
    analysisGPT: row.gpt_summary || null,
    analysisClaude: row.claude_analysis || null,
    analysisGemini: row.gemini_classification || null,
    trendPerplexity: row.perplexity_trends || null,
    synthesisReport: {
      overallScore: row.overall_score ?? 0,
      recommendation: row.recommendation || 'neutral',
      executiveSummary: row.executive_summary || '',
      keyInsights: row.key_insights || [],
      recommendations: row.recommendations || [],
    },
    metrics: row.metrics || {},
    metricsSummary: summarizeMetrics(row.metrics),
  }
}

function summarizeMetrics(metrics) {
  const calls = Object.values(metrics || {})
  return {
    llmCalls: calls.length,
    totalTokens: calls.reduce((sum, m) => sum + (m.totalTokens || 0), 0),
    totalCostUsd: calls.reduce((sum, m) => sum + (m.costUsd || 0), 0),
  }
}

async function getCached(sql, channelId, lang, analysisType) {
  const rows = await sql`
    SELECT * FROM channel_analyses
    WHERE channel_id = ${channelId}
      AND language = ${lang}
      AND analysis_type = ${analysisType}
      AND processed_at > NOW() - (${CACHE_TTL_HOURS} || ' hours')::interval
    LIMIT 1
  `
  return rows[0] || null
}

async function saveAnalysis(sql, report, analysisType, processingTimeMs) {
  const f = report.filter || {}
  const s = report.synthesisReport || {}
  await sql`
    INSERT INTO channel_analyses (
      channel_id, language, analysis_type,
      filter_score, filter_trusted, filter_flags, filter_reason,
      gpt_summary, claude_analysis, gemini_classification, perplexity_trends,
      overall_score, recommendation, executive_summary, key_insights, recommendations,
      metrics, processing_time_ms, processed_at
    ) VALUES (
      ${report.channelId}, ${report.language}, ${analysisType},
      ${f.score ?? null}, ${f.trusted ?? null}, ${JSON.stringify(f.flags || [])}::jsonb, ${f.reason || null},
      ${JSON.stringify(report.analysisGPT)}::jsonb, ${JSON.stringify(report.analysisClaude)}::jsonb,
      ${JSON.stringify(report.analysisGemini)}::jsonb, ${JSON.stringify(report.trendPerplexity)}::jsonb,
      ${s.overallScore ?? null}, ${s.recommendation || null}, ${s.executiveSummary || null},
      ${JSON.stringify(s.keyInsights || [])}::jsonb, ${JSON.stringify(s.recommendations || [])}::jsonb,
      ${JSON.stringify(report.metrics || {})}::jsonb, ${processingTimeMs}, NOW()
    )
    ON CONFLICT (channel_id, language, analysis_type) DO UPDATE SET
      filter_score = EXCLUDED.filter_score,
      filter_trusted = EXCLUDED.filter_trusted,
      filter_flags = EXCLUDED.filter_flags,
      filter_reason = EXCLUDED.filter_reason,
      gpt_summary = EXCLUDED.gpt_summary,
      claude_analysis = EXCLUDED.claude_analysis,
      gemini_classification = EXCLUDED.gemini_classification,
      perplexity_trends = EXCLUDED.perplexity_trends,
      overall_score = EXCLUDED.overall_score,
      recommendation = EXCLUDED.recommendation,
      executive_summary = EXCLUDED.executive_summary,
      key_insights = EXCLUDED.key_insights,
      recommendations = EXCLUDED.recommendations,
      metrics = EXCLUDED.metrics,
      processing_time_ms = EXCLUDED.processing_time_ms,
      processed_at = NOW()
  `
}

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = await req.json()
    const channelId = body.channelId
    const lang = SUPPORTED_LANGS.includes(body.lang) ? body.lang : 'en'
    const analysisType = ANALYSIS_TYPES.includes(body.analysisType) ? body.analysisType : 'deep'

    if (!channelId) {
      return errorResponse('channelId required', 400)
    }

    const startTime = Date.now()
    const sql = getSql()

    // 1. Resolve the channel first so the cache key matches the canonical
    //    channel id (an @handle and its UC id must hit the same cache row).
    const channelData = await fetchChannelDetail(channelId)
    const resolvedId = channelData.channelId || channelData.id || channelId

    // 2. Cache lookup (keyed on the resolved id).
    try {
      const cached = await getCached(sql, resolvedId, lang, analysisType)
      if (cached) {
        return jsonResponse(
          { success: true, report: rowToReport(cached), processingTime: 0, cached: true },
          200,
        )
      }
    } catch (dbErr) {
      console.warn('Analysis cache read failed:', dbErr)
    }

    // 3. Run multi-LLM workflow.
    const { report, errors } = await runChannelAnalysis({ channelId: resolvedId, channelData, lang, analysisType })

    const processingTimeMs = Date.now() - startTime

    // 4. Persist result (non-blocking on Edge).
    const savePromise = (async () => {
      try {
        await saveAnalysis(sql, report, analysisType, processingTimeMs)
      } catch (dbErr) {
        console.warn('Analysis cache write failed:', dbErr)
      }
    })()
    if (context && typeof context.waitUntil === 'function') {
      context.waitUntil(savePromise)
    }

    return jsonResponse({
      success: true,
      report,
      processingTime: Number((processingTimeMs / 1000).toFixed(2)),
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    console.error('Analyze channel error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
}
