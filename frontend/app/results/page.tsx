'use client'

import { useEffect, useState } from 'react'
import { Search, FileText, Calendar, Home } from 'lucide-react'
import { apiClient, HistoryResult } from '@/lib/api'
import AnimatedBackground from '../components/AnimatedBackground'

export default function ResultsList() {
  const [results, setResults] = useState<HistoryResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      const data = await apiClient.listResults()
      setResults(data)
    } catch (error) {
      console.error('Failed to load results:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = results.filter((result) =>
    result.topic.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 动画背景 */}
      <AnimatedBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-white">历史分析记录</h1>
            <a
              href="/"
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 rounded-lg transition"
            >
              <Home className="w-5 h-5" />
              <span>返回主页</span>
            </a>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索主题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-indigo-200">加载中...</div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-indigo-200 mb-4">
              {searchTerm ? '未找到匹配的结果' : '暂无历史记录'}
            </p>
            <a
              href="/pipeline/new"
              className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
            >
              创建新分析
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResults.map((result) => {
              const date = new Date(result.created_at)
              const formattedDate = date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })
              const formattedTime = date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
              })

              return (
                <a
                  key={result.task_id}
                  href={`/#/results/${result.task_id}`}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group hover:bg-white/10 hover:scale-105 transform"
                >
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-r from-indigo-500/80 to-purple-600/80 p-4">
                    <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:line-clamp-none transition-all">
                      {result.topic}
                    </h3>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="space-y-3">
                      {/* Paper count */}
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-400/20 rounded-lg">
                          <FileText className="w-4 h-4 text-blue-300" />
                        </div>
                        <div>
                          <div className="text-xs text-indigo-300">论文数量</div>
                          <div className="text-sm font-semibold text-white">{result.paper_count} 篇</div>
                        </div>
                      </div>

                      {/* Date and time */}
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-400/20 rounded-lg">
                          <Calendar className="w-4 h-4 text-purple-300" />
                        </div>
                        <div>
                          <div className="text-xs text-indigo-300">创建时间</div>
                          <div className="text-sm font-semibold text-white">{formattedDate} {formattedTime}</div>
                        </div>
                      </div>
                    </div>

                    {/* View button */}
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-indigo-300 font-medium group-hover:text-indigo-200">
                        <span>查看详情</span>
                        <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

