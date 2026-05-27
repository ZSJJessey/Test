# 台湾 6 天 5 晚自由行互动攻略

静态单页旅行攻略站：**AI 行程规划 MVP**（置顶）+ **经典攻略参考**（博主默认 6 日路线）。含 Google 地图 iframe、可折叠预算计算器、深浅色主题。无后端、无真实 LLM API、无 Maps JS API。

## 功能概览

| 模块 | 说明 |
|------|------|
| **AI 行程规划** | 结构化表单 → 生成 3 套方案（保守 / 经典 / 高效）→ 规则校验与风险提示 → 选版详情 → 重规划 → 导出小红书 / 清单 / 时间轴 |
| **经典攻略** | 总览、准备（Tabs）、每日时间线、路线地图、美食、避坑、总结；与 AI 方案**相互独立**，可对照使用 |
| **路线地图** | iframe 概览 + 节点外链联动 +「完整驾车路线」外链（途经点由 `main.js` 生成） |
| **预算计算器** | 总览区内可展开面板，按人数与档次估算人均 RMB / 台币 |
| **主站交互** | Hero 轮播、粘性页内导航、深浅色（`localStorage`）、展开全部 Day、复制路线骨架 |

生成层当前为 **规则化模板 + 约束适配**（`assets/scripts/planner/`），接口形态预留，可替换为真实 LLM。

## 页面信息架构

```
Hero（轮播 + 双 CTA：AI 规划 / 经典攻略）
├── 粘性导航 page-toc
│   ├── 我的行程：AI 规划 · 生成结果（生成后显示）
│   └── 经典攻略：总览 · 准备 · 时间线 · 路线 · 美食 · 避坑 · 总结
├── 选定方案条 planner-pinned（选版后显示）
├── #ai-planner          AI 表单 · 三卡结果 · 行程详情 · 弹窗（解释 / 重规划 / 导出）
└── #classic-guide       经典攻略整块（与 AI 无自动同步）
    ├── #overview        统计卡 + 预算计算器
    ├── #prep            证件 / 交通 / 支付 / 工具 Tabs
    ├── #timeline        Day1–6 折叠卡片
    ├── #route           路线节点 + 地图 iframe
    ├── #food · #tips · #summary
```

## 本地打开

1. 进入本目录 `TaiwanTravel/`
2. 用浏览器直接打开 `index.html`，或：
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
│   ├── README.md              # 文档索引
│   ├── REQUIREMENTS.md        # 第一版 PRD
│   ├── UI设计文档.md
│   ├── 第二版ai项目的需求文档.md   # 第二版 AI PRD
│   ├── 第一版.md
│   ├── 页面清单模块.md
│   └── 台湾内容.md            # 行程长文内容源
└── assets/
    ├── images/                # 配图（见下文「图片资源」）
    ├── styles/
    │   ├── main.css           # 主站：Hero、经典区、地图、预算、主题、打印
    │   └── planner.css        # AI 规划区：表单、方案卡、详情、弹窗、置顶条
    └── scripts/
        ├── main.js            # 主站交互
        ├── planner-ui.js      # AI 表单、渲染、重规划、导出弹窗
        └── planner/           # 行程引擎（可替换为 LLM API）
            ├── trip-knowledge.js   # 基础日程、规则定义、行前清单
            ├── trip-planner.js     # 生成三版 + 用户约束 + replan
            ├── trip-rules.js       # 校验与风险挂载
            └── trip-export.js      # 小红书 / 清单 / 时间轴导出
