# Railway 部署环境变量配置说明

## 后端服务环境变量

在 Railway 后端服务中需要配置以下环境变量：

### 必需变量
```
PORT=8000
PYTHONUNBUFFERED=1
```

### API Keys（根据你使用的 LLM 服务配置）
```
# OpenAI API（如果使用 OpenAI）
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_BASE=https://api.openai.com/v1

# 或者使用 DeepSeek API
OPENAI_API_KEY=your_deepseek_api_key
OPENAI_API_BASE=https://api.deepseek.com

# 或者使用本地 Ollama
OPENAI_API_BASE=http://your-ollama-server:11434/v1
```

### 可选变量
```
# 日志级别
LOG_LEVEL=INFO

# CORS 允许的前端域名（部署后需要更新）
FRONTEND_URL=https://your-frontend.railway.app
```

---

## 前端服务环境变量

在 Railway 前端服务中需要配置：

### 必需变量
```
# 后端 API 地址（部署后端后会获得）
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Node 环境
NODE_ENV=production
```

---

## 部署后需要做的事

1. **后端部署完成后**：
   - 复制后端的 Railway 域名（例如：`https://evonarrator-backend.railway.app`）
   - 在前端服务中设置 `NEXT_PUBLIC_API_URL` 为这个域名

2. **前端部署完成后**：
   - 复制前端的 Railway 域名（例如：`https://evonarrator-frontend.railway.app`）
   - 更新后端代码中的 CORS 配置，将前端域名添加到允许列表
   - 重新部署后端

3. **测试连接**：
   - 访问前端域名
   - 点击"与后端连接"按钮
   - 确认 WebSocket 连接成功
