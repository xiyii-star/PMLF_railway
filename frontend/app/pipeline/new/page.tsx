'use client'

import { useState } from 'react'
import { Search, Loader2, GitBranch, GitCommit, FileText } from 'lucide-react'
import { apiClient, PipelineStartRequest } from '@/lib/api'
import AnimatedBackground from '../../components/AnimatedBackground'

export default function NewPipeline() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 修改配置状态，移除 max_papers，添加细粒度控制
  const [config, setConfig] = useState({
    seed_count: 5,           // 种子论文数量
    citations_per_seed: 3,   // 每篇种子的引用数
    references_per_seed: 3,  // 每篇种子的参考文献数
    skip_pdf: false,
    quick: false,
    use_deep_paper: true,
    use_snowball: false,
  })

  // LLM配置
  const [llmConfig, setLlmConfig] = useState({
    model: 'gpt-4o-mini',
    api_key: '',
    base_url: 'https://api.openai.com/v1'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('请输入研究主题')
      return
    }

    if (!llmConfig.api_key.trim()) {
      setError('请输入 OpenAI API Key')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 构造请求对象
      // 注意：我们将具体的数量参数放入 config_overrides
      // 这样后端 config.update(overrides) 时会生效
      const request: PipelineStartRequest = {
        topic: topic.trim(),
        skip_pdf: config.skip_pdf,
        quick: config.quick,
        use_llm: true, // 默认开启
        use_deep_paper: config.use_deep_paper,
        use_snowball: config.use_snowball,
        // 这里不需要顶层的 max_papers 了，或者可以传 null
        max_papers: undefined,
        config_overrides: {
          max_papers: config.seed_count,      // 在搜索阶段，max_papers 通常指种子论文数
          max_citations: config.citations_per_seed,
          max_references: config.references_per_seed,
          // 估算最大下载量以防止爆内存，可选
          max_pdf_downloads: config.seed_count * (1 + config.citations_per_seed + config.references_per_seed),
          // LLM配置
          llm_model: llmConfig.model,
          llm_api_key: llmConfig.api_key,
          llm_base_url: llmConfig.base_url
        }
      }

      const task = await apiClient.startPipeline(request)
      window.location.hash = `#/pipeline/${task.task_id}`
    } catch (err: any) {
      setError(err.message || '启动分析失败')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 动画背景 */}
      <AnimatedBackground />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold mb-6 text-white">新建分析任务</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Input */}
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-white mb-2">
                研究主题 *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-300 w-5 h-5" />
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例如: transformer, computer vision, natural language processing"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white/20 transition"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Search Configuration */}
            <div className="border-t border-white/20 pt-6">
              <h2 className="text-lg font-semibold mb-4 text-white">检索参数</h2>
              
              {/* 新增：3列布局的参数设置 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* 种子论文数 */}
                <div className="bg-white/20 p-4 rounded-lg border border-white/30">
                  <div className="flex items-center mb-2">
                    <FileText className="w-4 h-4 text-blue-600 mr-2" />
                    <label className="block text-sm font-medium text-white">
                      种子论文数
                    </label>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={config.seed_count}
                    onChange={(e) => setConfig({ ...config, seed_count: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:ring-2 focus:ring-primary-500 focus:bg-white/20"
                    disabled={loading}
                  />
                  <p className="text-xs text-indigo-300 mt-1">初始搜索获取的论文数量</p>
                </div>

                {/* 引用数 */}
                <div className="bg-white/20 p-4 rounded-lg border border-white/30">
                  <div className="flex items-center mb-2">
                    <GitBranch className="w-4 h-4 text-green-600 mr-2" />
                    <label className="block text-sm font-medium text-white">
                      引用扩展 (Citations)
                    </label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={config.citations_per_seed}
                    onChange={(e) => setConfig({ ...config, citations_per_seed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:ring-2 focus:ring-primary-500 focus:bg-white/20"
                    disabled={loading}
                  />
                  <p className="text-xs text-indigo-300 mt-1">每篇论文向下追踪的数量</p>
                </div>

                {/* 参考文献数 */}
                <div className="bg-white/20 p-4 rounded-lg border border-white/30">
                  <div className="flex items-center mb-2">
                    <GitCommit className="w-4 h-4 text-purple-600 mr-2" />
                    <label className="block text-sm font-medium text-white">
                      参考回溯 (Refs)
                    </label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={config.references_per_seed}
                    onChange={(e) => setConfig({ ...config, references_per_seed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:ring-2 focus:ring-primary-500 focus:bg-white/20"
                    disabled={loading}
                  />
                  <p className="text-xs text-indigo-300 mt-1">每篇论文向上追溯的数量</p>
                </div>
              </div>

            </div>

            {/* LLM Configuration */}
            <div className="border-t border-white/20 pt-6">
              <h2 className="text-lg font-semibold mb-4 text-white">LLM 配置</h2>

              <div className="space-y-4">
                {/* Model */}
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-white mb-2">
                    模型 (Model) *
                  </label>
                  <input
                    id="model"
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                    placeholder="例如: gpt-4o-mini, gpt-4o, gpt-3.5-turbo"
                    className="w-full px-4 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="text-xs text-indigo-300 mt-1">OpenAI 模型名称</p>
                </div>

                {/* API Key */}
                <div>
                  <label htmlFor="api_key" className="block text-sm font-medium text-white mb-2">
                    API Key *
                  </label>
                  <input
                    id="api_key"
                    type="password"
                    value={llmConfig.api_key}
                    onChange={(e) => setLlmConfig({ ...llmConfig, api_key: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    disabled={loading}
                  />
                  <p className="text-xs text-indigo-300 mt-1">OpenAI API 密钥</p>
                </div>

                {/* Base URL */}
                <div>
                  <label htmlFor="base_url" className="block text-sm font-medium text-white mb-2">
                    Base URL
                  </label>
                  <input
                    id="base_url"
                    type="text"
                    value={llmConfig.base_url}
                    onChange={(e) => setLlmConfig({ ...llmConfig, base_url: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-3 border border-white/20 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="text-xs text-indigo-300 mt-1">API 基础地址（使用代理或兼容服务时修改）</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 px-6 py-3 border border-white/20 rounded-lg hover:bg-white/20 transition"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    启动中...
                  </>
                ) : (
                  '开始分析'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
