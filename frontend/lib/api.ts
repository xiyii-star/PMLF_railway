/**
 * API Client for EvoNarrator Backend
 */

// 使用空字符串表示相对路径，通过 ESA 边缘函数反向代理
// 本地开发时使用 localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:8000' : '')

export interface PipelineStartRequest {
  topic: string
  max_papers?: number
  skip_pdf?: boolean
  quick?: boolean
  use_llm?: boolean
  use_deep_paper?: boolean
  use_snowball?: boolean
  config_overrides?: Record<string, any>
}

export interface TaskStatus {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: Record<string, any>
  current_phase?: string
  started_at?: string
  completed_at?: string
  error?: string
}

export interface HistoryResult {
  task_id: string
  topic: string
  timestamp: string
  paper_count: number
  files: Record<string, string | null>
  created_at: string
}

export interface Paper {
  id: string
  title: string
  authors: string[]
  year: number
  cited_by_count: number
  doi?: string
  abstract?: string
  rag_analysis?: {
    problem?: string
    method?: string
    limitation?: string
    future_work?: string
  }
  deep_analysis?: any
}

export interface GraphData {
  nodes: any[]
  edges: any[]
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async startPipeline(request: PipelineStartRequest): Promise<TaskStatus> {
    return this.request<TaskStatus>('/api/pipeline/start', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.request<TaskStatus>(`/api/pipeline/status/${taskId}`)
  }

  async listResults(): Promise<HistoryResult[]> {
    return this.request<HistoryResult[]>('/api/results')
  }

  async getResult(taskId: string): Promise<any> {
    return this.request(`/api/results/${taskId}`)
  }

  async getPapers(taskId: string): Promise<Paper[]> {
    return this.request<Paper[]>(`/api/results/${taskId}/papers`)
  }

  async getGraphData(taskId: string): Promise<GraphData> {
    return this.request<GraphData>(`/api/results/${taskId}/graph`)
  }

  async getSurvey(taskId: string): Promise<any> {
    return this.request(`/api/results/${taskId}/survey`)
  }

  async getIdeas(taskId: string): Promise<any> {
    return this.request(`/api/results/${taskId}/ideas`)
  }

  getVisualizationUrl(taskId: string): string {
    // 如果 baseUrl 为空，使用相对路径
    if (!this.baseUrl) {
      return `/api/results/${taskId}/visualization`
    }
    return `${this.baseUrl}/api/results/${taskId}/visualization`
  }

  getWebSocketUrl(taskId: string): string {
    // 如果 baseUrl 为空，使用当前域名构建 WebSocket URL
    if (!this.baseUrl) {
      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const host = window.location.host
        return `${protocol}://${host}/api/pipeline/logs/${taskId}`
      }
      // 服务端渲染时的默认值
      return `/api/pipeline/logs/${taskId}`
    }

    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws'
    const wsBase = this.baseUrl.replace(/^https?/, wsProtocol)
    return `${wsBase}/api/pipeline/logs/${taskId}`
  }
}

export const apiClient = new ApiClient()

