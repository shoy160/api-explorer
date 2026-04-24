# API Explorer

一个现代化的 OpenAPI 文档管理和测试工具，提供直观的 API 浏览、调试和代码生成功能。

## ✨ 功能特性

- **OpenAPI 文档解析**：支持 OpenAPI 3.0+ 规范，自动解析 API 文档
- **API 测试调试**：在线发送请求，实时查看响应结果
- **代码生成**：自动生成多种语言的 API 调用代码
- **收藏管理**：收藏常用 API，快速访问
- **请求历史**：记录请求历史，支持快速重放
- **主题切换**：支持深色/浅色主题
- **配置灵活**：支持通过环境变量配置标题、OpenAPI 文档地址等

## 🛠️ 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **UI 组件**: Ant Design 5
- **状态管理**: Zustand
- **代码高亮**: Prism.js + react-syntax-highlighter
- **HTTP 客户端**: Axios
- **样式**: Tailwind CSS 3

## 📦 安装

```bash
# 安装依赖
pnpm install
```

## 🔧 开发

```bash
# 启动开发服务器
pnpm dev
```

## 🏗️ 构建

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## ⚙️ 环境配置

项目支持通过 `.env` 文件配置：

```bash
# 部署路径（重要！如果部署在子目录下需要配置）
# 例如部署在 https://example.com/api-explorer/ 下，设置为 /api-explorer/
VITE_BASE_PATH=/

# OpenAPI 文档配置（支持多个）
VITE_OPENAPI_CONFIG='[{"name": "认证端 API", "path": "/v3/api-docs/auth-api"}, {"name": "管理端 API", "path": "/v3/api-docs/manage-api"}]'

# 应用标题
VITE_APP_TITLE=API Explorer

# 应用描述/副标题
VITE_APP_DESCRIPTION=API 文档中心

# API 基础地址（开发环境代理使用）
VITE_API_BASE_URL=http://localhost:8010
```

### 部署路径配置

如果您的项目部署不在网站根目录，而是在子目录下（例如 `https://example.com/api-explorer/`），需要配置 `VITE_BASE_PATH`：

```bash
# 部署在 https://example.com/api-explorer/ 下
VITE_BASE_PATH=/api-explorer/
```

配置后重新构建即可：
```bash
pnpm build
```

## 📁 项目结构

```
src/
├── components/          # React 组件
│   ├── ApiDetail/       # API 详情页面
│   ├── Header/          # 顶部导航
│   ├── Layout/          # 布局组件
│   ├── SettingsPanel/   # 设置面板
│   ├── Sidebar/         # 侧边栏菜单
│   └── common/          # 通用组件
├── config/              # 配置管理
├── data/                # 模拟数据
├── services/            # 服务层
│   ├── apiParser.ts     # OpenAPI 解析服务
│   ├── codeGenerator.ts # 代码生成服务
│   └── httpClient.ts    # HTTP 请求封装
├── store/               # Zustand 状态管理
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── App.tsx              # 主应用组件
├── main.tsx             # 入口文件
└── index.css            # 全局样式
```

## 🚀 快速开始

1. 安装依赖：`pnpm install`
2. 配置环境变量（可选）
3. 启动开发服务器：`pnpm dev`
4. 访问 `http://localhost:5173` 查看应用

## 📄 License

MIT
