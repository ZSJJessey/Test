/**
 * 台湾 6D5N 行程知识底座（规则引擎 / 解释模块共用）
 */
(function (global) {
  "use strict";

  var BASE_DAYS = [
    {
      day: 1,
      city: "台北",
      morning: "桃园机场入境：电话卡、悠游卡、换汇，捷运进城入住台北车站/西门町一带",
      afternoon: "西门町逛吃：天天利卤肉饭等，保留弹性避免排队耗光体力",
      evening: "夜爬象山看 101 夜景；夜宵品都串烧 + 生啤",
      spots: ["桃园机场", "西门町", "象山", "品都串烧"],
      transport: "机场捷运 + 台北市捷运",
      duration: "全天约 8–10 小时有效游玩",
      budgetEstimate: 650,
      bookAhead: false,
      lodgingArea: "台北车站 / 西门町",
      reason: "第一天以安顿+经典夜景为主，动线集中在北市",
      whyArrangement:
        "先台北是因为落地枢纽在桃园/台北，捷运进城成本最低；象山放晚上避开烈日，也符合多数航班下午抵达的节奏。",
      alternatives: "若抵达晚，可砍掉象山，只留西门町轻食",
    },
    {
      day: 2,
      city: "淡水",
      morning: "淡水渔人码头：看海拍照，注意防晒",
      afternoon: "淡水老街小吃少量多样；留意接驳公车时刻",
      evening: "可回台北品都串烧或老街附近轻食",
      spots: ["渔人码头", "淡水老街"],
      transport: "捷运淡水线 + 有轨电车/公车",
      duration: "约 7–8 小时",
      budgetEstimate: 480,
      bookAhead: false,
      lodgingArea: "台北（近捷运，如星空旅舍一带）",
      reason: "淡水一日往返，不搬行李，省体力",
      whyArrangement:
        "淡水与台北同城圈，适合作为第二天轻量出游；渔人码头与老街相距需查接驳，避免硬走。",
      alternatives: "雨天可缩短海边停留，主攻老街室内小吃",
    },
    {
      day: 3,
      city: "台北 / 九份",
      morning: "国立故宫博物院，建议租语音导览",
      afternoon: "九份老街伴手礼与小吃，背包轻装",
      evening: "尽早下山，盯末班车；旅舍附近保底用餐",
      spots: ["国立故宫博物院", "九份老街"],
      transport: "捷运 + 公车（故宫、九份各一段）",
      duration: "约 9 小时，含山路车程",
      budgetEstimate: 520,
      bookAhead: true,
      lodgingArea: "台北车站附近（续住不搬箱）",
      reason: "故宫+九份是经典组合，但山路+台阶多",
      whyArrangement:
        "上午故宫冷气足、体力和缓；九份放下午至傍晚可兼顾夜景，但必须预留下山时间。",
      alternatives: "体力不足可只选故宫或只选九份",
    },
    {
      day: 4,
      city: "南投 · 日月潭",
      morning: "捷运至台北站 → 高铁台中 → 转公车至日月潭，买好船票",
      afternoon: "游船、环湖单车/公车、缆车等，先玩受天气影响项目",
      evening: "湖悦景观旅店附近用餐，早休息",
      spots: ["日月潭", "水社码头", "阿婆茶叶蛋"],
      transport: "高铁 + 公车 + 游船",
      duration: "跨城日，约 10 小时含交通",
      budgetEstimate: 880,
      bookAhead: true,
      lodgingArea: "日月潭水社码头 / 湖悦景观旅店",
      reason: "进入中部湖区的核心移动日",
      whyArrangement:
        "台北→日月潭是典型「北中南」动线中继；高铁段稳定，但日月潭接驳需现场问清班次。",
      alternatives: "若不想赶，可前一晚住台中再进潭",
    },
    {
      day: 5,
      city: "嘉义 · 阿里山",
      morning: "日月潭→阿里山公车（需提前订票）；阿里山小火车、森林步道",
      afternoon: "继续阿里山景点，留意温差",
      evening: "萤火虫/星空（红光手电），早睡备日出",
      spots: ["阿里山", "阿里山森林铁路"],
      transport: "预约公车 + 景区接驳",
      duration: "全天山区约 9 小时",
      budgetEstimate: 750,
      bookAhead: true,
      lodgingArea: "阿里山站内或邻近民宿",
      reason: "山区海拔高，需预留缓冲与保暖",
      whyArrangement:
        "日月潭→阿里山热门公车常满座，必须提前订；前一晚住近接驳点减少清晨折腾。",
      alternatives: "不追日出可睡饱，上午再上山",
    },
    {
      day: 6,
      city: "桃园",
      morning: "阿里山日出（可选）→ 下山 → 高铁/公车往桃园",
      afternoon: "桃园 Outlet / 免税店补货",
      evening: "前往桃园机场返程",
      spots: ["阿里山日出", "桃园机场", "Outlet"],
      transport: "高铁 + 机场捷运",
      duration: "约 8–10 小时",
      budgetEstimate: 700,
      bookAhead: false,
      lodgingArea: "无（返程日）",
      reason: "收尾+购物+机场闭环",
      whyArrangement:
        "最后一天预留购物与机场缓冲，避免卡点误机；液体伴手礼留意登机规范。",
      alternatives: "购物欲低可缩短 Outlet，提前 3 小时到机场",
    },
  ];

  var RULE_DEFINITIONS = [
    {
      id: "jiufen_last_bus",
      level: "high",
      tag: "末班车风险",
      test: function (ctx) {
        return ctx.hasJiufen && !ctx.earlyReturnJiufen;
      },
      message: "九份晚间下山存在末班车误点风险",
      suggestion: "建议 19:00 前开始下山，并用 Google Maps 核对当日末班",
    },
    {
      id: "alishan_bus",
      level: "high",
      tag: "需提前订票",
      test: function (ctx) {
        return ctx.hasAlishan;
      },
      message: "日月潭→阿里山热门公车建议提前网上购票",
      suggestion: "保存电子票二维码；旺季可备第二时段方案",
    },
    {
      id: "budget_over",
      level: "high",
      tag: "预算超出",
      test: function (ctx) {
        return ctx.totalBudget > ctx.userBudgetCap;
      },
      message: "预估花费可能超出你的预算上限",
      suggestion: "考虑保守版、减少购物日支出或调高住宿档次预期",
    },
    {
      id: "many_transfers",
      level: "medium",
      tag: "换乘偏多",
      test: function (ctx) {
        return ctx.transferScore >= 4 && !ctx.acceptTransfer;
      },
      message: "跨城换乘次数偏多，当日疲劳度上升",
      suggestion: "选择保守版或减少 Day4/Day5 串联强度",
    },
    {
      id: "tight_cross_city",
      level: "medium",
      tag: "衔接偏紧",
      test: function (ctx) {
        return ctx.pace === "intense" && ctx.hasCrossCity;
      },
      message: "高效版含多段跨城，缓冲时间偏紧",
      suggestion: "每段交通预留 30–45 分钟弹性",
    },
    {
      id: "cash_prep",
      level: "low",
      tag: "现金准备",
      test: function () {
        return true;
      },
      message: "夜市、部分公车与小店仍偏现金",
      suggestion: "落地换汇约 7000 台币 + 悠游卡充值",
    },
    {
      id: "jiufen_luggage",
      level: "medium",
      tag: "行李提示",
      test: function (ctx) {
        return ctx.hasJiufen;
      },
      message: "九份台阶多，不适合拖大行李箱",
      suggestion: "当日背包轻装，大件寄放饭店",
    },
    {
      id: "alishan_cold",
      level: "low",
      tag: "装备建议",
      test: function (ctx) {
        return ctx.hasAlishan && ctx.earlyBird;
      },
      message: "阿里山清晨偏冷，观日出需保暖",
      suggestion: "薄羽绒/抓绒 + 防滑鞋",
    },
    {
      id: "preference_conflict",
      level: "medium",
      tag: "偏好冲突",
      test: function (ctx) {
        return ctx.stamina === "easy" && ctx.pace === "intense";
      },
      message: "体力偏好「轻松」与高效版节奏不一致",
      suggestion: "改选保守版或经典版",
    },
  ];

  var VERSION_META = {
    conservative: {
      id: "conservative",
      name: "保守版",
      tagline: "少换乘、低风险、节奏更稳",
      audience: "第一次去台湾、不想赶路的用户",
      whyVersion: "优先减少跨城衔接与夜间风险，牺牲部分打卡密度换可执行性。",
    },
    classic: {
      id: "classic",
      name: "经典版",
      tagline: "经典景点覆盖优先",
      audience: "希望与主流攻略节奏一致的用户",
      whyVersion: "沿用台北→淡水→故宫九份→日月潭→阿里山→桃园的主流动线。",
    },
    efficient: {
      id: "efficient",
      name: "高效版",
      tagline: "更高覆盖，适合体力较好",
      audience: "时间紧、想多看的用户",
      whyVersion: "压缩缓冲、合并相近时段，但依赖交通准点。",
    },
  };

  var PREP_CHECKLIST = [
    "电话卡（约 100+ RMB，以柜台为准）",
    "悠游卡充值（6 天可参考 7000 台币）",
    "现金约 7000 台币（夜市/部分购票）",
    "入境单与护照有效期检查",
    "高铁/跨城票与日月潭→阿里山公车（提前订）",
    "末班捷运/公车时刻存入备忘录",
    "阿里山保暖衣物与防滑鞋",
    "防晒、雨具、充电宝",
  ];

  global.TripKnowledge = {
    BASE_DAYS: BASE_DAYS,
    RULE_DEFINITIONS: RULE_DEFINITIONS,
    VERSION_META: VERSION_META,
    PREP_CHECKLIST: PREP_CHECKLIST,
    INTEREST_LABELS: {
      city: "城市逛吃",
      nature: "自然风景",
      photo: "拍照打卡",
      night: "夜市",
      food: "美食",
      museum: "博物馆",
      shop: "购物",
    },
  };
})(typeof window !== "undefined" ? window : global);
