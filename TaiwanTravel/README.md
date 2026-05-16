# 台湾 6 天 5 晚自由行互动攻略

静态单页旅行攻略站：路线总览、出发前准备、每日时间线、美食与避坑建议；总览区含简易预算计算器；路线区含 **Google 地图 iframe 嵌入**（方案 1）。不含后端、地图 JavaScript API 或登录。

## 本地打开

1. 进入本目录 `TaiwanTravel/`
2. 用浏览器直接打开 `index.html`，或本地起一个静态服务，例如：
   ```bash
   npx --yes serve .
   ```
3. 访问终端提示的地址（常见为 `http://localhost:3000`）

## 目录结构

| 路径 | 说明 |
|------|------|
| `index.html` | 页面入口 |
| `style.css` | 样式（含深浅色、打印样式） |
| `script.js` | 交互：Tabs、时间线、路线联动、轮播、复制路线、预算计算器、地图外链联动 |
| `assets/image/` | 页面配图 |
| `台湾内容.md` | 长文内容源，维护行程文案时优先改此文件再同步页面 |
| `REQUIREMENTS.md` | 产品需求文档 |
| `页面清单模块.md` | 模块清单（与 `index.html` Hero 文案对齐） |
| `第一版.md` | 第一版改动与验收清单 |

## GitHub Pages 部署

1. 将仓库推送到 GitHub
2. **Settings → Pages → Build and deployment**
3. Source 选 **Deploy from a branch**
4. Branch 选 `main`（或你的默认分支），文件夹选 **`/TaiwanTravel`**（若站点在子目录）或把 `index.html` 放在仓库根目录则选 `/ (root)`
5. 保存后等待数分钟，访问 `https://<用户名>.github.io/<仓库名>/`（子目录部署需带上路径）

相对路径已用于 CSS/JS/图片，子目录部署无需改资源引用。

## 内容维护

- 行程长文、细节：`台湾内容.md`
- 页面结构与交互：`index.html` + `script.js`
- 换图：替换 `assets/image/` 下文件并保持 `index.html` 中 `src` 文件名一致；Hero 首图需同步 `<link rel="preload">` 路径

## 地图嵌入（方案 1：Google iframe）

当前 `#route` 区域使用 Google 地图 **嵌入 iframe**（多城市关键词概览），并配有「在 Google Maps 中打开完整路线」外链。

### 站点与地图定位对照

| 路线节点（页面按钮） | Google Maps 定位关键词 | 说明 |
|--------------------|------------------------|------|
| 台北 | 台北车站 | Day1 枢纽 |
| 淡水 | 淡水渔人码头 | Day2 |
| 九份 | **台北车站** | 行程去九份；地图 pin 已校正为台北车站（住宿/转乘枢纽），勿再用九份老街坐标 |
| 日月潭 | 日月潭 | Day4 |
| 阿里山 | 阿里山国家森林步道 | Day5 |
| 桃园 | 桃园国际机场 | Day6 |

修改地图定位时，请同时改三处：`index.html` 中 iframe `src`、完整路线 `href`、`script.js` 的 `ROUTE_MAP_PLACES`。

默认嵌入地图：`q=台湾`、`ll=23.6978,120.9605`、`z=8`、`hl=zh-CN`（首屏居中台湾本岛、简体中文界面）。勿在 iframe 里堆多个 `q` 城市名，否则易缩放到全球视图。

### 换成「我的地图」自定义路线（推荐）

1. 打开 [Google 我的地图](https://www.google.com/maps/d/)
2. 新建地图，按上表添加标记（**第 3 站请落在台北车站**，不要误标九份老街）
3. 点击 **分享** → **嵌入地图**，复制 `<iframe src="...">` 里的 `src` 地址
4. 在 `index.html` 中找到 `#routeMapEmbed`，将 `src="..."` 替换为复制的 URL

### 外链说明

- **完整路线**：`#routeMapFullRoute` 使用 Google Maps 驾车多途经点（桃园机场环线；途经点含台北车站×2，不含九份老街）
- **当前站点**：点击路线节点时，`#routeMapOpenCurrent` 同步为 `ROUTE_MAP_PLACES` 中对应关键词

iframe 内地图无法被页面 JS 控制；节点条仍负责切换 Day 时间线。

## 预算计算器

位置：总览区「预算感参考」卡片右下角 **算算预算**。

- 逻辑在 `script.js`（`readBudgetForm` / `computeBudget`），表单项在 `index.html` 的 `#budgetCalcForm`
- 默认参考：5 晚住宿档次、6 天餐饮、悠游卡/现金（台币按汇率折算）、跨城交通等；**不含往返机票**
- 改默认金额：改 `index.html` 里各 `input` 的 `value`，或调整 `script.js` 中 `TRIP_DAYS` / `TRIP_NIGHTS`

## 备用图片（页面未引用）

以下文件保留作替换备用，当前未在 `index.html` 中使用：

- `assets/image/象山.jpg`
- `assets/image/台北101夜景.jpg`
- `assets/image/九份老街.jpeg`
- `assets/image/西门町.jpg`

## 版本说明

### 第一版（2026-05-16）

- 修复 Hero 预加载路径与首图 LCP（`loading="eager"` + `fetchpriority="high"`）
- 统一 Hero 轮播 `alt` 与画面描述
- 新增 README、页内迷你目录、总览预算感、**简易预算计算器**、交通订票检索提示、季节装备
- 打印样式：隐藏轮播控件，展开时间线与美食详情
- PRD/页面清单 Hero 文案与 `index.html` 对齐；延期项在 `REQUIREMENTS.md` 标注

### 地图与计算器迭代

- **路线区**：Google 地图 iframe 嵌入 + 完整路线/当前站点外链
- **总览区**：纯前端预算计算器（右下角展开）
- **地图校正**：路线节点「九份」对应的 Google 定位由九份老街改为 **台北车站**（与 Day1 枢纽一致；Day3 正文仍为九份行程）

## 本期不做（见 PRD）

地图 JavaScript API（可编程标记/画线）、用户登录/评论后端、多城市模板等见 `REQUIREMENTS.md` §17。
