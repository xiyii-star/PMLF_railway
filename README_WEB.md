# EvoNarrator Web 应用

完整的 Web 应用来展示 EvoNarrator 论文知识图谱构建系统。

## 🏗️ 架构

- **前端**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **后端**: FastAPI + Python
- **通信**: REST API + WebSocket (实时日志)

## 🔧 技术栈

### 后端

- FastAPI
- WebSocket
- Python 3.8+
- uvicorn

### 前端

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (图标)

## 📁 项目结构

```
EvoNarrator _web/
├── backend/                           # FastAPI 后端服务
│   ├── main.py                       # FastAPI 主文件（REST API + WebSocket）
│   └── requirements.txt              # 后端依赖
│
├── frontend/                          # Next.js 前端应用
│   ├── app/                          # Next.js App Router 页面
│   │   ├── layout.tsx               # 根布局
│   │   ├── page.tsx                 # 首页（Dashboard）
│   │   ├── globals.css              # 全局样式
│   │   ├── pipeline/                # Pipeline 相关页面
│   │   │   ├── new/                 # 新建分析页面
│   │   │   │   └── page.tsx
│   │   │   └── [id]/                # Pipeline 执行页面（动态路由）
│   │   │       ├── page.tsx         # 服务端组件
│   │   │       ├── client-page.tsx  # 客户端组件（实时日志）
│   │   │       └── layout.tsx
│   │   └── results/                 # 结果相关页面
│   │       ├── page.tsx             # 结果列表页面
│   │       └── [id]/                # 结果详情页面（动态路由）
│   │           ├── page.tsx         # 服务端组件
│   │           └── client-page.tsx  # 客户端组件（标签页）
│   ├── lib/
│   │   └── api.ts                   # API 客户端封装
│   ├── package.json                 # 前端依赖和脚本
│   ├── tsconfig.json                # TypeScript 配置
│   ├── tailwind.config.js           # Tailwind CSS 配置
│   ├── postcss.config.js            # PostCSS 配置
│   └── .env.example                 # 环境变量示例
│
├── src/                               # 核心 Python Pipeline 代码
│   ├── pipeline.py                   # 主 Pipeline 流程
│   ├── arxiv_seed_retriever.py      # arXiv 种子论文检索
│   ├── snowball_retrieval.py        # 滚雪球检索
│   ├── cross_database_mapper.py     # 跨数据库映射
│   ├── pdf_downloader.py            # PDF 下载器
│   ├── grobid_parser.py             # GROBID 解析器
│   ├── rag_paper_analyzer.py        # RAG 论文分析
│   ├── llm_rag_paper_analyzer.py    # LLM RAG 分析
│   ├── citation_type_inferencer.py  # 引用类型推断
│   ├── knowledge_graph.py           # 知识图谱构建
│   ├── deep_survey_analyzer.py      # 深度调研分析
│   ├── topic_evolution_analyzer.py  # 主题演化分析
│   ├── research_idea_generator.py   # 研究想法生成
│   ├── openalex_client.py           # OpenAlex API 客户端
│   ├── papersearch.py               # 论文搜索
│   ├── llm_config.py                # LLM 配置
│   └── prompt_manager.py            # Prompt 管理
│
├── DeepPaper_Agent2.0/               # DeepPaper Agent 系统
│   ├── orchestrator.py              # Agent 编排器
│   ├── SectionLocatorAgent.py       # 章节定位 Agent
│   ├── LogicAnalystAgent.py         # 逻辑分析 Agent
│   ├── CitationDetectiveAgent.py    # 引用检测 Agent
│   ├── LimitationExtractor.py       # 局限性提取
│   ├── FutureWorkExtractor.py       # 未来工作提取
│   ├── critic_agent.py              # 评论 Agent
│   └── data_structures.py           # 数据结构
│
├── config/                           # 配置文件目录
│   └── config.yaml                  # 主配置文件
│
├── prompts/                          # Prompt 模板目录
│
├── data/                             # 数据目录
│
├── output/                           # 输出结果目录
│   └── [topic]/                     # 按主题组织的输出
│       ├── papers/                  # 论文 PDF 和解析结果
│       ├── knowledge_graph.json     # 知识图谱数据
│       ├── deep_survey.json         # 深度调研报告
│       ├── research_ideas.json      # 研究想法
│       └── visualization.html       # 可视化文件
│
├── logs/                             # 日志目录
│
├── test/                             # 测试文件
│
├── eval/                             # 评估脚本
│   ├── deeppaper_eval/              # DeepPaper 评估
│   ├── citation_eval/               # 引用评估
│   └── Future_Idea_Prediction/      # 未来想法预测评估
│
├── grobid/                           # GROBID 服务
│
├── model/                            # 模型文件
│
├── demo.py                           # 演示脚本
├── requirements.txt                  # Python 依赖
├── README.md                         # 主项目文档
├── README_WEB.md                     # Web 应用文档（本文件）
└── DEPLOYMENT.md                     # 部署文档
```

