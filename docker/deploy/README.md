# 无源码 Docker 部署说明

## 使用方式

### 1. 准备配置文件
```bash
# 复制示例配置
cp config.json.example config.json

# 编辑配置，设置你的 API 密钥
vim config.json
```

config.json 格式：
```json
{
  "apiKeys": ["your-secret-api-key-1", "your-secret-api-key-2"],
  "port": 3000
}
```

### 2. 设置镜像仓库（可选）
```bash
# 创建 .env 文件
cat > .env << EOF
REGISTRY=your-registry  # Docker 仓库地址
TAG=latest              # 镜像标签
EOF
```

### 3. 启动服务
```bash
docker compose up -d
```

### 4. 停止服务
```bash
docker compose down
```

## 构建并推送镜像（在有源码的机器上执行）

```bash
# 在项目根目录
cd docker/latest
docker compose build

# 打标签
docker tag latest_api:latest your-registry/md-api:latest
docker tag latest_web:latest your-registry/md-web:latest

# 推送
docker push your-registry/md-api:latest
docker push your-registry/md-web:latest
```

## 目录结构

```
deploy/
├── docker-compose.yml      # 部署配置
├── config.json             # API 密钥配置（需自行创建）
├── config.json.example     # 配置示例
├── .env                    # 镜像仓库设置（可选）
└── README.md               # 本文件
```

