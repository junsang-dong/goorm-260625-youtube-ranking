// Lightweight, Edge-safe orchestrator that mirrors the spec's LangGraph
// workflow without the heavy dependency:
//   validateChannel -> (gate) -> parallel analysis -> synthesizeReport
// Errors from individual nodes are collected and the workflow proceeds with
// whatever partial results are available.

import { has } from '../llm/clients.js'
import {
  validateChannel,
  quickSummaryGPT,
  deepAnalysisClaude,
  categorizeGemini,
  trendPerplexity,
  synthesizeReport,
} from './nodes.js'

const TRUST_GATE = 0.4

/** Run a node, capturing any error into the errors list instead of throwing. */
async function safeNode(label, fn, state, errors) {
  try {
    return await fn(state)
  } catch (err) {
    errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`)
    return {}
  }
}

/**
 * Merge a node patch into the shared state. The `metrics` key is accumulated
 * across nodes (so parallel patches don't overwrite each other); everything
 * else is a plain assign.
 */
function mergePatch(state, patch) {
  if (!patch) return
  const { metrics, ...rest } = patch
  Object.assign(state, rest)
  if (metrics) state.metrics = { ...(state.metrics || {}), ...metrics }
}

/** Aggregate per-call metrics into a totals summary for the whole run. */
function summarizeMetrics(metrics) {
  const calls = Object.values(metrics || {})
  return {
    llmCalls: calls.length,
    totalTokens: calls.reduce((sum, m) => sum + (m.totalTokens || 0), 0),
    totalCostUsd: calls.reduce((sum, m) => sum + (m.costUsd || 0), 0),
  }
}

function notRecommendedReport(channelData, lang, filters) {
  return {
    channelId: channelData.channelId || channelData.id,
    timestamp: new Date().toISOString(),
    language: lang,
    filter: filters,
    synthesisReport: {
      overallScore: Math.round((filters?.score || 0) * 100),
      recommendation: 'not_recommended',
      executiveSummary:
        lang === 'ko'
          ? `이 채널은 신뢰도가 낮습니다. (점수: ${(filters?.score ?? 0).toFixed(2)})`
          : `This channel has low trustworthiness. (score: ${(filters?.score ?? 0).toFixed(2)})`,
      keyInsights: filters?.flags || [],
      recommendations: [],
    },
  }
}

/**
 * Execute the multi-LLM channel analysis workflow.
 * @param {{channelId:string, channelData:object, lang?:string, analysisType?:'quick'|'deep'|'trend'}} input
 * @returns {Promise<{report:object, errors:string[]}>}
 */
export async function runChannelAnalysis(input) {
  const { channelData, lang = 'en', analysisType = 'deep' } = input
  const errors = []
  const state = { channelId: input.channelId, channelData, lang, analysisType, errors }

  // GPT and Claude are required (Claude may fall back to GPT inside nodes,
  // but at minimum OpenAI must be configured).
  if (!has('openai') && !has('anthropic')) {
    throw new Error('At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY is required')
  }

  // 1. Trust validation gate.
  mergePatch(state, await safeNode('validateChannel', validateChannel, state, errors))
  if (!state.filters) {
    state.filters = { score: 0, trusted: false, flags: ['suspicious'], reason: 'validation failed' }
  }

  if ((state.filters.score ?? 0) < TRUST_GATE) {
    const report = notRecommendedReport(channelData, lang, state.filters)
    report.metrics = state.metrics || {}
    report.metricsSummary = summarizeMetrics(state.metrics)
    return { report, errors }
  }

  // 2. Parallel analysis. "quick" runs only the GPT summary + classification.
  const nodes = [
    safeNode('quickSummaryGPT', quickSummaryGPT, state, errors),
    safeNode('categorizeGemini', categorizeGemini, state, errors),
  ]
  if (analysisType !== 'quick') {
    nodes.push(safeNode('deepAnalysisClaude', deepAnalysisClaude, state, errors))
  }
  if (analysisType === 'trend' || analysisType === 'deep') {
    nodes.push(safeNode('trendPerplexity', trendPerplexity, state, errors))
  }

  const results = await Promise.all(nodes)
  for (const patch of results) mergePatch(state, patch)

  // 3. Synthesis.
  mergePatch(state, await safeNode('synthesizeReport', synthesizeReport, state, errors))

  const report = {
    channelId: channelData.channelId || channelData.id,
    timestamp: new Date().toISOString(),
    language: lang,
    filter: state.filters,
    analysisGPT: state.analysisGPT || null,
    analysisClaude: state.analysisClaude || null,
    analysisGemini: state.analysisGemini || null,
    trendPerplexity: state.trendPerplexity || null,
    synthesisReport: state.synthesisReport || {
      overallScore: Math.round((state.filters.score || 0) * 100),
      recommendation: 'neutral',
      executiveSummary: '',
      keyInsights: [],
      recommendations: [],
    },
    metrics: state.metrics || {},
    metricsSummary: summarizeMetrics(state.metrics),
  }

  return { report, errors }
}
