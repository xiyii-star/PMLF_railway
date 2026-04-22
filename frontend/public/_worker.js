/**
 * ESA Pages 边缘函数 (ES Module 格式)
 * 用于反向代理 API 请求到后端服务器
 */

// 后端服务器地址（使用 80 端口）
const BACKEND_URL = 'http://47.102.99.87'

// 默认导出对象，包含 fetch 函数
export default {
  async fetch(request) {
    const url = new URL(request.url)

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return handleOptions(request)
    }

    // 如果是 API 请求，转发到后端
    if (url.pathname.startsWith('/api/')) {
      return proxyToBackend(request, url)
    }

    // 如果是 WebSocket 升级请求，转发到后端
    if (request.headers.get('Upgrade') === 'websocket') {
      return proxyToBackend(request, url)
    }

    // 其他请求返回 null，让 ESA 处理静态文件
    return null
  }
}

async function proxyToBackend(request, url) {
  // 构建后端 URL
  const backendUrl = BACKEND_URL + url.pathname + url.search

  // 复制请求头
  const headers = new Headers(request.headers)

  // 添加 X-Forwarded-* 头
  headers.set('X-Forwarded-Host', url.host)
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))

  // 移除可能导致问题的头
  headers.delete('Host')

  try {
    // 转发请求到后端
    const backendRequest = new Request(backendUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow'
    })

    const response = await fetch(backendRequest)

    // 创建新的响应头
    const responseHeaders = new Headers(response.headers)

    // 添加 CORS 头
    responseHeaders.set('Access-Control-Allow-Origin', url.origin)
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    responseHeaders.set('Access-Control-Allow-Credentials', 'true')

    // 返回新的响应
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
  } catch (error) {
    // 返回详细的错误响应
    return new Response(JSON.stringify({
      error: 'Backend connection failed',
      message: error.message,
      stack: error.stack,
      backend_url: BACKEND_URL,
      request_url: backendUrl,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': url.origin
      }
    })
  }
}

function handleOptions(request) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  })

  return new Response(null, {
    status: 204,
    headers: headers
  })
}
