import { getSql } from '../lib/db/client.js'
import { jsonResponse, errorResponse } from '../lib/api-utils.js'

export const config = { runtime: 'edge' }

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const SUPPORTED_LANGS = ['en', 'ko', 'ja', 'zh']

const PROMPT_TEMPLATES = {
  en: {
    intro:
      'You are a YouTube channel analytics expert. Based on the channel data below, write the insights in English.',
    fields: {
      title: 'Channel name',
      category: 'Category',
      subscriberCount: 'Subscribers',
      viewCount: 'Total views',
      videoCount: 'Video count',
      avgViews: 'Average views (last 10)',
      engagementRate: 'Engagement rate',
      tags: 'Tags',
      description: 'Description',
    },
    uncategorized: 'Uncategorized',
    none: 'None',
    structure: `Organize the response into these 4 sections:
1. 📈 Growth Driver Analysis (2-3 sentences)
2. 🎯 Core Target Audience (1-2 sentences)
3. 💡 Content Strategy Highlights (2-3 sentences)
4. 🔮 Future Growth Outlook (1-2 sentences)`,
  },
  ko: {
    intro:
      '당신은 YouTube 채널 분석 전문가입니다. 아래 채널 데이터를 바탕으로 한국어로 인사이트를 작성하세요.',
    fields: {
      title: '채널명',
      category: '카테고리',
      subscriberCount: '구독자 수',
      viewCount: '총 조회수',
      videoCount: '영상 수',
      avgViews: '평균 조회수(최근 10개)',
      engagementRate: '참여율',
      tags: '태그',
      description: '설명',
    },
    uncategorized: '미분류',
    none: '없음',
    structure: `다음 4개 섹션으로 구성하세요:
1. 📈 채널 성장 요인 분석 (2~3문장)
2. 🎯 주요 타깃 오디언스 (1~2문장)
3. 💡 콘텐츠 전략 특징 (2~3문장)
4. 🔮 향후 성장 전망 (1~2문장)`,
  },
  ja: {
    intro:
      'あなたはYouTubeチャンネル分析の専門家です。以下のチャンネルデータをもとに、日本語でインサイトを作成してください。',
    fields: {
      title: 'チャンネル名',
      category: 'カテゴリ',
      subscriberCount: '登録者数',
      viewCount: '総再生回数',
      videoCount: '動画数',
      avgViews: '平均再生回数(直近10本)',
      engagementRate: 'エンゲージメント率',
      tags: 'タグ',
      description: '説明',
    },
    uncategorized: '未分類',
    none: 'なし',
    structure: `次の4つのセクションで構成してください:
1. 📈 チャンネル成長要因の分析 (2〜3文)
2. 🎯 主なターゲット層 (1〜2文)
3. 💡 コンテンツ戦略の特徴 (2〜3文)
4. 🔮 今後の成長見通し (1〜2文)`,
  },
  zh: {
    intro:
      '你是一名YouTube频道分析专家。请根据以下频道数据，用中文撰写分析洞察。',
    fields: {
      title: '频道名称',
      category: '分类',
      subscriberCount: '订阅数',
      viewCount: '总观看次数',
      videoCount: '视频数量',
      avgViews: '平均观看次数(最近10个)',
      engagementRate: '互动率',
      tags: '标签',
      description: '简介',
    },
    uncategorized: '未分类',
    none: '无',
    structure: `请按以下4个部分组织内容:
1. 📈 频道增长因素分析 (2~3句)
2. 🎯 核心目标受众 (1~2句)
3. 💡 内容策略特点 (2~3句)
4. 🔮 未来增长展望 (1~2句)`,
  },
}

function buildPrompt(channelData, lang = 'en') {
  const tpl = PROMPT_TEMPLATES[lang] || PROMPT_TEMPLATES.en
  const f = tpl.fields
  return `${tpl.intro}

${f.title}: ${channelData.title}
${f.category}: ${channelData.category || tpl.uncategorized}
${f.subscriberCount}: ${channelData.subscriberCount}
${f.viewCount}: ${channelData.viewCount}
${f.videoCount}: ${channelData.videoCount}
${f.avgViews}: ${channelData.avgViews}
${f.engagementRate}: ${channelData.engagementRate}
${f.tags}: ${(channelData.tags || []).join(', ') || tpl.none}
${f.description}: ${(channelData.description || '').slice(0, 300)}

${tpl.structure}`
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

async function streamOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI API error: ${res.status}`)
  }

  return res.body
}

function parseOpenAISSE(stream) {
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
                const text = json.choices?.[0]?.delta?.content || ''
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

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = await req.json()
    const { channelId, channelData } = body
    const lang = SUPPORTED_LANGS.includes(body.lang) ? body.lang : 'en'

    if (!channelId || !channelData) {
      return errorResponse('channelId and channelData required', 400)
    }

    // Cache per language so each locale keeps its own insight (fits VARCHAR(50)).
    const cacheKey = `${channelId}:${lang}`

    const sql = getSql()
    const cached = await getCachedInsight(sql, cacheKey)

    if (cached) {
      return new Response(streamCached(cached.insight_text), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Cache': 'HIT',
        },
      })
    }

    const prompt = buildPrompt(channelData, lang)
    const openaiStream = await streamOpenAI(prompt)
    const { readable, getFullText } = parseOpenAISSE(openaiStream)

    const [clientStream, saveStream] = readable.tee()
    const reader = saveStream.getReader()
    const chunks = []

    const savePromise = (async () => {
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
        if (text) await saveInsight(sql, cacheKey, text)
      } catch (e) {
        console.error('Insight save error:', e)
      }
    })()

    // Keep the function alive on Edge until the cache write finishes.
    if (context && typeof context.waitUntil === 'function') {
      context.waitUntil(savePromise)
    }

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
