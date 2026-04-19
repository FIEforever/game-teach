# 趣学园 - 知识点游戏化教学平台

让每个知识点都变成好玩的游戏！

## 功能特色

- **32 个知识点全覆盖** — 人教版四年级下册数学，每个知识点至少 1 个精美小游戏
- **班级学生管理** — 支持多年级多班级，403 班 45 名真实学生
- **游戏化学习** — 6-8 种不同玩法（消除、翻牌、射击、拼图、赛车等）
- **学习数据分析** — 学生仪表板、班级分析、知识点掌握情况统计
- **历史记录** — 每次游戏自动记录成绩，可查看完整学习轨迹

## 技术栈

- **后端**: Node.js + Express + SQLite (better-sqlite3)
- **前端**: 原生 HTML/CSS/JS（无框架依赖）
- **游戏**: 纯 HTML5 单文件游戏（无外部依赖）

## 快速开始

```bash
# 安装依赖
cd server && npm install

# 初始化数据库（含种子数据）
node init-db.js

# 启动服务
node app.js

# 访问 http://localhost:3000
```

## 页面流程

选班级 → 选学生 → 知识点列表 → 选择游戏 → 游戏记录

## 项目结构

```
game-teach/
├── server/
│   ├── app.js              # Express 主服务
│   ├── init-db.js          # 数据库初始化 + 种子数据
│   ├── models/database.js  # SQLite 数据库
│   ├── routes/             # API 路由
│   │   ├── knowledge.js    # 知识点 API
│   │   ├── games.js        # 游戏 API
│   │   └── school.js       # 学校/班级/学生/统计 API
│   └── uploads/games/      # 32 个 HTML5 小游戏
└── web/
    ├── index.html          # 主页面
    └── static/
        ├── css/style.css   # 样式
        └── js/
            ├── api.js      # API 调用
            └── app.js      # 页面逻辑
```