```

### 脚本加载顺序（`index.html` 底部）

须保持：`trip-knowledge` → `trip-rules` → `trip-planner` → `trip-export` → `planner-ui` → `main.js`（均 `defer`）。

| 路径 | 说明 |
|------|------|
| `index.html` | 页面结构与文案 |
| `assets/styles/main.css` | 主样式、深浅色、`data-theme`、打印 |
| `assets/styles/planner.css` | AI 规划模块样式 |
| `assets/scripts/main.js` | 主题、Tabs、时间线、路线节点、轮播、预算、地图外链、TOC |
| `assets/scripts/planner-ui.js` | AI 全流程 UI 与状态 |
| `assets/scripts/planner/*` | 知识库、生成、校验、导出 |
| `docs/第二版ai项目的需求文档.md` | 第二版 AI 产品 PRD |
| `docs/台湾内容.md` | 长文内容源（页脚声明中的「台湾内容.md」指此文件） |

## AI 行程规划（MVP）

### 用户输入（`#plannerForm`）

- **基础**：出行天数（5 / 6 / 7）、总预算（RMB/人）、体力偏好、同行类型、兴趣多选
- **高级选项**（`<details>`）：是否首访、住宿偏好、是否早起、换乘容忍、购物需求、必去景点、饮食忌口

### 输出三版方案

| versionId | 定位 |
|-----------|------|
| `conservative` | 保守省心：如九份提前下山、阿里山不排夜间高强度项、预算略降 |
| `classic` | 经典平衡：默认博主骨架适配用户约束 |
| `efficient` | 高效紧凑：同日压缩、预算略升、阿里山夜间项保留 |

每版经 `TripRules.validatePlan` 标注风险（预算、换乘、末班车、阿里山等），详情页展示逐日解释与「为什么这样排」。

### 交互要点

- 生成后显示 `#plannerResults` 三卡，页内导航出现「生成结果」
- 选定方案后：`#plannerDetail` 详情、`#plannerPinned` 顶栏摘要、支持**重新规划**（降预算 / 跳过景点 / 不早起 / 轻松节奏）
- 导出：`TripExport` → 小红书文案、行前清单、时间轴（复制到剪贴板）

替换为真实 LLM 时，建议只改 `trip-planner.js` 的生成入口，保留 `trip-rules.js` 校验与 `trip-export.js` 导出格式。

## 经典攻略区

- 容器：`#classic-guide`，文案标明与 AI 方案**相互独立**
- 路线骨架（`main.js` → `ROUTE_TEXT`）：台北 → 淡水 → 九份 → 日月潭 → 阿里山 → 桃园
- Hero 轮播自动切换间隔：**2000ms**（`AUTO_MS`）
- 主题键名：`localStorage` → `tw6d5n-theme`（`light` / `dark`）

## 地图嵌入

| 元素 | 用途 |
|------|------|
| `#routeMapEmbed` | Google iframe 行程概览；**不随**上方节点切换；须用「嵌入地图」复制的 `src`，勿手工拼 `pb` |
| `#routeMapFullRoute` | 桃园机场往返 + 多途经驾车路线；途经点见 `main.js` → `FULL_ROUTE_WAYPOINTS` |
| `#routeMapOpenCurrent` | 当前节点 Google Maps 搜索外链；关键词见 `ROUTE_MAP_PLACES` |

**九份节点说明**：行程正文为九份老街，地图节点标签为「九份」，但 pin 关键词为 **台北车站**（住宿/转乘枢纽）。去九份请用完整路线外链或 Day3 卡片地图按钮。修改时同步 `index.html` 路线区说明与 `assets/scripts/main.js`。

## 预算计算器

- UI：`#overview` → `#budgetCalc`（`#budgetCalcToggle` 展开 `#budgetCalcPanel`）
- 表单：`#budgetCalcForm`；结果：`#budgetPerPerson`、`#budgetGroupLine`、`#budgetTwdLine`
- 逻辑：`assets/scripts/main.js` → `readBudgetForm` / `computeBudget`

## 图片资源

### 页面已引用

| 用途 | 文件 |
|------|------|
| Hero 轮播 | `台湾属于中国.jpg`、`101白天.png`、`台湾日月潭2.jpg`、`阿里山1.jpg`、`阿里山2.jpg` |
| preload | `台湾属于中国.jpg` |
| Day 缩略图 | `台北车站.JPG`、`渔人码头.jpg`、`九份老街1.jpg`、`日月潭1.jpg`、`阿里山4.jpg`、`阿里山3.jpg` |

### 备用（目录内有，未在 `index.html` 引用）

- `象山.jpg`、`台北101夜景.jpg`、`九份老街.jpeg`、`西门町.jpg`

换图：放入 `assets/images/`，更新 `index.html` 中 `src` 与 `<link rel="preload">`（如有）。

## GitHub Pages

1. 推送仓库到 GitHub
2. **Settings → Pages** → Deploy from branch → 选 `main`，文件夹 **`/TaiwanTravel`**（若整仓仅本目录可改为 `/`）
3. 访问 `https://<用户名>.github.io/<仓库名>/`（子目录部署需带路径前缀）

资源均为相对路径，子目录部署无需改引用。

## 内容维护

| 改什么 | 改哪里 |
|--------|--------|
| 行程长文 | `docs/台湾内容.md` → 按需同步 `index.html` |
| 页面结构 / 文案 | `index.html` |
| 主站交互、地图、预算、轮播 | `assets/scripts/main.js` |
| AI 知识库与规则 | `assets/scripts/planner/trip-knowledge.js`、`trip-rules.js` |
| AI 生成与重规划 | `assets/scripts/planner/trip-planner.js` |
| AI 导出模板 | `assets/scripts/planner/trip-export.js` |
| AI 界面与绑定 | `assets/scripts/planner-ui.js` |
| 样式 | `assets/styles/main.css`、`planner.css` |

## 版本说明

| 阶段 | 内容 |
|------|------|
| **目录规范（当前）** | `docs/`、`assets/{images,styles,scripts/planner}`；入口 `index.html` 在根目录 |
| **第二版 MVP** | AI 置顶 + 经典攻略分区 + 三版方案 + 规则校验 + 重规划 + 三种导出 + 置顶方案条（见 `docs/第二版ai项目的需求文档.md`） |
| **第一版** | 经典攻略单页 + 地图 iframe + 预算计算器（见 `docs/第一版.md`） |

## 本期不做

见 `docs/REQUIREMENTS.md` 与 `docs/第二版ai项目的需求文档.md`：真实 LLM 联调、地图 JS API、登录/评论后台、多城市模板等。
