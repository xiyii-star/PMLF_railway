'use client'

import { useEffect, useState, useRef } from 'react'
import { CheckCircle2, Circle, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { apiClient, TaskStatus } from '@/lib/api'
import AnimatedBackground from './components/AnimatedBackground'

const PHASES = [
  { id: 'phase1', name: '论文搜索', description: '搜索和筛选相关论文' },
  { id: 'phase2', name: 'PDF下载', description: '下载论文PDF文件' },
  { id: 'phase3', name: '论文分析', description: 'DeepPaper多智能体分析' },
  { id: 'phase4', name: '引用类型', description: '推断引用关系类型' },
  { id: 'phase5', name: '图谱构建', description: '构建知识图谱' },
  { id: 'phase6', name: '深度调研', description: '生成调研报告' },
  { id: 'phase7', name: '研究想法', description: '生成研究想法' },
  { id: 'phase8', name: '结果输出', description: '保存和可视化结果' },
]

interface PipelineExecutionProps {
  taskId: string
}

export default function PipelineExecution({ taskId }: PipelineExecutionProps) {
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string }>>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'polling'>('websocket')
  const wsRef = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const scrollPositionRef = useRef<number>(0)
  const isInitialLoadRef = useRef<boolean>(true)

  useEffect(() => {
    if (!taskId) return

    // 保存当前滚动位置
    const saveScrollPosition = () => {
      scrollPositionRef.current = window.scrollY
    }

    // Load initial status
    loadStatus()

    // Connect WebSocket
    connectWebSocket()

    // Poll status
    const statusInterval = setInterval(() => {
      saveScrollPosition()
      loadStatus()
    }, 2000)

    // Fallback to polling if WebSocket doesn't connect within 5 seconds
    const wsTimeout = setTimeout(() => {
      if (!wsConnected && connectionMode === 'websocket') {
        console.log('WebSocket connection timeout, falling back to polling')
        startPolling()
      }
    }, 5000)

    // 标记初始加载完成
    setTimeout(() => {
      isInitialLoadRef.current = false
    }, 1000)

    return () => {
      clearInterval(statusInterval)
      clearTimeout(wsTimeout)
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [taskId])

  useEffect(() => {
    // Auto-scroll logs - 只滚动日志容器，不影响页面滚动
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    // Redirect to results when completed
    if (taskStatus?.status === 'completed') {
      setTimeout(() => {
        window.location.hash = `#/results/${taskId}`
      }, 2000)
    }
  }, [taskStatus?.status, taskId])

  const loadStatus = async () => {
    try {
      const savedScrollY = scrollPositionRef.current
      const status = await apiClient.getTaskStatus(taskId)
      setTaskStatus(status)

      // 恢复滚动位置（仅在非初始加载时）
      if (!isInitialLoadRef.current && savedScrollY > 0) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedScrollY, behavior: 'auto' })
        })
      }
    } catch (error) {
      console.error('Failed to load status:', error)
    }
  }

  const connectWebSocket = () => {
    try {
      const wsUrl = apiClient.getWebSocketUrl(taskId)
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setWsConnected(true)
        setConnectionMode('websocket')
        wsRef.current = ws
      }

      ws.onmessage = (event) => {
        const logEntry = JSON.parse(event.data)
        setLogs((prev) => [...prev, logEntry])
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setWsConnected(false)
      }

      ws.onclose = () => {
        setWsConnected(false)
        // Try to reconnect after 3 seconds if still in websocket mode
        if (connectionMode === 'websocket') {
          setTimeout(connectWebSocket, 3000)
        }
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }

  const startPolling = () => {
    console.log('Starting polling mode for logs')
    setConnectionMode('polling')

    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // 使用相对路径，通过 ESA 边缘函数反向代理
        const response = await fetch(`/api/pipeline/logs/${taskId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.logs && Array.isArray(data.logs)) {
            setLogs(data.logs)
          }
        }
      } catch (error) {
        console.error('Failed to poll logs:', error)
      }
    }, 2000)
  }

  const getPhaseStatus = (phaseId: string) => {
    if (!taskStatus) return 'pending'
    const phaseProgress = taskStatus.progress[phaseId]
    if (!phaseProgress) return 'pending'
    return phaseProgress.status || 'pending'
  }

  const getPhaseIcon = (phaseId: string) => {
    const status = getPhaseStatus(phaseId)
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />
      case 'running':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-500" />
      default:
        return <Circle className="w-6 h-6 text-indigo-300" />
    }
  }

  if (!taskStatus) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <AnimatedBackground />
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 relative z-10" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 动画背景 */}
      <AnimatedBackground />

      {/* Header */}
      <div className="relative bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="/" className="text-indigo-200 hover:text-white transition">
                <ArrowLeft className="w-5 h-5" />
              </a>
              <div>
                <h1 className="text-2xl font-bold text-white">Pipeline 执行中</h1>
                <p className="text-sm text-indigo-200">任务 ID: {taskId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connectionMode === 'websocket' && wsConnected ? 'bg-green-500' : connectionMode === 'polling' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="text-sm text-indigo-200">
                {connectionMode === 'websocket' && wsConnected ? 'WebSocket 已连接' : connectionMode === 'polling' ? '轮询模式' : '连接中...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-6 text-white">执行进度</h2>
              <div className="space-y-4">
                {PHASES.map((phase, idx) => (
                  <div key={phase.id} className="flex items-start space-x-3">
                    {getPhaseIcon(phase.id)}
                    <div className="flex-1">
                      <div className="font-semibold text-white">{phase.name}</div>
                      <div className="text-sm text-indigo-200">{phase.description}</div>
                      {taskStatus.progress[phase.id] && (
                        <div className="text-xs text-indigo-300 mt-1">
                          {JSON.stringify(taskStatus.progress[phase.id], null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Summary */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="text-sm text-indigo-200 mb-2">当前状态</div>
                <div className="text-lg font-semibold text-white">
                  {taskStatus.status === 'running' && '运行中'}
                  {taskStatus.status === 'completed' && '已完成'}
                  {taskStatus.status === 'failed' && '失败'}
                  {taskStatus.status === 'pending' && '等待中'}
                </div>
                {taskStatus.current_phase && (
                  <div className="text-sm text-indigo-200 mt-1">
                    当前阶段: {taskStatus.current_phase}
                  </div>
                )}
                {taskStatus.error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {taskStatus.error}
                  </div>
                )}
                {taskStatus.status === 'completed' && (
                  <div className="mt-4">
                    <a
                      href={`/#/results/${taskId}`}
                      className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      查看结果 →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">实时日志</h2>
                <button
                  onClick={() => setLogs([])}
                  className="text-sm text-indigo-200 hover:text-white"
                >
                  清空
                </button>
              </div>
              <div ref={logsContainerRef} className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-indigo-300">等待日志输出...</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="text-indigo-300">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

