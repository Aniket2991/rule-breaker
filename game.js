const $ = id => document.getElementById(id);

const screens = { home: $("home"), game: $("game"), over: $("over") };

const rules = [
  { text: "TAP BLUE", type: "color", value: "blue" },
  { text: "TAP RED", type: "color", value: "red" },
  { text: "TAP GREEN", type: "color", value: "green" },
  { text: "TAP YELLOW", type: "color", value: "yellow" },
  { text: "TAP PURPLE", type: "color", value: "purple" },
  { text: "TAP THE CIRCLE", type: "shape", value: "circle" },
  { text: "TAP THE SQUARE", type: "shape", value: "square" },
  { text: "TAP THE TRIANGLE", type: "shape", value: "triangle" },
  { text: "TAP THE SMALLEST", type: "size", value: "small" },
  { text: "TAP THE BIGGEST", type: "size", value: "big" },
  { text: "DON'T TAP RED", type: "avoid", value: "red" }
];

const colors = ["blue", "red", "green", "yellow", "purple"];
const shapes = ["circle", "square", "triangle"];
const colorHex = {
  blue: "#22b8ff",
  red: "#ff466d",
  green: "#34df9b",
  yellow: "#ffd34d",
  purple: "#9c65ff"
};

let score = 0;
let best = readBest();
let lives = 3;
let round = 0;
let streak = 0;
let maxStreak = 0;
let timer = null;
let nextTimer = null;
let locked = false;
let difficulty = 1800;
let roundToken = 0;
let ruleDeck = [];
let audioContext = null;

function readBest() {
  try { return Number(localStorage.getItem("rbBest") || 0); }
  catch { return 0; }
}

function saveBest(value) {
  try { localStorage.setItem("rbBest", String(value)); } catch {}
}

