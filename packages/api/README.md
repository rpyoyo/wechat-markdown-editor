# Markdown to HTML API Service

将 Markdown 转换为 HTML 的 API 服务，支持自定义主题和 API Key 认证。

---

## 📋 目录

- [本地开发](#本地开发)
- [服务器部署](#服务器部署)
- [API 接口文档](#api-接口文档)
- [配置说明](#配置说明)

---

## 本地开发

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
# 在项目根目录执行
pnpm install
```

### 配置 API Key

编辑 `packages/api/config.json`：

```json
{
  "apiKeys": ["your-secret-key"],
  "port": 3000
}
```

> 💡 如果 `apiKeys` 为空数组，服务会接受任意 API Key（开发模式）

### 启动开发服务器

```bash
cd packages/api
pnpm dev
```

服务运行在 `http://localhost:3000`

### 测试接口

```bash
# 健康检查
curl -H "X-API-Key: your-secret-key" http://localhost:3000/api/health

# Markdown 转 HTML
curl -X POST http://localhost:3000/api/render \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# Hello\n**World**"}'
```

---

## 服务器部署

### 方式一：Docker Compose（推荐）

#### 1. 准备配置文件

```bash
cd docker/latest

# 编辑 API Key 配置
nano ../../packages/api/config.json
```

#### 2. 构建并启动

```bash
docker-compose up -d --build
```

#### 3. 检查状态

```bash
docker-compose ps
docker-compose logs -f api
```

服务默认运行在：

- Web: `http://your-server:80`
- API: `http://your-server/api/`

#### 4. 停止服务

```bash
docker-compose down
```

---

### 方式二：独立部署 API 服务

#### 1. 构建生产版本

```bash
cd packages/api
pnpm build
```

#### 2. 启动服务

```bash
# 直接启动
node dist/index.js

# 或使用 PM2
pm2 start dist/index.js --name md-api
```

#### 3. 反向代理配置 (Nginx)

```nginx
server {
    listen 80;
    server_name api.example.com;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10m;
    }
}
```

---

## API 接口文档

所有接口需要 `X-API-Key` Header 认证。

### 健康检查

```http
GET /api/health
```

**响应:**

```json
{ "status": "ok", "timestamp": "2026-01-30T10:00:00.000Z" }
```

---

### Markdown 转 HTML

```http
POST /api/render
Content-Type: application/json
```

**请求体:**

```json
{
  "markdown": "# 标题\n正文内容",
  "themeId": "optional-theme-id",
  "format": "wechat"
}
```

| 参数     | 类型   | 必填 | 说明                                             |
| -------- | ------ | ---- | ------------------------------------------------ |
| markdown | string | ✅   | Markdown 内容                                    |
| themeId  | string | ❌   | 主题 ID                                          |
| format   | string | ❌   | 输出格式: `wechat`(默认) / `html` / `html-plain` |

**响应:**

```json
{
  "success": true,
  "data": {
    "html": "<style>...</style><section>...</section>",
    "css": null,
    "readingTime": { "chars": 100, "words": 20, "minutes": 1 }
  }
}
```

---

### 主题管理

#### 上传主题

```http
POST /api/themes
Content-Type: multipart/form-data
```

表单字段:

- `theme`: CSS 文件
- `name`: 主题名称（可选）

#### 获取主题列表

```http
GET /api/themes
```

#### 下载主题

```http
GET /api/themes/:id
```

#### 删除主题

```http
DELETE /api/themes/:id
```

---

## 配置说明

### config.json

| 字段    | 类型     | 说明                  |
| ------- | -------- | --------------------- |
| apiKeys | string[] | 有效的 API Key 列表   |
| port    | number   | 服务端口（默认 3000） |

配置文件每 60 秒自动重新加载，无需重启服务。

### 主题存储

上传的主题保存在 `packages/api/themes/` 目录，包含：

- `metadata.json` - 主题元数据
- `{id}.css` - 主题 CSS 文件

---

## 常见问题

### Q: 如何生成 API Key？

使用任意安全的随机字符串生成器，如：

```bash
openssl rand -hex 32
```

### Q: 如何从 Web 应用导出主题？

1. 打开 Web 编辑器
2. 点击"自定义样式"按钮
3. 点击"导出主题"
4. 将导出的 CSS 文件上传到 API

### Q: Docker 部署时主题数据会丢失吗？

不会。`docker-compose.yml` 配置了持久化卷 `api_themes`，数据会保留。
