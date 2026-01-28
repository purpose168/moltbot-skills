# CAD Agent（CAD 代理）

> 让您的 AI 代理拥有 CAD 工作的"眼睛"。

## 描述

CAD Agent 是一个渲染服务器，让 AI 代理能够看到它们正在构建的内容。发送建模命令 → 接收渲染图像 → 可视化迭代。

**使用场景：** 设计 3D 可打印零件、参数化 CAD、机械设计、build123d 建模

## 架构

**关键点：** 所有 CAD 逻辑都在容器内运行。您（代理）只需要：
1. 通过 HTTP 发送命令
2. 查看返回的图像
3. 决定下一步做什么

```
您（代理）                     CAD 代理容器
─────────────                   ───────────────────
发送 build123d 代码     →      执行建模操作
                         ←      返回 JSON 状态
请求渲染                 →      VTK 渲染模型
                         ←      返回 PNG 图像
*查看图像*
决定：迭代或完成
```

**永远不要**在容器外进行 STL 操作、网格处理或渲染。容器处理一切——您只需要命令和观察。

## 设置

### 1. 克隆仓库

```bash
git clone https://github.com/clawd-maf/cad-agent.git
cd cad-agent
```

### 2. 构建 Docker 镜像

```bash
docker build -t cad-agent:latest .
```

或使用 docker-compose：

```bash
docker-compose build
```

### 3. 运行服务器

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或直接使用 docker
docker run -d --name cad-agent -p 8123:8123 cad-agent:latest serve
```

### 4. 验证安装

```bash
curl http://localhost:8123/health
# 应该返回: {"status": "healthy", ...}
```

> **Docker-in-Docker 注意事项：** 在嵌套容器环境中（例如 Clawdbot 沙盒），主机网络可能无法工作——即使服务器绑定到 `0.0.0.0:8123`，`curl localhost:8123` 也会失败。请改用 `docker exec cad-agent python3 -c "..."` 命令。在正常 Docker 主机上，localhost 访问正常。

## 工作流程

### 1. 创建模型

```bash
curl -X POST http://localhost:8123/model/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_part",
    "code": "from build123d import *\nresult = Box(60, 40, 30)"
  }'
```

### 2. 渲染和查看

```bash
# 获取多视图（前/右/顶/等轴）
curl -X POST http://localhost:8123/render/multiview \
  -d '{"model_name": "my_part"}' -o views.png

# 或 3D 等轴视图
curl -X POST http://localhost:8123/render/3d \
  -d '{"model_name": "my_part", "view": "isometric"}' -o iso.png
```

**查看图像。** 看起来对吗？如果不对，修改并重新渲染。

### 3. 迭代

```bash
curl -X POST http://localhost:8123/model/modify \
  -d '{
    "name": "my_part", 
    "code": "result = result - Cylinder(5, 50).locate(Pos(20, 10, 0))"
  }'

# 重新渲染以检查
curl -X POST http://localhost:8123/render/3d \
  -d '{"model_name": "my_part"}' -o updated.png
```

### 4. 导出

```bash
curl -X POST http://localhost:8123/export \
  -d '{"model_name": "my_part", "format": "stl"}' -o part.stl
```

## API 端点

| 端点 | 功能 |
|----------|--------------|
| `POST /model/create` | 运行 build123d 代码，创建模型 |
| `POST /model/modify` | 修改现有模型 |
| `GET /model/list` | 列出会话中的模型 |
| `GET /model/{name}/measure` | 获取尺寸 |
| `POST /render/3d` | 3D 阴影渲染（VTK） |
| `POST /render/2d` | 2D 工程图 |
| `POST /render/multiview` | 四视图组合 |
| `POST /export` | 导出 STL/STEP/3MF |
| `POST /analyze/printability` | 检查是否可打印 |

## build123d 速查表

```python
from build123d import *

# 基本体素
Box(宽, 深, 高)
Cylinder(半径, 高)
Sphere(半径)

# 布尔运算
a + b   # 并集
a - b   # 差集
a & b   # 交集

# 定位
part.locate(Pos(x, y, z))
part.rotate(Axis.Z, 45)

# 边处理
fillet(part.edges(), radius)
chamfer(part.edges(), length)
```

## 重要提醒

- **不要绕过容器。** 不要使用 matplotlib、外部 STL 库或网格操作。
- **渲染是您的眼睛。** 更改后一定要请求渲染。
- **可视化迭代。** 整个意义在于您可以看到正在构建的内容。

## 设计文件安全

该项目有防护措施，防止意外提交 CAD 输出：
- `.gitignore` 阻止 *.stl、*.step、*.3mf 等文件
- 预提交钩子拒绝设计文件
- 用户的设计保留在本地，不进行版本控制

## 链接

- [仓库](https://github.com/clawd-maf/cad-agent)
- [build123d 文档](https://build123d.readthedocs.io/)
- [VTK](https://vtk.org/)