## 🚀 快速开始

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 启动后端服务器

```bash
cd backend
python main.py
# 或者使用 uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

后端将在 `http://localhost:8000` 运行。

### 4. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:3000` 运行。

### 5. 配置环境变量（可选）

创建 `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📖 功能特性

### 1. Dashboard 首页

- 项目介绍和系统架构图
- 快速开始：输入研究主题
- 历史分析记录列表
- 实时状态监控

### 2. Pipeline 执行界面

- 实时进度展示：8 个阶段的进度条
- 日志流：实时显示 Python 后端日志（WebSocket）
- 阶段详情：每个阶段的执行状态

### 3. 知识图谱可视化

- 交互式知识图谱（嵌入现有的 HTML 可视化）
- 节点筛选和搜索
- 关系类型过滤

### 4. 论文详情页

- 论文列表（表格形式）
- 单篇论文详情：
  - 基本信息（标题、作者、年份、引用数）
  - RAG 分析结果（Problem, Method, Limitation, Future Work）
  - 引用关系网络

### 5. Deep Survey 报告

- 结构化调研报告
- JSON 格式展示
- 导出功能（未来可扩展）

### 6. Research Ideas

- 生成的研究想法列表
- 想法详情（标题、摘要、可行性分析）
- 评分和筛选

## 🔌 API 端点

### Pipeline 管理

- `POST /api/pipeline/start` - 启动新的分析任务
- `GET /api/pipeline/status/{task_id}` - 查询任务状态
- `WS /api/pipeline/logs/{task_id}` - 实时日志流（WebSocket）

### 结果查询

- `GET /api/results` - 获取所有历史结果
- `GET /api/results/{task_id}` - 获取特定结果
- `GET /api/results/{task_id}/papers` - 获取论文列表
- `GET /api/results/{task_id}/graph` - 获取知识图谱数据
- `GET /api/results/{task_id}/survey` - 获取深度调研报告
- `GET /api/results/{task_id}/ideas` - 获取研究想法
- `GET /api/results/{task_id}/visualization` - 获取可视化 HTML 文件

## 🛠️ 开发

### 后端开发

后端使用 FastAPI，支持：

- 异步任务执行
- WebSocket 实时日志推送
- RESTful API

### 前端开发

前端使用 Next.js App Router：

- 服务端组件和客户端组件
- 自动代码分割
- 优化的性能

## 📦 部署

### 后端部署

可以使用以下方式部署后端：

- Docker
- 云服务器（阿里云 ECS、AWS EC2 等）
- Railway、Render 等平台

### 前端部署

前端可以部署到：

- Vercel（推荐，Next.js 官方平台）
- 阿里云 ESA Pages
- Netlify
- 任何支持静态网站的主机

### 环境变量配置

**后端**:

- 确保 `config/config.yaml` 配置正确
- 确保 Python 依赖已安装

**前端**:

- 设置 `NEXT_PUBLIC_API_URL` 指向后端地址

## 🐛 已完成的功能

### 1. 后端服务器 (FastAPI)

**文件**: `backend/main.py`

**功能**:

- ✅ REST API 端点
  - `POST /api/pipeline/start` - 启动新的分析任务
  - `GET /api/pipeline/status/{task_id}` - 查询任务状态
  - `GET /api/results` - 获取所有历史结果
  - `GET /api/results/{task_id}` - 获取特定结果
  - `GET /api/results/{task_id}/papers` - 获取论文列表
  - `GET /api/results/{task_id}/graph` - 获取知识图谱数据
  - `GET /api/results/{task_id}/survey` - 获取深度调研报告
  - `GET /api/results/{task_id}/ideas` - 获取研究想法
  - `GET /api/results/{task_id}/visualization` - 获取可视化 HTML 文件
- ✅ WebSocket 实时日志推送
  - `WS /api/pipeline/logs/{task_id}` - 实时日志流
- ✅ 异步任务执行
- ✅ 进度跟踪（8 个阶段）
- ✅ CORS 支持

### 2. 前端应用 (Next.js)

#### 页面结构

**首页** (`app/page.tsx`)

- ✅ 项目介绍和系统架构图
- ✅ 快速开始按钮
- ✅ 历史分析记录列表（显示最近 5 条）
- ✅ 功能特性展示卡片

**Pipeline 执行页面** (`app/pipeline/[id]/page.tsx`)

- ✅ 实时进度展示（8 个阶段的进度条）
- ✅ WebSocket 实时日志流
- ✅ 阶段详情显示
- ✅ 状态监控（连接状态、当前阶段）
- ✅ 自动跳转到结果页面（完成时）

**新建分析页面** (`app/pipeline/new/page.tsx`)

- ✅ 研究主题输入
- ✅ 配置选项（最大论文数、DeepPaper、滚雪球检索等）
- ✅ 表单验证
- ✅ 错误处理

**结果列表页面** (`app/results/page.tsx`)

- ✅ 所有历史分析记录
- ✅ 搜索功能
- ✅ 卡片式展示

**结果详情页面** (`app/results/[id]/page.tsx`)

- ✅ 标签页导航（概览、知识图谱、论文列表、深度调研、研究想法）
- ✅ **概览标签页**:
  - 统计卡片（总论文数、成功分析、图谱节点、图谱边）
  - 快速访问链接
  - 可视化文件链接
- ✅ **知识图谱标签页**:
  - 嵌入现有的 HTML 可视化（iframe）
- ✅ **论文列表标签页**:
  - 论文列表（左侧）
  - 论文详情（右侧）
  - RAG 分析结果展示（Problem, Method, Limitation, Future Work）
- ✅ **深度调研标签页**:
  - JSON 格式展示调研报告
- ✅ **研究想法标签页**:
  - 想法列表
  - 想法详情（标题、描述、可行性分析）

#### 工具库

**API 客户端** (`lib/api.ts`)

- ✅ 完整的 API 客户端封装
- ✅ TypeScript 类型定义
- ✅ WebSocket URL 生成
- ✅ 错误处理

### 3. 配置和文档

**配置文件**:

- ✅ `backend/requirements.txt` - 后端依赖
- ✅ `frontend/package.json` - 前端依赖和脚本
- ✅ `frontend/tsconfig.json` - TypeScript 配置
- ✅ `frontend/tailwind.config.js` - Tailwind CSS 配置
- ✅ `frontend/next.config.js` - Next.js 配置

**文档**:

- ✅ `README_WEB.md` - 完整的使用文档
- ✅ `QUICKSTART.md` - 快速启动指南
- ✅ `WEB_APP_SUMMARY.md` - 项目总结（本文件）

**启动脚本**:

- ✅ `start_backend.sh` - 后端启动脚本
- ✅ `start_frontend.sh` - 前端启动脚本

## 🚀 下一步建议

### 功能增强

1. **Markdown 渲染**: 在深度调研页面使用 `react-markdown` 渲染 Markdown 内容
2. **导出功能**: 添加 PDF/Word 导出功能
3. **数据可视化**: 添加更多图表（论文年份分布、引用网络统计等）
4. **搜索和过滤**: 在论文列表中添加搜索和过滤功能
5. **用户认证**: 添加用户登录和权限管理
6. **数据持久化**: 使用数据库存储任务和结果（替代内存存储）

### 性能优化

1. **缓存**: 添加结果缓存机制
2. **分页**: 对大量论文进行分页加载
3. **懒加载**: 对大型可视化进行懒加载
4. **CDN**: 使用 CDN 加速静态资源

### 部署优化

1. **Docker**: 创建 Docker 容器
2. **CI/CD**: 设置自动化部署流程
3. **监控**: 添加应用监控和日志收集
4. **负载均衡**: 支持多实例部署
