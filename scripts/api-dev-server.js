import { createServer } from 'node:http'
import { config } from 'dotenv'

config()

const PORT = Number(process.env.API_PORT) || 3005

async function loadHandler(path) {
  const mod = await import(path)
  return mod.default
}

const routes = [
  { method: 'GET', pattern: /^\/api\/ranking$/, loader: () => loadHandler('../api/ranking.js') },
  { method: 'GET', pattern: /^\/api\/channel\/([^/]+)$/, loader: () => loadHandler('../api/channel/[id].js'), dynamic: true },
  { method: 'GET', pattern: /^\/api\/search$/, loader: () => loadHandler('../api/search.js') },
  { method: 'POST', pattern: /^\/api\/insight$/, loader: () => loadHandler('../api/insight.js') },
  { method: 'GET', pattern: /^\/api\/favorites$/, loader: () => loadHandler('../api/favorites.js') },
  { method: 'POST', pattern: /^\/api\/favorites$/, loader: () => loadHandler('../api/favorites.js') },
  { method: 'GET', pattern: /^\/api\/health$/, loader: () => loadHandler('../api/health.js') },
]

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  for (const route of routes) {
    if (route.method && route.method !== req.method) continue
    const match = url.pathname.match(route.pattern)
    if (!match) continue

    try {
      const handler = await route.loader()
      const headers = new Headers()
      let body

      if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
        body = await new Promise((resolve, reject) => {
          const chunks = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => resolve(Buffer.concat(chunks).toString()))
          req.on('error', reject)
        })
      }

      const request = new Request(`http://localhost${url.pathname}${url.search}`, {
        method: req.method,
        headers: req.headers,
        body: body || undefined,
      })

      const params = route.dynamic ? { id: match[1] } : {}
      const response = await handler(request, { params })

      res.statusCode = response.status
      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })

      if (response.body) {
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
      }
      res.end()
      return
    } catch (err) {
      console.error('Route error:', err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message }))
      return
    }
  }

  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: 'Not found' }))
}).listen(PORT, () => {
  console.log(`API dev server running at http://localhost:${PORT}`)
})
