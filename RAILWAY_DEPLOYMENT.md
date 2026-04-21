# EvoNarrator Railway 部署指南

## 前置准备

1. **GitHub 账号**：确保你的项目已上传到 GitHub
2. **Railway 账号**：访问 https://railway.app 用 GitHub 登录
3. **API Keys**：准备好你的 LLM API Key（OpenAI/DeepSeek 等）

---

## 部署步骤

### 第一步：部署后端

1. **登录 Railway**
   - 访问 https://railway.app
   - 点击 "Login" 用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的 `EvoNarrator_web` 仓库

3. **配置后端服务**
   - Railway 会自动检测到项目
   - 点击项目，然后点击 "New Service"
   - 选择 "GitHub Repo" → 选择你的仓库
   - 在 "Root Directory" 中输入：`/`（保持根目录）

4. **设置环境变量**
   - 点击服务 → "Variables" 标签
   - 添加以下变量：
     ```
     PORT=8000
     PYTHONUNBUFFERED=1
     OPENAI_API_KEY=你的API密钥
     OPENAI_API_BASE=https://api.openai.com/v1
     ```

5. **等待部署完成**
   - Railway 会自动构建和部署
   - 部署成功后，点击 "Settings" → "Networking"
   - 点击 "Generate Domain" 生成公开域名
   - **复制这个域名**（例如：`https://evonarrator-backend-production.up.railway.app`）

---

### 第二步：部署前端

1. **在同一个项目中添加前端服务**
   - 回到项目主页
   - 点击 "New Service"
   - 选择 "GitHub Repo" → 选择同一个仓库
   - 在 "Root Directory" 中输入：`frontend`

2. **设置环境变量**
   - 点击前端服务 → "Variables" 标签
   - 添加：
     ```
     NEXT_PUBLIC_API_URL=你刚才复制的后端域名
     NODE_ENV=production
     ```

3. **生成前端域名**
   - 点击 "Settings" → "Networking"
   - 点击 "Generate Domain"
   - **复制前端域名**（例如：`https://evonarrator-frontend-production.up.railway.app`）

---

### 第三步：更新 CORS 配置

1. **修改后端代码**
   - 打开本地项目的 `backend/main.py`
   - 找到 CORS 配置（第 48 行左右）
   - 将前端域名添加到允许列表：
     ```python
     allow_origins=[
         "http://localhost:3000",  # Local development
         "https://你的前端域名.railway.app"  # 替换成实际域名
     ],
     ```

2. **提交并推送代码**
   ```bash
   git add backend/main.py
   git commit -m "Update CORS for Railway deployment"
   git push
   ```

3. **Railway 会自动重新部署后端**

---

### 第四步：测试部署

1. 访问你的前端域名
2. 点击"与后端连接"按钮
3. 输入研究主题，点击"开始分析"
4. 查看是否能正常运行

---

## 常见问题

### 1. 后端部署失败
- 检查 `requirements.txt` 是否包含所有依赖
- 查看 Railway 的部署日志（Deployments → 点击最新部署 → View Logs）

### 2. 前端无法连接后端
- 确认 `NEXT_PUBLIC_API_URL` 环境变量设置正确
- 确认后端 CORS 配置包含前端域名
- 检查后端服务是否正常运行

### 3. WebSocket 连接失败
- Railway 支持 WebSocket，但确保后端域名使用 `https://`（不是 `http://`）
- 前端 WebSocket 连接会自动使用 `wss://`

### 4. 构建时间过长
- 首次部署会下载所有依赖，可能需要 5-10 分钟
- 后续部署会使用缓存，速度会快很多

---

## 费用说明

- Railway 免费套餐：每月 $5 额度
- 估算使用：
  - 后端服务：~$3-4/月（持续运行）
  - 前端服务：~$1-2/月（按需运行）
- 如果超出免费额度，可以升级到 Hobby 计划（$5/月）

---

## 下一步优化

1. **自定义域名**：在 Railway 中可以绑定自己的域名
2. **环境分离**：创建 dev/prod 两个环境
3. **监控告警**：使用 Railway 的监控功能
4. **数据库**：如需持久化存储，可添加 PostgreSQL 服务

---

## 需要帮助？

- Railway 文档：https://docs.railway.app
- Railway Discord：https://discord.gg/railway
- 项目 Issues：在 GitHub 仓库提交问题
