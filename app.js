const modes = {
  work: "专注",
  short: "短休息",
  long: "长休息",
};

const nextMode = {
  work: null,
  short: "work",
  long: "work",
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 130;

/* ── State ── */

const state = {
  mode: "work",
  running: false,
  sound: true,
  completed: 0,
  round: 1,
  duration: 25 * 60,
  remaining: 25 * 60,
  endAt: 0,
  timer: null,
};

/* ── DOM refs ── */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const el = {
  body: document.body,
  timeReadout: $("#timeReadout"),
  modeBadge: $("#modeBadge"),
  ringProgress: $("#ringProgress"),
  modeTabs: $("#modeTabs"),
  startPause: $("#startPauseButton"),
  reset: $("#resetButton"),
  skip: $("#skipButton"),
  sessionCount: $("#sessionCount"),
  soundToggle: $("#soundToggle"),
  themeToggle: $("#themeToggle"),
  settings: $("#settings"),
  settingsTrigger: $("#settingsTrigger"),
  clock: $(".clock"),
  workInput: $("#workInput"),
  shortInput: $("#shortInput"),
  longInput: $("#longInput"),
  intervalInput: $("#intervalInput"),
};

/* ── Init ── */

function init() {
  loadPrefs();
  renderModeTabs();
  bindEvents();
  setMode(state.mode, true);
}

function loadPrefs() {
  const saved = storageGet("pomodoro-prefs");
  if (saved) {
    el.workInput.value = saved.work ?? 25;
    el.shortInput.value = saved.short ?? 5;
    el.longInput.value = saved.long ?? 15;
    el.intervalInput.value = saved.interval ?? 4;
  }

  const theme = storageGet("pomodoro-theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);

  const sound = storageGet("pomodoro-sound");
  if (sound !== null) {
    state.sound = sound;
    el.soundToggle.textContent = sound ? "声音开" : "声音关";
  }
}

function storageGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded, ignore */ }
}

/* ── Mode tabs ── */

function renderModeTabs() {
  el.modeTabs.innerHTML = Object.entries(modes)
    .map(([mode, label]) => `<button class="mode-tab" data-mode="${mode}">${label}</button>`)
    .join("");
}

/* ── Events ── */

function bindEvents() {
  el.modeTabs.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-mode]");
    if (tab) setMode(tab.dataset.mode, true);
  });

  el.startPause.addEventListener("click", toggle);
  el.reset.addEventListener("click", () => setMode(state.mode, true));
  el.skip.addEventListener("click", complete);
  el.soundToggle.addEventListener("click", toggleSound);
  el.themeToggle.addEventListener("click", toggleTheme);
  el.settingsTrigger.addEventListener("click", toggleSettings);

  [el.workInput, el.shortInput, el.longInput, el.intervalInput].forEach((inp) => {
    inp.addEventListener("change", handleSettingChange);
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      toggle();
    }
  });
}

/* ── Theme ── */

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  storageSet("pomodoro-theme", next);
}

/* ── Settings ── */

function toggleSettings() {
  el.settings.classList.toggle("is-open");
}

function handleSettingChange(e) {
  const inp = e.target;
  const val = Math.min(inp.max, Math.max(inp.min, Number(inp.value) || inp.min));
  inp.value = val;
  savePrefs();
  if (!state.running) setMode(state.mode, true);
}

function savePrefs() {
  storageSet("pomodoro-prefs", {
    work: Number(el.workInput.value),
    short: Number(el.shortInput.value),
    long: Number(el.longInput.value),
    interval: Number(el.intervalInput.value),
  });
}

/* ── Timer logic ── */

function setMode(mode, reset) {
  stop();
  state.mode = mode;
  state.duration = getDuration(mode);
  if (reset) state.remaining = state.duration;
  updateDisplay();

  $$(".mode-tab").forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
  });
}

function getDuration(mode) {
  const map = { work: el.workInput, short: el.shortInput, long: el.longInput };
  return Math.max(1, Number(map[mode].value)) * 60;
}

function toggle() {
  state.running ? pause() : start();
}

function start() {
  if (state.remaining <= 0) state.remaining = state.duration;
  state.running = true;
  state.endAt = Date.now() + state.remaining * 1000;
  el.startPause.textContent = "暂停";
  el.clock.classList.add("is-running");
  clearInterval(state.timer);
  state.timer = setInterval(tick, 200);
  tick();
}

function pause() {
  state.remaining = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
  stop();
  updateDisplay();
}

function stop() {
  state.running = false;
  clearInterval(state.timer);
  state.timer = null;
  el.startPause.textContent = "开始";
  el.clock.classList.remove("is-running");
}

function tick() {
  state.remaining = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
  updateDisplay();
  if (state.remaining <= 0) complete();
}

function complete() {
  const finishedMode = state.mode;
  stop();
  chime();

  if (finishedMode === "work") {
    state.completed += 1;
    state.round += 1;
    const interval = Math.max(2, Number(el.intervalInput.value) || 4);
    setMode(state.completed % interval === 0 ? "long" : "short", true);
  } else {
    setMode("work", true);
  }
}

/* ── Display ── */

function updateDisplay() {
  const m = Math.floor(state.remaining / 60);
  const s = state.remaining % 60;
  const progress = state.duration > 0 ? state.remaining / state.duration : 0;

  el.timeReadout.textContent = `${pad(m)}:${pad(s)}`;
  el.modeBadge.textContent = modes[state.mode];
  el.sessionCount.textContent = `已完成 ${state.completed} 个番茄`;
  el.ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
  document.title = `${pad(m)}:${pad(s)} - ${modes[state.mode]}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/* ── Sound ── */

function toggleSound() {
  state.sound = !state.sound;
  el.soundToggle.textContent = state.sound ? "声音开" : "声音关";
  storageSet("pomodoro-sound", state.sound);
}

function chime() {
  if (!state.sound) return;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.42);
}

/* ── Start ── */

init();