function show(name) {
  Object.values(screens).forEach(screen => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function updateHome() {
  $("homeBest").textContent = best;
}

function updateHUD() {
  $("score").textContent = score;
  $("streak").textContent = streak > 1 ? "x" + streak : streak;
  $("lives").textContent = "♥ ".repeat(lives).trim();
  $("roundText").textContent = "ROUND " + Math.max(1, round);
  $("speedText").textContent = difficulty <= 850 ? "INSANE" : difficulty <= 1150 ? "FAST" : difficulty <= 1450 ? "QUICK" : "READY";
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  ruleDeck = shuffle(rules);
}

function nextRule() {
  if (!ruleDeck.length) buildDeck();
  return ruleDeck.pop();
}

function start() {
  clearTimeout(timer);
  clearTimeout(nextTimer);
  initAudio();

  score = 0;
  lives = 3;
  round = 0;
  streak = 0;
  maxStreak = 0;
  difficulty = 1800;
  locked = false;
  roundToken++;
  buildDeck();
  updateHUD();
  show("game");
  nextRound();
}

function loseLife(token) {
  if (locked || token !== roundToken) return;

  locked = true;
  clearTimeout(timer);
  streak = 0;
  lives--;
  updateHUD();

  $("arena").classList.remove("shake");
  void $("arena").offsetWidth;
  $("arena").classList.add("shake");
  flash("bad");
  playTone("wrong");
  showToast("MISS");

  if (lives <= 0) {
    nextTimer = setTimeout(endGame, 160);
    return;
  }

  nextTimer = setTimeout(() => {
    locked = false;
    nextRound();
  }, 220);
}

function makeShapes(rule) {
  const arena = $("arena");
  arena.innerHTML = '<div id="arenaGlow" class="arena-glow"></div><div id="toast" class="toast"></div>';

  const count = Math.min(9, 5 + Math.floor(round / 3));
  const targetIndex = rule.type === "avoid" ? -1 : Math.floor(Math.random() * count);
  const used = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "shape";

    let color = colors[Math.floor(Math.random() * colors.length)];
    let shape = rule.type === "size" ? shapes[Math.floor(Math.random() * 2)] : shapes[Math.floor(Math.random() * shapes.length)];
    let size = 52 + Math.random() * 26;

    if (rule.type === "color" && i === targetIndex) color = rule.value;
    if (rule.type === "shape" && i === targetIndex) shape = rule.value;
    if (rule.type === "size" && i === targetIndex) size = rule.value === "small" ? 40 : 88;
    if (rule.type === "avoid" && i === 0) color = "red";

    if (rule.type === "color" && i !== targetIndex && color === rule.value) {
      color = colors.find(c => c !== rule.value && !used.includes(c)) || colors.find(c => c !== rule.value);
    }

    if (rule.type === "shape" && i !== targetIndex && shape === rule.value) {
      shape = shapes.find(s => s !== rule.value) || "circle";
    }

    if (rule.type === "size" && i !== targetIndex) {
      size = rule.value === "small" ? 58 + Math.random() * 22 : 44 + Math.random() * 20;
    }

    used.push(color);
    el.classList.add(color, shape);
    if (shape === "triangle") {
      el.style.borderBottomColor = colorHex[color];
    } else {
      el.style.width = size + "px";
      el.style.height = size + "px";
    }

    el.dataset.color = color;
    el.dataset.shape = shape;
    el.dataset.size = String(size);

    const box = shape === "triangle" ? 68 : size;
    const maxX = Math.max(4, arena.clientWidth - box - 4);
    const maxY = Math.max(4, arena.clientHeight - box - 4);

    // Keep targets away from the extreme edge so every target is easy to tap.
    el.style.left = (8 + Math.random() * Math.max(4, maxX - 8)) + "px";
    el.style.top = (8 + Math.random() * Math.max(4, maxY - 8)) + "px";

    el.addEventListener("pointerdown", event => {
      event.preventDefault();
      tap(el, rule);
    }, { passive: false });

    arena.appendChild(el);
  }

  // Guarantee a unique smallest/biggest target.
  if (rule.type === "size") {
    const all = [...arena.querySelectorAll(".shape")];
    if (rule.value === "small") {
      all.forEach((el, index) => {
        if (index !== targetIndex) el.dataset.size = String(58 + Math.random() * 20);
      });
    } else {
      all.forEach((el, index) => {
        if (index !== targetIndex) el.dataset.size = String(44 + Math.random() * 18);
      });
    }
  }
}

function correct(el, rule) {
  if (rule.type === "avoid") return el.dataset.color !== "red";
  if (rule.type === "color") return el.dataset.color === rule.value;
  if (rule.type === "shape") return el.dataset.shape === rule.value;

  const all = [...document.querySelectorAll("#arena .shape")];
  const values = all.map(x => Number(x.dataset.size));

  if (rule.type === "size" && rule.value === "small") {
    return Number(el.dataset.size) === Math.min(...values);
  }

  if (rule.type === "size" && rule.value === "big") {
    return Number(el.dataset.size) === Math.max(...values);
  }

  return false;
}

function tap(el, rule) {
  if (locked) return;

  if (!correct(el, rule)) {
    el.classList.add("wrong-pop");
    loseLife(roundToken);
    return;
  }

  locked = true;
  clearTimeout(timer);

  streak++;
  maxStreak = Math.max(maxStreak, streak);

  const bonus = streak >= 5 ? 2 : 1;
  score += bonus;
  round++;

  difficulty = Math.max(560, difficulty - (streak >= 5 ? 65 : 48));

  updateHUD();
  el.classList.add("correct-pop");
  flash("good");
  spawnParticles(el);
  playTone("correct");

  $("ruleCard").classList.remove("hit");
  void $("ruleCard").offsetWidth;
  $("ruleCard").classList.add("hit");

  if (streak >= 3) {
    showToast(streak % 5 === 0 ? "🔥 x" + streak : "NICE!");
  }

  const token = roundToken;
  nextTimer = setTimeout(() => {
    if (token === roundToken) {
      locked = false;
      nextRound();
    }
  }, 115);
}

function nextRound() {
  clearTimeout(timer);
  clearTimeout(nextTimer);
  locked = false;
  roundToken++;

  const token = roundToken;
  const rule = nextRule();

  $("ruleText").textContent = rule.text;
  updateHUD();
  makeShapes(rule);

  const duration = difficulty;
  $("timerBar").style.transition = "none";
  $("timerBar").style.width = "100%";

  requestAnimationFrame(() => {
    $("timerBar").style.transition = "width " + duration + "ms linear";
    $("timerBar").style.width = "0%";
  });

  timer = setTimeout(() => loseLife(token), duration);
}

function endGame() {
  clearTimeout(timer);
  clearTimeout(nextTimer);
  locked = true;

  const isNewBest = score > best;
  if (isNewBest) {
    best = score;
    saveBest(best);
  }

  $("finalScore").textContent = score;
  $("bestScore").textContent = best;
  $("finalStreak").textContent = maxStreak;
  $("finalRound").textContent = round;

  $("newBest").classList.toggle("show", isNewBest);
  $("overMessage").textContent =
    score === 0 ? "The rules won this time." :
    maxStreak >= 10 ? "That was seriously fast." :
    "One more run. Beat your score.";

  updateHome();
  show("over");
  playTone("gameover");
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
}

function flash(type) {
  const node = $("flash");
  node.className = "flash";
  void node.offsetWidth;
  node.classList.add(type);
}

function spawnParticles(el) {
  const arena = $("arena");
  const x = el.offsetLeft + el.offsetWidth / 2;
  const y = el.offsetTop + el.offsetHeight / 2;

  for (let i = 0; i < 8; i++) {
    const p = document.createElement("i");
    p.className = "particle";
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.background = colorHex[el.dataset.color] || "#fff";

    const angle = (Math.PI * 2 * i) / 8;
    const distance = 24 + Math.random() * 30;
    p.style.setProperty("--x", Math.cos(angle) * distance + "px");
    p.style.setProperty("--y", Math.sin(angle) * distance + "px");
    arena.appendChild(p);
    setTimeout(() => p.remove(), 450);
  }
}

function initAudio() {
  if (audioContext) {
    if (audioContext.state === "suspended") audioContext.resume();
    return;
  }
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch {}
}

function playTone(type) {
  if (!audioContext) return;

  const settings = {
    correct: [620, 0.055, "sine"],
    wrong: [150, 0.09, "sawtooth"],
    gameover: [110, 0.16, "triangle"]
  }[type];

  if (!settings) return;

  try {
    const [frequency, duration, wave] = settings;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}

$("playBtn").onclick = start;
$("againBtn").onclick = start;

$("homeBtn").onclick = () => {
  clearTimeout(timer);
  clearTimeout(nextTimer);
  locked = true;
  updateHome();
  show("home");
};

updateHome();
show("home");
