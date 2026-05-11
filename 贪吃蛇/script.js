const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const wrapWallEl = document.getElementById("wrapWall");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayBtn = document.getElementById("overlayBtn");

const gridCount = 20;
const tileSize = canvas.width / gridCount;
const BASE_TICK_MS = 171;
const MIN_TICK_MS = 95;
const SPEED_TIER_EVERY = 6;
const SPEED_DROP_MS = 6;
const OBSTACLE_COUNT = 6;
const SWIPE_MIN_PX = 32;
const HIGH_SCORE_KEY = "snake-high-score";

let snake;
let direction;
let queuedDirection;
let food;
let score;
let gameOver;
let paused;
let started;
let wrapWall;
let obstacles;
let timerId;
let touchStart;
let audioCtx;

let highScore = 0;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function positionsEqual(a, b) {
  return a.x === b.x && a.y === b.y;
}

function loadHighScore() {
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  const n = raw == null ? 0 : parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function persistHighScore() {
  localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
}

function currentTickMs() {
  const tier = Math.floor(score / SPEED_TIER_EVERY);
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - tier * SPEED_DROP_MS);
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

function isOnSnake(p) {
  return snake.some((part) => positionsEqual(part, p));
}

function isOnObstacle(p) {
  return obstacles.some((o) => positionsEqual(o, p));
}

function isBlockedCell(p) {
  return isOnSnake(p) || isOnObstacle(p);
}

function generateObstacles() {
  const list = [];
  const taken = new Set(snake.map((s) => `${s.x},${s.y}`));
  let guard = 0;
  while (list.length < OBSTACLE_COUNT && guard < 800) {
    guard += 1;
    const c = { x: randomInt(gridCount), y: randomInt(gridCount) };
    const key = `${c.x},${c.y}`;
    if (taken.has(key)) continue;
    taken.add(key);
    list.push(c);
  }
  return list;
}

function spawnFood() {
  let nextFood = { x: randomInt(gridCount), y: randomInt(gridCount) };
  let guard = 0;
  while (isBlockedCell(nextFood) && guard < 500) {
    guard += 1;
    nextFood = { x: randomInt(gridCount), y: randomInt(gridCount) };
  }
  if (!isBlockedCell(nextFood)) return nextFood;
  for (let y = 0; y < gridCount; y += 1) {
    for (let x = 0; x < gridCount; x += 1) {
      const p = { x, y };
      if (!isBlockedCell(p)) return p;
    }
  }
  return nextFood;
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
      "方向键或 WASD 控制，空格暂停。\n手机在画布上滑动即可转向。\n勾选「穿墙」可从边界循环到对面。",
    buttonText: "开始游戏"
  });
}

function showGameOverOverlay() {
  showOverlay({
    title: "游戏结束",
    message: `本局得分：${score}${score >= highScore && score > 0 ? "\n（新纪录！）" : ""}`,
    buttonText: "再来一局"
  });
}

function resetGame() {
  wrapWall = Boolean(wrapWallEl.checked);
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  obstacles = generateObstacles();
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  food = spawnFood();
  score = 0;
  gameOver = false;
  paused = false;
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

  for (let row = 0; row < gridCount; row += 1) {
    for (let col = 0; col < gridCount; col += 1) {
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

  drawCell(food.x, food.y, "#ef4444", 5);
}

function applyWrap(p) {
  let { x, y } = p;
  if (x < 0) x = gridCount - 1;
  if (x >= gridCount) x = 0;
  if (y < 0) y = gridCount - 1;
  if (y >= gridCount) y = 0;
  return { x, y };
}

function step() {
  if (!started) {
    draw();
    return;
  }

  if (gameOver || paused) {
    draw();
    return;
  }

  direction = queuedDirection;
  const head = snake[0];
  let nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  if (wrapWall) {
    nextHead = applyWrap(nextHead);
  } else if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= gridCount ||
    nextHead.y >= gridCount
  ) {
    gameOver = true;
    clearGameTimer();
    playGameOver();
    setStatus("撞墙了！点击遮罩上的按钮再来一局。");
    showGameOverOverlay();
    draw();
    return;
  }

  const willEat = positionsEqual(nextHead, food);
  const bodyForHit = willEat ? snake : snake.slice(0, -1);
  const hitSelf = bodyForHit.some((part) => positionsEqual(part, nextHead));
  const hitRock = isOnObstacle(nextHead);

  if (hitSelf || hitRock) {
    gameOver = true;
    clearGameTimer();
    playGameOver();
    setStatus(hitRock ? "撞到障碍物！" : "咬到自己了！");
    showGameOverOverlay();
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
    food = spawnFood();
    playEat();
    rescheduleTimer();
  } else {
    snake.pop();
  }

  draw();
}

function requestDirection(next) {
  if (!started || gameOver) return;
  const isOpposite = direction.x + next.x === 0 && direction.y + next.y === 0;
  if (!isOpposite) {
    queuedDirection = next;
  }
}

function beginPlay() {
  resumeAudio();
  resetGame();
  started = true;
  hideOverlay();
  rescheduleTimer();
  draw();
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
    if (started && !gameOver) {
      paused = !paused;
      setStatus(paused ? "已暂停（空格继续）" : "");
    }
  }
});

restartBtn.addEventListener("click", () => {
  resumeAudio();
  resetGame();
  started = true;
  hideOverlay();
  rescheduleTimer();
  draw();
});

overlayBtn.addEventListener("click", () => {
  beginPlay();
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
    if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) return;
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

resetGame();
started = false;
showStartOverlay();
draw();

window.addEventListener("beforeunload", () => {
  clearGameTimer();
});
