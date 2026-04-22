# ESA Pages 部署测试指南

## 问题分析

您看到的错误 `Mixed Content: ... http://47.102.99.87:8000/api/results` 说明：
- ❌ ESA Pages 上的版本仍然在直接访问后端 HTTP URL
- ✅ 本地构建的新版本已经正确配置（使用相对路径）
- 🔄 需要重新部署到 ESA Pages

## 测试方法

### 方法 1：使用本地服务器测试（推荐）

避免浏览器缓存，验证构建产物是否正确：

```bash
# 1. 安装 http-server（如果没有）
npm install -g http-server

# 2. 进入构建目录
cd "/home/lexy/桌面/EvoNarrator _web/frontend/out"

# 3. 启动本地服务器
http-server -p 3000

# 4. 在浏览器中访问
# http://localhost:3000
```

**测试要点：**
- 打开浏览器开发者工具（F12）
- 查看 Network 标签
- 刷新页面
- 检查 API 请求的 URL 是否为相对路径（如 `/api/results`）

---

### 方法 2：使用 curl 测试（命令行）

直接测试 API 请求，不受浏览器缓存影响：

```bash
# 测试本地构建的 index.html
curl -I http://localhost:3000/

# 检查 JavaScript 文件中是否包含后端 URL
grep -r "47.102.99.87" "/home/lexy/桌面/EvoNarrator _web/frontend/out/_next" | grep -v "_worker.js"
```

**预期结果：**
- 应该只在 `_worker.js` 中找到后端 URL
- 其他 JavaScript 文件中不应该有硬编码的后端 URL

---

### 方法 3：使用隐私模式测试 ESA Pages

避免浏览器缓存影响：

1. **打开隐私/无痕模式**
   - Chrome: Ctrl+Shift+N
   - Firefox: Ctrl+Shift+P
   - Edge: Ctrl+Shift+N

2. **访问 ESA Pages URL**
   ```
   https://pmlf-frontend.2fd15639.er.aliyun-esa.net/
   ```

3. **打开开发者工具（F12）**
   - 切换到 Network 标签
   - 勾选 "Disable cache"
   - 刷新页面（Ctrl+Shift+R）

4. **检查 API 请求**
   - 查找 `/api/results` 请求
   - 检查 Request URL 是否为：
     - ✅ 正确：`https://pmlf-frontend.2fd15639.er.aliyun-esa.net/api/results`
     - ❌ 错误：`http://47.102.99.87:8000/api/results`

---

## 本地验证清单

在重新部署到 ESA Pages 之前，先验证本地构建：

### ✅ 检查 1：环境变量配置

```bash
cat "/home/lexy/桌面/EvoNarrator _web/frontend/.env.production"
```

**预期输出：**
```
NEXT_PUBLIC_API_URL=
```

### ✅ 检查 2：构建产物中的 URL

```bash
# 检查前端 JS 文件（不包括 _worker.js）
cd "/home/lexy/桌面/EvoNarrator _web/frontend/out"
find _next -name "*.js" -type f ! -name "_worker.js" -exec grep -l "47.102.99.87" {} \;
```

**预期输出：**
- 应该没有任何输出（表示前端 JS 中没有硬编码的后端 URL）

### ✅ 检查 3：边缘函数文件

```bash
cat "/home/lexy/桌面/EvoNarrator _web/frontend/out/_worker.js" | grep "BACKEND_URL"
```

**预期输出：**
```javascript
const BACKEND_URL = 'http://47.102.99.87:8000'
```

### ✅ 检查 4：esa.jsonc 配置

```bash
cat "/home/lexy/桌面/EvoNarrator _web/frontend/esa.jsonc"
```

**预期输出：**
```json
{
  "entry": "./out/_worker.js",
  "assets": {
    "directory": "./out"
  }
}
```

---

## ESA Pages 部署后验证

### 1. 检查部署日志

在 ESA Pages 控制台查看：
- 构建是否成功
- 边缘函数是否已启用
- 是否有错误信息

### 2. 检查边缘函数状态

在 ESA Pages 控制台：
- 进入"边缘函数"或"Edge Functions"页面
- 确认 `_worker.js` 已部署
- 查看执行日志

### 3. 测试 API 请求

使用 curl 测试（替换为您的域名）：

```bash
# 测试 API 请求是否被正确代理
curl -v https://pmlf-frontend.2fd15639.er.aliyun-esa.net/api/results
```

**预期结果：**
- 返回 200 OK 或后端的实际响应
- 不应该返回 404 或 CORS 错误

---

## 常见问题排查

### 问题 1：仍然看到混合内容错误

**原因：** ESA Pages 缓存了旧版本

**解决方案：**
1. 在 ESA Pages 控制台清除缓存
2. 等待 5-10 分钟让 CDN 更新
3. 使用隐私模式重新测试

### 问题 2：边缘函数未生效

**原因：** 边缘函数配置不正确

**解决方案：**
1. 检查 `esa.jsonc` 中的 `entry` 路径
2. 确认 `out/_worker.js` 文件存在
3. 在 ESA Pages 控制台手动启用边缘函数

### 问题 3：API 请求返回 404

**原因：** 边缘函数没有正确拦截 `/api/*` 请求

**解决方案：**
1. 检查 `_worker.js` 中的路径匹配逻辑
2. 查看 ESA Pages 边缘函数执行日志
3. 确认后端服务器 `http://47.102.99.87:8000` 可访问

---

## 推荐的测试流程

1. **本地测试** → 使用 http-server 验证构建产物
2. **推送代码** → 提交到 GitHub
3. **等待部署** → ESA Pages 自动部署（5-10 分钟）
4. **清除缓存** → 在 ESA Pages 控制台清除缓存
5. **隐私模式测试** → 避免浏览器缓存
6. **检查日志** → 查看边缘函数执行日志

---

## 使用的测试工具

### 浏览器工具
- **Chrome DevTools**（推荐）
  - Network 标签：查看请求 URL
  - Console 标签：查看错误信息
  - Application 标签：清除缓存

### 命令行工具
- **curl**：测试 HTTP 请求
- **http-server**：本地静态服务器
- **grep**：搜索文件内容

### 在线工具
- **Postman**：测试 API 请求
- **httpie**：更友好的 curl 替代品

---

## 下一步操作

1. ✅ 本地构建已完成且正确
2. 🔄 需要推送代码到 GitHub
3. ⏳ 等待 ESA Pages 自动部署
4. 🧪 使用隐私模式测试新版本

**重要提示：** 您当前看到的错误来自 ESA Pages 上的旧版本，不是本地构建的问题！
