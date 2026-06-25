import { getSql } from '../lib/db/client.js'
import { jsonResponse, errorResponse } from '../lib/api-utils.js'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent'

function buildPrompt(channelData) {
  return `당신은 YouTube 채널 분석 전문가입니다. 아래 채널 데이터를 바탕으로 한국어로 인사이트를 작성하세요.

채널명: ${channelData.title}
카테고리: ${channelData.category || '미분류'}
구독자 수: ${channelData.subscriberCount}
총 조회수: ${channelData.viewCount}
영상 수: ${channelData.videoCount}
평균 조회수(최근 10개): ${channelData.avgViews}
참여율: ${channelData.engagementRate}
태그: ${(channelData.tags || []).join(', ') || '없음'}
설명: ${(channelData.description || '').slice(0, 300)}

다음 4개 섹션으로 구성하세요:
1. 📈 채널 성장 요인 분석 (2~3문장)
2. 🎯 주요 타깃 오디언스 (1~2문장)
3. 💡 콘텐츠 전략 특징 (2~3문장)
4. 🔮 향후 성장 전망 (1~2문장)`
}

async function getCachedInsight(sql, channelId) {
  const rows = await sql`
    SELECT insight_text, generated_at
    FROM ai_insights
    WHERE channel_id = ${channelId} AND expires_at > NOW()
    LIMIT 1
  `
  return rows[0] || null
}

async function saveInsight(sql, channelId, text) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await sql`
    INSERT INTO ai_insights (channel_id, insight_text, generated_at, expires_at)
    VALUES (${channelId}, ${text}, NOW(), ${expiresAt})
    ON CONFLICT (channel_id) DO UPDATE SET
      insight_text = EXCLUDED.insight_text,
      generated_at = NOW(),
      expires_at = EXCLUDED.expires_at
  `
}

function streamCached(text) {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })
}

async function streamGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}&alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`)
  }

  return res.body
}

function parseGeminiSSE(stream) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let fullText = ''

  return {
    readable: new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (!data || data === '[DONE]') continue
              try {
                const json = JSON.parse(data)
                const text =
                  json.candidates?.[0]?.content?.parts?.[0]?.text || ''
                if (text) {
                  fullText += text
                  controller.enqueue(encoder.encode(text))
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    }),
    getFullText: () => fullText,
    setFullText: (t) => { fullText = t },
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = await req.json()
    const { channelId, channelData } = body

    if (!channelId || !channelData) {
      return errorResponse('channelId and channelData required', 400)
    }

    const sql = getSql()
    const cached = await getCachedInsight(sql, channelId)

    if (cached) {
      return new Response(streamCached(cached.insight_text), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Cache': 'HIT',
        },
      })
    }

    const prompt = buildPrompt(channelData)
    const geminiStream = await streamGemini(prompt)
    const { readable, getFullText } = parseGeminiSSE(geminiStream)

    const [clientStream, saveStream] = readable.tee()
    const reader = saveStream.getReader()
    const chunks = []

    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
        }
        const full = new TextDecoder().decode(
          chunks.reduce((acc, c) => {
            const merged = new Uint8Array(acc.length + c.length)
            merged.set(acc)
            merged.set(c, acc.length)
            return merged
          }, new Uint8Array()),
        )
        const text = full || getFullText()
        if (text) await saveInsight(sql, channelId, text)
      } catch (e) {
        console.error('Insight save error:', e)
      }
    })()

    return new Response(clientStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Cache': 'MISS',
      },
    })
  } catch (err) {
    console.error('Insight error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
}
