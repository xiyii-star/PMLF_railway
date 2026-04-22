# EvoNarrator Railway 部署完整指南

本指南记录了从零开始将 EvoNarrator 项目部署到 Railway 的完整流程，包括遇到的所有问题和解决方案。

---

## 一、前置准备

### 1.1 必需条件
- **GitHub 账号**：项目需要托管在 GitHub
- **Railway 账号**：访问 https://railway.app 用 GitHub 登录（免费）
- **API Keys**：OpenAI/DeepSeek 等 LLM 服务的 API 密钥

### 1.2 项目结构要求
```
EvoNarrator_web/
├── backend/
│   ├── main.py              # FastAPI 后端入口
│   └── requirements.txt     # 后端依赖（可选，会合并到根目录）
├── frontend/
│   ├── app/                 # Next.js 应用
│   ├── lib/
│   │   └── api.ts          # API 客户端（必需）
│   ├── package.json
│   ├── .env.production     # 生产环境配置（需清空硬编码）
│   ├── .node-version       # Node 版本（18.x）
│   └── Procfile            # 启动命令
├── requirements.txt         # 根目录依赖（必需，包含所有后端依赖）
├── Procfile                # 后端启动命令
├── runtime.txt             # Python 版本
└── .gitignore

```

---

## 二、项目准备工作（关键步骤）

### 2.1 清理 Git 子模块问题
**问题**：frontend 目录可能是 git 子模块，导致文件无法提交

**解决**：
```bash
cd /path/to/EvoNarrator_web
rm -rf frontend/.git grobid/.git  # 删除子目录的 .git
git rm --cached frontend           # 移除子模块缓存
git add frontend/                  # 重新添加为普通目录
```

### 2.2 创建必需的配置文件

#### 2.2.1 根目录 `Procfile`（后端启动命令）
```
web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

#### 2.2.2 根目录 `runtime.txt`（Python 版本）
```
python = "^3.10"
```

#### 2.2.3 根目录 `requirements.txt`（合并所有依赖）
```python
# Backend API Dependencies
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
websockets>=12.0
pydantic>=2.0.0

# Core Dependencies
requests>=2.28.0
networkx>=2.8
matplotlib>=3.5.0
plotly>=5.10.0
PyPDF2>=3.0.0
pyyaml>=6.0
arxiv

# Basic ML Dependencies (lightweight)
scikit-learn>=1.0.0
numpy>=1.21.0

# LLM Enhancement
openai>=1.0.0
anthropic>=0.18.0

# LangChain Dependencies
langchain>=0.1.0
langchain-openai>=0.1.0
langchain-core>=0.1.0

# 注意：移除了 torch, transformers, sentence-transformers, modelscope
# 这些包太大会导致 Railway 构建超时
```

**重要**：必须移除重量级依赖（torch、transformers 等），否则构建会超时！

#### 2.2.4 前端 `frontend/.node-version`
```
node-version = "18.x"
```

#### 2.2.5 前端 `frontend/Procfile`
```
web: npm start
```

#### 2.2.6 前端 `frontend/.env.production`（关键！）
```bash
# 生产环境 API 配置
# Railway 部署时，NEXT_PUBLIC_API_URL 会从环境变量中读取
# 本文件不再硬编码 API 地址，而是使用空值让环境变量生效
NEXT_PUBLIC_API_URL=
```

**重要**：必须清空 `.env.production` 中的硬编码 URL，否则会覆盖 Railway 环境变量！

### 2.3 确保 frontend/lib/api.ts 存在
```bash
# 检查文件是否存在
ls frontend/lib/api.ts

# 如果不存在，需要创建或从其他地方复制
# 强制添加到 git（可能被 .gitignore 忽略）
git add -f frontend/lib/
```

### 2.4 修改 frontend/next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Railway 部署时不使用 export 模式，使用服务器模式
  // output: 'export',  // 注释掉这行
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig
```

### 2.5 推送到 GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## 三、Railway 部署流程

### 3.1 部署后端服务

#### 步骤 1：创建项目
1. 访问 https://railway.app
2. 点击 "Login" 用 GitHub 登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择你的仓库（如 `xiyii-star/PMLF_railway`）

#### 步骤 2：配置后端服务
1. Railway 自动创建第一个服务（后端）
2. 确认 "Root Directory" 为 `/`（根目录）
3. Railway 会自动检测 `Procfile` 和 `requirements.txt`

#### 步骤 3：设置后端环境变量
进入服务 → "Variables" 标签，添加：
```
PORT=8000
PYTHONUNBUFFERED=1
OPENAI_API_KEY=sk-xxxxx（你的实际 API Key）
OPENAI_API_BASE=https://api.openai.com/v1
```

