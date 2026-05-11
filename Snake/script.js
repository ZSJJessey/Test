const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const rankListEl = document.getElementById("rankList");
const modeSelectEl = document.getElementById("modeSelect");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const wrapWallEl = document.getElementById("wrapWall");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayBtn = document.getElementById("overlayBtn");

const CONFIG = {
  gridCount: 20,
  swipeMinPx: 32,
  highScoreKey: "snake-high-score",
  rankKey: "snake-rank-top10",
  modes: {
    classic: { baseTickMs: 170, minTickMs: 95, speedTierEvery: 6, speedDropMs: 6, obstacleCount: 0, wrapWall: false },
    wrap: { baseTickMs: 170, minTickMs: 95, speedTierEvery: 6, speedDropMs: 6, obstacleCount: 0, wrapWall: true },
    obstacle: { baseTickMs: 171, minTickMs: 95, speedTierEvery: 6, speedDropMs: 6, obstacleCount: 6, wrapWall: false },
    hard: { baseTickMs: 140, minTickMs: 80, speedTierEvery: 5, speedDropMs: 8, obstacleCount: 10, wrapWall: false }
  }
};

const tileSize = canvas.width / CONFIG.gridCount;

let snake;
let direction;
let queuedDirection;
let food;
let score;
let obstacles;
let timerId;
let touchStart;
let audioCtx;
let gameState = "idle";
let highScore = 0;
let rankEntries = [];
let modeConfig = CONFIG.modes.classic;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function positionsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function setState(nextState) {
  gameState = nextState;
}

function isRunning() {
  return gameState === "running";
}

function loadHighScore() {
  const raw = localStorage.getItem(CONFIG.highScoreKey);
  const n = raw == null ? 0 : parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function persistHighScore() {
  localStorage.setItem(CONFIG.highScoreKey, String(highScore));
}

function loadRankEntries() {
  const raw = localStorage.getItem(CONFIG.rankKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Number.isFinite(item.score)).slice(0, 10);
  } catch {
    return [];
  }
}

function persistRankEntries() {
  localStorage.setItem(CONFIG.rankKey, JSON.stringify(rankEntries));
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function updateRankList() {
  rankListEl.innerHTML = "";
  if (rankEntries.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty";
    emptyItem.textContent = "暂无记录，开始你的第一局吧。";
    rankListEl.appendChild(emptyItem);
    return;
  }

  rankEntries.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = `${entry.score} 分（${entry.mode}，${entry.date}）`;
    rankListEl.appendChild(item);
  });
}

function pushRank(scoreValue) {
  const modeNameMap = {
    classic: "经典",
    wrap: "穿墙",
    obstacle: "障碍",
    hard: "地狱"
  };
  const next = {
    score: scoreValue,
    mode: modeNameMap[modeSelectEl.value] || "经典",
    date: formatDate(new Date())
  };
  rankEntries = [...rankEntries, next].sort((a, b) => b.score - a.score).slice(0, 10);
  persistRankEntries();
  updateRankList();
}

function currentTickMs() {
  const tier = Math.floor(score / modeConfig.speedTierEvery);
  return Math.max(modeConfig.minTickMs, modeConfig.baseTickMs - tier * modeConfig.speedDropMs);
}

function clearGameTimer() {
  if (timerId != null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function rescheduleTimer() {
  clearGameTimer();
  timerId = setInterval(step, currentTickMs());
}

function syncModeConfig() {
  const selectedMode = CONFIG.modes[modeSelectEl.value] || CONFIG.modes.classic;
  modeConfig = selectedMode;
  wrapWallEl.checked = Boolean(selectedMode.wrapWall);
  wrapWallEl.disabled = Boolean(selectedMode.wrapWall);
}

function initAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  audioCtx = new AC();
}

async function resumeAudio() {
  initAudio();
  if (audioCtx && audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
}

function playTone(freq, durationSec, volume = 0.06) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + durationSec);
}

function playEat() {
  playTone(660, 0.06, 0.05);
}

function playGameOver() {
  playTone(180, 0.18, 0.07);
}

function playWin() {
  playTone(840, 0.08, 0.07);
  playTone(980, 0.08, 0.07);
}

function isOnSnake(p) {
  return snake.some((part) => positionsEqual(part, p));
}

function isOnObstacle(p) {
  return obstacles.some((o) => positionsEqual(o, p));
}

function isBlockedCell(p) {
  return isOnSnake(p) || isOnObstacle(p);
}

function boardCapacity() {
  return CONFIG.gridCount * CONFIG.gridCount - obstacles.length;
}

