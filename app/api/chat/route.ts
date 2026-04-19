import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthData } from '@/lib/auth'
import { fetchActivities, buildStravaContext } from '@/lib/strava'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert running coach and sports scientist with deep knowledge of endurance training, periodization, injury prevention, and race preparation. You have access to the athlete's real Strava training data.

Your personality:
- Direct, motivating, and data-driven
- You reference specific numbers from their data (paces, distances, HR)
- You create structured training plans when asked, formatted clearly with days and workouts
- You explain the "why" behind recommendations
- You're honest about weaknesses in their training and how to fix them

When creating training plans:
- Use a weekly format with specific workouts
- Include easy runs, tempo runs, intervals, and long runs appropriately
- Specify paces based on their current fitness (derived from their data)
- Include rest days and cross-training suggestions
- Keep plans realistic relative to their current volume

Always ground your advice in their actual data. Reference their recent runs by name or date when relevant.`

export async function POST(req: NextRequest) {
  const auth = await getAuthData()
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const { messages, stravaContext } = await req.json()

  const systemWithData = stravaContext
    ? `${SYSTEM_PROMPT}\n\nATHLETE DATA:\n${stravaContext}`
    : SYSTEM_PROMPT

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemWithData,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