#### 步骤 4：等待构建完成
- 首次构建需要 5-10 分钟
- 查看 "Deployments" 标签监控进度
- 如果失败，查看日志排查问题

#### 步骤 5：生成后端域名
1. 进入 "Settings" → "Networking"
2. 点击 "Generate Domain"
3. **复制域名**（例如：`https://pmlfrailway-production.up.railway.app`）

---

### 3.2 部署前端服务

#### 步骤 1：添加前端服务
1. 回到项目主页
2. 点击 "New Service"
3. 选择 "GitHub Repo" → 选择同一个仓库
4. **重要**：在 "Settings" → "Source" 中设置 "Root Directory" 为 `frontend`

#### 步骤 2：设置前端环境变量
进入前端服务 → "Variables" 标签，添加：
```
NEXT_PUBLIC_API_URL=https://pmlfrailway-production.up.railway.app
NODE_ENV=production
```

**注意**：`NEXT_PUBLIC_API_URL` 必须是完整的后端域名，不要有多余路径

#### 步骤 3：等待前端构建
- Next.js 构建需要 3-5 分钟
- 确保 `frontend/lib/api.ts` 已提交，否则会报 "Module not found" 错误

#### 步骤 4：生成前端域名
1. 进入 "Settings" → "Networking"
2. 点击 "Generate Domain"
3. **复制域名**（例如：`https://intelligent-unity-production.up.railway.app`）

---

### 3.3 更新后端 CORS 配置

#### 步骤 1：修改本地代码
编辑 `backend/main.py`，找到 CORS 配置（约第 46-55 行）：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://intelligent-unity-production.up.railway.app",  # Railway 前端
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 步骤 2：提交并推送
```bash
git add backend/main.py
git commit -m "Add Railway frontend domain to CORS whitelist"
git push origin main
```

#### 步骤 3：等待自动重新部署
Railway 检测到代码变更会自动重新部署后端（约 2-3 分钟）

---

## 四、测试部署

### 4.1 访问前端
打开浏览器访问：`https://intelligent-unity-production.up.railway.app`

### 4.2 测试连接
1. 点击"与后端连接"按钮
2. 打开浏览器开发者工具（F12）查看 Network 标签
3. 确认请求 URL 格式正确：
   ```
   正确：https://pmlfrailway-production.up.railway.app/api/pipeline/start
   错误：https://intelligent-unity-production.up.railway.app/pipeline/pmlfrailway-production.up.railway.app/api/pipeline/start
   ```

### 4.3 测试功能
1. 输入研究主题（如 "Natural Language Processing"）
2. 点击"开始分析"
3. 观察 WebSocket 日志输出
4. 等待分析完成

---

## 五、常见问题与解决方案

### 5.1 构建超时（Build timed out）
**原因**：依赖包太大（torch、transformers 等）

**解决**：
1. 编辑 `requirements.txt`，移除重量级依赖
2. 只保留必需的轻量级包
3. 重新提交推送

### 5.2 前端 404 错误
**原因**：`.env.production` 硬编码了旧的 API 地址

**解决**：
1. 清空 `frontend/.env.production` 中的 `NEXT_PUBLIC_API_URL`
2. 确保 Railway 环境变量正确设置
3. 重新部署

### 5.3 Module not found: Can't resolve '@/lib/api'
**原因**：`frontend/lib/api.ts` 未提交到 Git

**解决**：
```bash
git add -f frontend/lib/api.ts
git commit -m "Add frontend lib directory with api.ts"
git push
```

### 5.4 pip: command not found
**原因**：nixpacks 配置错误或 Python 环境问题

**解决**：
1. 删除 `nixpacks.toml` 和 `railway.json`（让 Railway 自动检测）
2. 只保留 `Procfile` 和 `runtime.txt`
3. 重新部署

### 5.5 CORS 错误
**原因**：后端未允许前端域名

**解决**：
1. 在 `backend/main.py` 的 `allow_origins` 中添加前端域名
2. 推送代码触发重新部署

### 5.6 WebSocket 连接失败
**原因**：域名协议不匹配

**解决**：
- 确保后端域名使用 `https://`（不是 `http://`）
- Railway 自动支持 WebSocket over HTTPS

---

## 六、部署检查清单

### 6.1 代码准备
- [ ] 清理 Git 子模块（删除 frontend/.git）
- [ ] 创建根目录 `Procfile`
- [ ] 创建根目录 `runtime.txt`
- [ ] 合并所有依赖到根目录 `requirements.txt`
- [ ] 移除重量级依赖（torch、transformers）
- [ ] 创建 `frontend/.node-version`
- [ ] 创建 `frontend/Procfile`
- [ ] 清空 `frontend/.env.production` 的硬编码 URL
- [ ] 注释 `frontend/next.config.js` 的 `output: 'export'`
- [ ] 确保 `frontend/lib/api.ts` 存在并已提交
- [ ] 推送所有代码到 GitHub

