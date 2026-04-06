import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../supabase'

const client = new Anthropic()

function stripJson(text: string) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*"trends"[\s\S]*\}/)
  return match ? match[0] : stripJson(text)
}

export type SocialTrendsResult = {
  trends: {
    platform: 'instagram' | 'linkedin' | 'tiktok'
    trend: string
    relevance_for_zzp: string
    content_angle: string
    example_hook: string
    confidence: number
  }[]
  hashtag_clusters: {
    niche: string
    hashtags: string[]
    reach_estimate: string
  }[]
  content_formats: {
    format: string
    platform: string
    why_it_works: string
    example: string
  }[]
  summary: string
}

export async function runSocialTrendsAgent(): Promise<SocialTrendsResult> {
  const systemPrompt = `Je bent een social media marketing expert gespecialiseerd in Nederlandse kleine ondernemers en ZZP'ers.
Gebruik web search om actuele trends te vinden op Instagram, LinkedIn en TikTok die relevant zijn voor Nederlandse ZZP'ers en kleine bedrijven die AI gebruiken voor hun marketing.`

  const userPrompt = `Doe research naar actuele social media trends voor Nederlandse ondernemers.

Zoek specifiek naar:
1. Instagram: wat werkt nu goed voor Nederlandse vakbedrijven? (Reels, carousels, Stories trends)
2. LinkedIn: welke content formats scoren bij Nederlandse ZZP'ers en MKB?
3. TikTok: welke hooks en formaten werken voor Nederlandse ondernemers?
4. Hashtag research: welke hashtag clusters hebben bereik voor bouw, zorg, horeca, coaching niches in NL
5. Trending onderwerpen: AI-gerelateerde content die nu goed scoort in NL

Geef je bevindingen in dit JSON formaat:
{
  "trends": [
    {
      "platform": "instagram",
      "trend": "naam van de trend",
      "relevance_for_zzp": "waarom relevant voor ZZP'ers",
      "content_angle": "hoe dit te gebruiken voor AI-gidsen marketing",
      "example_hook": "voorbeeld openingszin voor een post",
      "confidence": 85
    }
  ],
  "hashtag_clusters": [
    {
      "niche": "bouw/installatie",
      "hashtags": ["#zzpnederland", "#vakman", "#bouwen"],
      "reach_estimate": "hoog/middel/laag"
    }
  ],
  "content_formats": [
    {
      "format": "Before/After carousel",
      "platform": "instagram",
      "why_it_works": "toont transformatie, hoge engagement",
      "example": "Voor: 2 uur per week kwijt aan offerte schrijven. Na: 10 minuten met AI."
    }
  ],
  "summary": "2-3 zinnen over wat nu het beste werkt"
}`

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userPrompt }
  ]

  let finalText = ''
  let currentMessages = [...messages]
  let attempts = 0

  while (attempts < 8) {
    attempts++

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
          max_uses: 5,
        } as any,
      ],
      messages: currentMessages,
    })

    const textBlocks = response.content.filter(b => b.type === 'text')
    if (textBlocks.length > 0) {
      finalText = (textBlocks[textBlocks.length - 1] as Anthropic.TextBlock).text
    }

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      currentMessages.push({ role: 'assistant', content: response.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({
          type: 'tool_result' as const,
          tool_use_id: (b as Anthropic.ToolUseBlock).id,
          content: 'Search completed.',
        }))
      if (toolResults.length > 0) {
        currentMessages.push({ role: 'user', content: toolResults })
      }
    } else {
      break
    }
  }

  if (!finalText) throw new Error('Social trends agent produced no output')

  const parsed: SocialTrendsResult = JSON.parse(extractJson(finalText))

  // Save trends as learnings for the content agent
  for (const trend of parsed.trends) {
    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: 'content_strategy',
      insight: `[${trend.platform.toUpperCase()}] ${trend.trend}: ${trend.content_angle}. Hook: "${trend.example_hook}"`,
      data_points: {
        platform: trend.platform,
        confidence: trend.confidence,
        source: 'social_trends_agent',
        timestamp: new Date().toISOString(),
      },
    })
  }

  // Save hashtag clusters
  for (const cluster of parsed.hashtag_clusters) {
    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: 'content_strategy',
      insight: `[HASHTAGS ${cluster.niche}] Bereik: ${cluster.reach_estimate}. Tags: ${cluster.hashtags.join(' ')}`,
      data_points: {
        type: 'hashtag_cluster',
        niche: cluster.niche,
        hashtags: cluster.hashtags,
        source: 'social_trends_agent',
      },
    })
  }

  // Save format insights
  for (const format of parsed.content_formats) {
    await supabaseAdmin.from('agent_learnings').insert({
      learning_type: 'content_strategy',
      insight: `[FORMAT ${format.platform}] ${format.format}: ${format.why_it_works}. Voorbeeld: "${format.example}"`,
      data_points: {
        type: 'content_format',
        platform: format.platform,
        source: 'social_trends_agent',
      },
    })
  }

  // Save summary
  await supabaseAdmin.from('agent_learnings').insert({
    learning_type: 'content_strategy',
    insight: `[TRENDS SAMENVATTING] ${parsed.summary}`,
    data_points: { source: 'social_trends_agent', timestamp: new Date().toISOString() },
  })

  return parsed
}
