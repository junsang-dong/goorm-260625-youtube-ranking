// Lightweight, Edge-compatible LLM client wrappers (pure fetch, no SDKs).
// Each wrapper returns the raw text content from the model. JSON parsing is
// handled separately via extractJson so a single helper covers every provider.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar'

// Approximate public list prices in USD per 1,000,000 tokens as [input, output].
// Matched by model-name substring so future minor revisions still resolve.
const PRICING = {
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-4o': [2.5, 10],
  'gpt-4.1-mini': [0.4, 1.6],
  'gpt-4.1': [2, 8],
  'claude-haiku': [0.8, 4],
  'claude-sonnet': [3, 15],
  'claude-opus': [15, 75],
  'gemini-2.5-flash': [0.3, 2.5],
  'gemini-1.5-flash': [0.075, 0.3],
  'gemini-1.5-pro': [1.25, 5],
  sonar: [1, 1],
}

function priceFor(model = '') {
  const m = String(model).toLowerCase()
  for (const key of Object.keys(PRICING)) {
    if (m.includes(key)) return PRICING[key]
  }
  return null
}

/**
 * Estimate the USD cost of a single LLM call from its token usage.
 * @param {string} model
 * @param {{inputTokens?:number, outputTokens?:number}} usage
 * @returns {number|null} cost in USD, or null when the model price is unknown
 */
export function estimateCostUsd(model, usage) {
  const price = priceFor(model)
  if (!price || !usage) return null
  const input = usage.inputTokens || 0
  const output = usage.outputTokens || 0
  return (input / 1e6) * price[0] + (output / 1e6) * price[1]
}

/**
 * Whether a given provider has its API key configured.
 * @param {'openai'|'anthropic'|'gemini'|'perplexity'} provider
 */
export function has(provider) {
  switch (provider) {
    case 'openai':
      return Boolean(process.env.OPENAI_API_KEY)
    case 'anthropic':
      return Boolean(process.env.ANTHROPIC_API_KEY)
    case 'gemini':
      return Boolean(process.env.GEMINI_API_KEY)
    case 'perplexity':
      return Boolean(process.env.PERPLEXITY_API_KEY)
    default:
      return false
  }
}

/**
 * Safely extract a JSON object from a model response that may contain
 * markdown fences or surrounding prose. Robust against truncated output
 * (e.g. when the model hits max_tokens mid-JSON): it attempts to repair the
 * fragment by closing any open string/array/object before parsing.
 * Returns an empty object on failure.
 */
export function extractJson(text) {
  if (!text) return {}
  const start = text.indexOf('{')
  if (start === -1) return {}
  const fragment = text.slice(start)

  // Fast path: well-formed JSON somewhere in the fragment.
  const lastBrace = fragment.lastIndexOf('}')
  if (lastBrace !== -1) {
    try {
      return JSON.parse(fragment.slice(0, lastBrace + 1))
    } catch {
      // fall through to repair
    }
  }

  return repairTruncatedJson(fragment)
}

/**
 * Best-effort repair of a JSON object string that was cut off mid-stream.
 * Tracks string/escape state and the bracket stack, drops any dangling
 * partial key/value, then appends the closing brackets needed to balance.
 */
function repairTruncatedJson(input) {
  const stack = []
  let inString = false
  let escaped = false
  let lastSafe = -1 // index just after the last completed value/element

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }

    if (ch === '"') {
      inString = true
    } else if (ch === '{' || ch === '[') {
      stack.push(ch === '{' ? '}' : ']')
    } else if (ch === '}' || ch === ']') {
      stack.pop()
      lastSafe = i + 1
    } else if (ch === ',') {
      lastSafe = i // cut before the comma; the next element is incomplete
    }
  }

  if (lastSafe <= 0) return {}

  let candidate = input.slice(0, lastSafe).replace(/,\s*$/, '')

  // Re-derive the open-bracket stack for the trimmed candidate.
  const closers = []
  inString = false
  escaped = false
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') closers.push('}')
    else if (ch === '[') closers.push(']')
    else if (ch === '}' || ch === ']') closers.pop()
  }
  while (closers.length) candidate += closers.pop()

  try {
    return JSON.parse(candidate)
  } catch {
    return {}
  }
}

export async function callOpenAI(prompt, { json = true, temperature = 0.7, maxTokens = 700 } = {}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const body = {
    model: OPENAI_MODEL,
    temperature,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  }
  if (json) body.response_format = { type: 'json_object' }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI API error: ${res.status}`)
  }

  const data = await res.json()
  const u = data.usage || {}
  return {
    text: data.choices?.[0]?.message?.content || '',
    model: data.model || OPENAI_MODEL,
    usage: {
      inputTokens: u.prompt_tokens || 0,
      outputTokens: u.completion_tokens || 0,
      totalTokens: u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0),
    },
  }
}

export async function callClaude(prompt, { maxTokens = 700 } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Anthropic API error: ${res.status}`)
  }

  const data = await res.json()
  const block = Array.isArray(data.content)
    ? data.content.find((c) => c.type === 'text')
    : null
  const u = data.usage || {}
  return {
    text: block?.text || '',
    model: data.model || ANTHROPIC_MODEL,
    usage: {
      inputTokens: u.input_tokens || 0,
      outputTokens: u.output_tokens || 0,
      totalTokens: (u.input_tokens || 0) + (u.output_tokens || 0),
    },
  }
}

export async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const m = data.usageMetadata || {}
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    model: GEMINI_MODEL,
    usage: {
      inputTokens: m.promptTokenCount || 0,
      outputTokens: m.candidatesTokenCount || 0,
      totalTokens: m.totalTokenCount || (m.promptTokenCount || 0) + (m.candidatesTokenCount || 0),
    },
  }
}

export async function callPerplexity(prompt, { maxTokens = 700 } = {}) {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY is not set')

  const res = await fetch(PERPLEXITY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Perplexity API error: ${res.status}`)
  }

  const data = await res.json()
  const u = data.usage || {}
  return {
    text: data.choices?.[0]?.message?.content || '',
    model: data.model || PERPLEXITY_MODEL,
    usage: {
      inputTokens: u.prompt_tokens || 0,
      outputTokens: u.completion_tokens || 0,
      totalTokens: u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0),
    },
  }
}