### 6.2 Railway 后端配置
- [ ] 创建 Railway 项目并连接 GitHub 仓库
- [ ] Root Directory 设置为 `/`
- [ ] 添加环境变量：PORT, PYTHONUNBUFFERED, OPENAI_API_KEY
- [ ] 等待构建完成
- [ ] 生成后端域名并复制

### 6.3 Railway 前端配置
- [ ] 添加新服务，Root Directory 设置为 `frontend`
- [ ] 添加环境变量：NEXT_PUBLIC_API_URL, NODE_ENV
- [ ] 等待构建完成
- [ ] 生成前端域名并复制

### 6.4 CORS 配置
- [ ] 更新 `backend/main.py` 的 CORS 配置
- [ ] 添加前端域名到 `allow_origins`
- [ ] 推送代码触发重新部署

### 6.5 测试验证
- [ ] 访问前端域名
- [ ] 测试"与后端连接"功能
- [ ] 检查浏览器 Network 标签的请求 URL
- [ ] 测试完整的分析流程

---

## 七、关键经验总结

### 7.1 必须做的事
1. **移除重量级依赖**：torch、transformers 会导致构建超时
2. **清空 .env.production**：硬编码会覆盖环境变量
3. **提交 lib/api.ts**：前端构建必需
4. **清理 Git 子模块**：否则文件无法提交
5. **使用 Procfile**：明确告诉 Railway 如何启动服务

### 7.2 不要做的事
1. **不要使用 nixpacks.toml**：容易出错，让 Railway 自动检测更好
2. **不要在 .env.production 硬编码 URL**：会覆盖环境变量
3. **不要使用 Next.js export 模式**：Railway 需要服务器模式
4. **不要忘记更新 CORS**：否则前端无法连接后端

### 7.3 调试技巧
1. **查看部署日志**：Deployments → 点击部署 → View Logs
2. **检查环境变量**：Variables 标签确认所有变量正确
3. **浏览器开发者工具**：Network 标签查看请求 URL
4. **测试后端 API**：用 curl 直接测试后端端点
   ```bash
   curl https://your-backend.railway.app/api/results
   ```

---

## 八、费用与优化

### 8.1 费用估算
- **免费额度**：每月 $5
- **后端服务**：约 $3-4/月（持续运行）
- **前端服务**：约 $1-2/月（按需运行）
- **超出后**：可升级到 Hobby 计划（$5/月）

### 8.2 优化建议
1. **自定义域名**：在 Railway 绑定自己的域名
2. **环境分离**：创建 dev/prod 两个项目
3. **监控告警**：使用 Railway 的监控功能
4. **数据持久化**：添加 PostgreSQL 服务存储结果

---

## 九、更新部署

### 9.1 代码更新流程
```bash
# 1. 修改代码
# 2. 提交更改
git add .
git commit -m "Update: 描述你的更改"
git push origin main

# 3. Railway 自动检测并重新部署（无需手动操作）
```

### 9.2 环境变量更新
1. 进入 Railway 服务 → Variables 标签
2. 修改或添加变量
3. 点击 "Redeploy" 触发重新部署

---

## 十、参考资源

- **Railway 官方文档**：https://docs.railway.app
- **Railway Discord 社区**：https://discord.gg/railway
- **项目 GitHub**：https://github.com/xiyii-star/PMLF_railway
- **FastAPI 文档**：https://fastapi.tiangolo.com
- **Next.js 文档**：https://nextjs.org/docs

---

## 附录：完整文件清单

### 根目录文件
```
Procfile                    # web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
runtime.txt                 # python = "^3.10"
requirements.txt            # 所有后端依赖（不含 torch/transformers）
.gitignore                  # 忽略 node_modules, .next, output 等
```

### 前端文件
```
frontend/.node-version      # node-version = "18.x"
frontend/Procfile           # web: npm start
frontend/.env.production    # NEXT_PUBLIC_API_URL=（空值）
frontend/lib/api.ts         # API 客户端（必需）
frontend/next.config.js     # 注释 output: 'export'
```

### 后端文件
```
backend/main.py             # FastAPI 应用，包含 CORS 配置
backend/requirements.txt    # 可选，会合并到根目录
```

---

**部署成功标志**：
- ✅ 前端域名可访问
- ✅ 点击"与后端连接"无错误
- ✅ 可以输入主题并开始分析
- ✅ WebSocket 日志正常输出
- ✅ 分析完成后可查看结果

**恭喜！你已成功将 EvoNarrator 部署到 Railway！** 🎉
