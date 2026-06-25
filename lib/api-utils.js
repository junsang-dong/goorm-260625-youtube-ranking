export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status)
}

export function textResponse(text, status = 200, headers = {}) {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers },
  })
}