function hasFreeCell() {
  return snake.length < boardCapacity();
}

function generateObstacles() {
  const list = [];
  const taken = new Set(snake.map((s) => `${s.x},${s.y}`));
  let guard = 0;
  while (list.length < modeConfig.obstacleCount && guard < 800) {
    guard += 1;
    const c = { x: randomInt(CONFIG.gridCount), y: randomInt(CONFIG.gridCount) };
    const key = `${c.x},${c.y}`;
    if (taken.has(key)) continue;
    taken.add(key);
    list.push(c);
  }
  return list;
}

function spawnFood() {
  let nextFood = { x: randomInt(CONFIG.gridCount), y: randomInt(CONFIG.gridCount) };
  let guard = 0;
  while (isBlockedCell(nextFood) && guard < 500) {
    guard += 1;
    nextFood = { x: randomInt(CONFIG.gridCount), y: randomInt(CONFIG.gridCount) };
  }
  if (!isBlockedCell(nextFood)) return nextFood;
  for (let y = 0; y < CONFIG.gridCount; y += 1) {
    for (let x = 0; x < CONFIG.gridCount; x += 1) {
      const p = { x, y };
      if (!isBlockedCell(p)) return p;
    }
  }
  return null;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function showOverlay({ title, message, buttonText }) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayBtn.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function showStartOverlay() {
  showOverlay({
    title: "贪吃蛇",
    message:
      "方向键或 WASD 控制，空格暂停。\n手机在画布上滑动即可转向。\n可选模式并支持本地排行榜。",
    buttonText: "开始游戏"
  });
}

function showFinishOverlay(title, message) {
  showOverlay({
    title,
    message,
    buttonText: "再来一局"
  });
}

function resetGame() {
  syncModeConfig();
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  obstacles = generateObstacles();
  food = spawnFood();
  score = 0;
  scoreEl.textContent = score;
  setStatus("");
}

function drawRoundedRect(px, py, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(px, py, w, h, rad);
  } else {
    ctx.moveTo(px + rad, py);
    ctx.lineTo(px + w - rad, py);
    ctx.quadraticCurveTo(px + w, py, px + w, py + rad);
    ctx.lineTo(px + w, py + h - rad);
    ctx.quadraticCurveTo(px + w, py + h, px + w - rad, py + h);
    ctx.lineTo(px + rad, py + h);
    ctx.quadraticCurveTo(px, py + h, px, py + h - rad);
    ctx.lineTo(px, py + rad);
    ctx.quadraticCurveTo(px, py, px + rad, py);
    ctx.closePath();
  }
  ctx.fill();
}

function drawCell(x, y, color, radius = 3) {
  const padding = 2;
  const px = x * tileSize + padding;
  const py = y * tileSize + padding;
  const w = tileSize - padding * 2;
  const h = tileSize - padding * 2;
  ctx.fillStyle = color;
  drawRoundedRect(px, py, w, h, radius);
}

