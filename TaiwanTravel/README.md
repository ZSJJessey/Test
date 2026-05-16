# 台湾 6 天 5 晚自由行互动攻略

静态单页旅行攻略站：经典攻略展示 + **AI 行程规划 MVP**（结构化输入、三版方案、规则校验、导出）；含 Google 地图 iframe、预算计算器。无后端、无地图 JS API。

## 本地打开

1. 进入本目录 `TaiwanTravel/`
2. 用浏览器打开 `index.html`，或：
   ```bash
   npx --yes serve .
   ```
3. 访问终端提示地址（常见 `http://localhost:3000`）

## 目录结构

```
TaiwanTravel/
├── index.html                 # 站点入口（GitHub Pages 部署点）
├── README.md
├── docs/                      # 产品与内容文档（不参与运行时）
│   ├── REQUIREMENTS.md
│   ├── UI设计文档.md
│   ├── 第二版ai项目的需求文档.md
│   ├── 第一版.md
│   ├── 页面清单模块.md
│   └── 台湾内容.md
└── assets/
    ├── images/                # 页面配图
    ├── styles/
    │   ├── main.css           # 主站样式（原 style.css）
    │   └── planner.css        # AI 规划区样式
    └── scripts/
        ├── main.js            # 主站交互（原 script.js）
        ├── planner-ui.js      # AI 规划 UI
        └── planner/           # 行程引擎（知识库 / 规划 / 规则 / 导出）
            ├── trip-knowledge.js
            ├── trip-planner.js
            ├── trip-rules.js
            └── trip-export.js
```

| 路径 | 说明 |
|------|------|
| `index.html` | 页面入口 |
| `assets/styles/main.css` | 主样式、深浅色、打印 |
| `assets/styles/planner.css` | AI 规划模块样式 |
| `assets/scripts/main.js` | Tabs、时间线、路线、轮播、预算、地图外链 |
| `assets/scripts/planner-ui.js` | AI 表单、结果渲染、重规划、导出弹窗 |
| `assets/scripts/planner/*` | 行程生成与规则校验（可替换为 LLM API） |
| `assets/images/` | 配图资源 |
| `docs/台湾内容.md` | 长文内容源 |
| `docs/第二版ai项目的需求文档.md` | 第二版 AI 产品 PRD |

## GitHub Pages

1. 推送仓库到 GitHub
2. **Settings → Pages** → Deploy from branch → 选 `main`，文件夹 **`/TaiwanTravel`**（或根目录部署则选 `/`）
3. 访问 `https://<用户名>.github.io/<仓库名>/`（子目录需带路径）

资源均为相对路径，子目录部署无需改引用。

## 内容维护

| 改什么 | 改哪里 |
|--------|--------|
| 行程长文 | `docs/台湾内容.md` → 同步 `index.html` |
| 页面结构 / 文案 | `index.html` |
| 主站交互 | `assets/scripts/main.js` |
| AI 规划逻辑 | `assets/scripts/planner/*.js` |
| 换图 | `assets/images/`，并改 `index.html` 中 `src` / `<link rel="preload">` |

## 地图嵌入

- iframe 概览：`#routeMapEmbed`（勿手工拼 `pb` 参数，须用 Google「嵌入地图」复制的 `src`）
- 完整路线：`#routeMapFullRoute`，途经点由 `main.js` 的 `FULL_ROUTE_WAYPOINTS` 生成
- 节点关键词：`main.js` 内 `ROUTE_MAP_PLACES`

详见上文「站点与地图定位对照」历史说明；修改时同步 `index.html` 与 `assets/scripts/main.js`。

## 预算计算器

- UI：`index.html` → `#budgetCalcForm`
- 逻辑：`assets/scripts/main.js` → `readBudgetForm` / `computeBudget`

## 备用图片（未引用）

- `assets/images/象山.jpg`
- `assets/images/台北101夜景.jpg`
- `assets/images/九份老街.jpeg`
- `assets/images/西门町.jpg`

## 版本说明

- **目录规范（当前）**：`docs/`、`assets/{images,styles,scripts}` 分层；入口 `index.html` 保留根目录
- **第二版 MVP**：AI 行程规划（见 `docs/第二版ai项目的需求文档.md`）
- **第一版**：经典攻略单页 + 地图 iframe + 预算计算器（见 `docs/第一版.md`）

## 本期不做

见 `docs/REQUIREMENTS.md` §17：地图 JS API、登录后台、多城市模板等。
