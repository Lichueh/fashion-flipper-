import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const GITHUB_API_URL = 'https://models.inference.ai.azure.com/chat/completions'

const SYSTEM_PROMPT = `You are a fabric analysis assistant. When given an image of a garment, analyze its fabric and return ONLY a valid JSON object with this exact structure — no markdown, no explanation, only the JSON:
{
  "type": "string (e.g. Cotton Fabric, Denim, Linen, Polyester Blend)",
  "color": "string (e.g. Deep Blue, Cream White, Burgundy Red)",
  "composition": [{ "material": "string", "percentage": number }],
  "weight": "string (one of: Lightweight, Medium weight, Heavy)",
  "texture": "string (e.g. Plain weave, Twill, Jersey knit, Denim twill, Ribbed knit)",
  "condition": "string (e.g. Excellent, Good, Good (slight fading), Fair (visible wear))",
  "tags": ["string"]
}
For tags, pick 2–4 relevant labels from: Natural Fiber, Synthetic, Blended, Machine Washable, Hand Wash Only, Dye-friendly, Stretch, Woven, Knit.
Composition percentages must sum to 100.`

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // loads ALL env vars, no VITE_ filter

  return {
    plugins: [
      react(),
      {
        name: 'api-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api/analyze', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }
            const token = env.GITHUB_TOKEN
            if (!token) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'GITHUB_TOKEN not set in .env' }))
              return
            }
            let body = ''
            req.on('data', (chunk) => (body += chunk))
            req.on('end', async () => {
              try {
                const { imageBase64, mimeType } = JSON.parse(body)
                const upstream = await fetch(GITHUB_API_URL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                      { role: 'system', content: SYSTEM_PROMPT },
                      {
                        role: 'user',
                        content: [
                          {
                            type: 'image_url',
                            image_url: {
                              url: `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}`,
                              detail: 'low',
                            },
                          },
                          { type: 'text', text: "Analyze this garment's fabric and return the JSON object." },
                        ],
                      },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1,
                    max_tokens: 400,
                  }),
                })
                const data = await upstream.json()
                const content = data.choices?.[0]?.message?.content
                res.statusCode = upstream.ok && content ? 200 : 502
                res.setHeader('Content-Type', 'application/json')
                res.end(content ?? JSON.stringify({ error: 'Empty response from model' }))
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          })
        },
      },
    ],
  }
})