function drawSnakeHead(head, dir) {
  drawCell(head.x, head.y, "#16a34a", 5);
  const cx = head.x * tileSize + tileSize / 2;
  const cy = head.y * tileSize + tileSize / 2;
  const eye = 2.2;
  const off = 4;
  ctx.fillStyle = "#052e16";
  if (dir.x === 1) {
    ctx.beginPath();
    ctx.arc(cx + off, cy - 3, eye, 0, Math.PI * 2);
    ctx.arc(cx + off, cy + 3, eye, 0, Math.PI * 2);
    ctx.fill();
  } else if (dir.x === -1) {
    ctx.beginPath();
    ctx.arc(cx - off, cy - 3, eye, 0, Math.PI * 2);
    ctx.arc(cx - off, cy + 3, eye, 0, Math.PI * 2);
    ctx.fill();
  } else if (dir.y === -1) {
    ctx.beginPath();
    ctx.arc(cx - 3, cy - off, eye, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy - off, eye, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 3, cy + off, eye, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy + off, eye, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < CONFIG.gridCount; row += 1) {
    for (let col = 0; col < CONFIG.gridCount; col += 1) {
      const shade = (row + col) % 2 === 0 ? "#1f2937" : "#243244";
      drawCell(col, row, shade, 2);
    }
  }

  obstacles.forEach((o) => {
    drawCell(o.x, o.y, "#78350f", 4);
  });

  snake.forEach((part, index) => {
    if (index === 0) {
      drawSnakeHead(part, direction);
    } else {
      drawCell(part.x, part.y, "#86efac", 4);
    }
  });

  if (food) {
    drawCell(food.x, food.y, "#ef4444", 5);
  }
}

function applyWrap(p) {
  let { x, y } = p;
  if (x < 0) x = CONFIG.gridCount - 1;
  if (x >= CONFIG.gridCount) x = 0;
  if (y < 0) y = CONFIG.gridCount - 1;
  if (y >= CONFIG.gridCount) y = 0;
  return { x, y };
}

function endGame(title, statusText, needRank = true) {
  setState("over");
  clearGameTimer();
  if (needRank && score > 0) {
    pushRank(score);
  }
  setStatus(statusText);
  const tip = score >= highScore && score > 0 ? "\n（新纪录！）" : "";
  showFinishOverlay(title, `本局得分：${score}${tip}`);
}

function handleWin() {
  playWin();
  endGame("恭喜通关", "棋盘已铺满，胜利！", true);
}

function step() {
  if (!isRunning()) {
    draw();
    return;
  }

  direction = queuedDirection;
  const head = snake[0];
  let nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  const wrapWall = wrapWallEl.checked;
  if (wrapWall) {
    nextHead = applyWrap(nextHead);
  } else if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= CONFIG.gridCount ||
    nextHead.y >= CONFIG.gridCount
  ) {
    playGameOver();
    endGame("游戏结束", "撞墙了！点击遮罩按钮再来一局。");
    draw();
    return;
  }

  const willEat = food && positionsEqual(nextHead, food);
  const bodyForHit = willEat ? snake : snake.slice(0, -1);
  const hitSelf = bodyForHit.some((part) => positionsEqual(part, nextHead));
  const hitRock = isOnObstacle(nextHead);

  if (hitSelf || hitRock) {
    playGameOver();
    endGame("游戏结束", hitRock ? "撞到障碍物！" : "咬到自己了！");
    draw();
    return;
  }

  snake.unshift(nextHead);

  if (willEat) {
    score += 1;
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      persistHighScore();
    }
    playEat();
    if (!hasFreeCell()) {
      handleWin();
      draw();
      return;
    }
    food = spawnFood();
    if (!food) {
      handleWin();
      draw();
      return;
    }
    rescheduleTimer();
  } else {
    snake.pop();
  }

  draw();
}

function requestDirection(next) {
  if (!isRunning()) return;
  const isOpposite = direction.x + next.x === 0 && direction.y + next.y === 0;
  if (!isOpposite) {
    queuedDirection = next;
  }
}

function beginPlay() {
  resumeAudio();
  resetGame();
  setState("running");
  hideOverlay();
  rescheduleTimer();
  draw();
}

function pauseToggle() {
  if (!isRunning() && gameState !== "paused") return;
  if (gameState === "paused") {
    setState("running");
    setStatus("");
  } else {
    setState("paused");
    setStatus("已暂停（空格继续）");
  }
}

window.addEventListener("keydown", (event) => {
  const k = event.key;
  if (k === "ArrowUp" || k === "w" || k === "W") {
    event.preventDefault();
    requestDirection({ x: 0, y: -1 });
  } else if (k === "ArrowDown" || k === "s" || k === "S") {
    event.preventDefault();
    requestDirection({ x: 0, y: 1 });
  } else if (k === "ArrowLeft" || k === "a" || k === "A") {
    event.preventDefault();
    requestDirection({ x: -1, y: 0 });
  } else if (k === "ArrowRight" || k === "d" || k === "D") {
    event.preventDefault();
    requestDirection({ x: 1, y: 0 });
  } else if (k === " ") {
    event.preventDefault();
    pauseToggle();
  }
});

restartBtn.addEventListener("click", () => {
  beginPlay();
});

overlayBtn.addEventListener("click", () => {
  beginPlay();
});

modeSelectEl.addEventListener("change", () => {
  syncModeConfig();
  if (gameState === "running" || gameState === "paused") {
    setStatus("模式已切换，将在下一局生效。");
  }
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    if (e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  },
  { passive: true }
);

canvas.addEventListener(
  "touchend",
  (e) => {
    if (!touchStart || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < CONFIG.swipeMinPx && Math.abs(dy) < CONFIG.swipeMinPx) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      requestDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    } else {
      requestDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    }
  },
  { passive: true }
);

highScore = loadHighScore();
highScoreEl.textContent = highScore;
rankEntries = loadRankEntries();
updateRankList();
syncModeConfig();
resetGame();
setState("idle");
showStartOverlay();
draw();

window.addEventListener("beforeunload", () => {
  clearGameTimer();
});
