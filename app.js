const styles = [
  {
    id: "zen",
    name: "禅茶专注",
    tone: "Quiet Tea",
    description: "温润、留白、低噪声，适合阅读、复盘和深度写作。",
    defaultMinutes: { work: 25, short: 5, long: 15, interval: 4 },
    cardBg: "linear-gradient(135deg, #f5ead8, #d8e6cf)"
  },
  {
    id: "cyber",
    name: "赛博冲刺",
    tone: "Neon Sprint",
    description: "高对比与电子感，适合编码、清单攻坚和短时爆发。",
    defaultMinutes: { work: 30, short: 5, long: 20, interval: 4 },
    cardBg: "linear-gradient(135deg, #10152c, #211044)"
  },
  {
    id: "library",
    name: "木质图书馆",
    tone: "Oak Library",
    description: "纸张、木色和安静秩序，适合学习、摘录和资料整理。",
    defaultMinutes: { work: 25, short: 5, long: 15, interval: 4 },
    cardBg: "linear-gradient(135deg, #f6e5c7, #c99b69)"
  },
  {
    id: "ocean",
    name: "海岸流动",
    tone: "Ocean Flow",
    description: "清爽蓝绿与呼吸感，适合创意任务和低压力推进。",
    defaultMinutes: { work: 25, short: 7, long: 18, interval: 4 },
    cardBg: "linear-gradient(135deg, #dff8fb, #83d9de)"
  },
  {
    id: "space",
    name: "深空驾驶舱",
    tone: "Space Dock",
    description: "暗色、星点和仪表感，适合夜间专注与长线研究。",
    defaultMinutes: { work: 45, short: 10, long: 25, interval: 3 },
    cardBg: "linear-gradient(135deg, #111421, #303a5d)"
  },
  {
    id: "garden",
    name: "花园晨光",
    tone: "Garden Light",
    description: "明亮、自然、轻盈，适合晨间计划、语言学习和轻办公。",
    defaultMinutes: { work: 20, short: 5, long: 15, interval: 4 },
    cardBg: "linear-gradient(135deg, #f6fff0, #b9dfb1)"
  }
];

const modes = {
  work: { label: "专注", next: "短休息" },
  short: { label: "短休息", next: "专注" },
  long: { label: "长休息", next: "专注" }
};

const state = {
  style: styles[0],
  mode: "work",
  isRunning: false,
  soundEnabled: true,
  completed: 0,
  round: 1,
  duration: 25 * 60,
  remaining: 25 * 60,
  endsAt: 0,
  timerId: null
};

const els = {
  homeView: document.querySelector("#homeView"),
  timerView: document.querySelector("#timerView"),
  styleGrid: document.querySelector("#styleGrid"),
  backButton: document.querySelector("#backButton"),
  soundButton: document.querySelector("#soundButton"),
  timerTitle: document.querySelector("#timerTitle"),
  timerTone: document.querySelector("#timerTone"),
  styleName: document.querySelector("#styleName"),
  styleDescription: document.querySelector("#styleDescription"),
  modeTabs: document.querySelector("#modeTabs"),
  modeLabel: document.querySelector("#modeLabel"),
  timeReadout: document.querySelector("#timeReadout"),
  sessionText: document.querySelector("#sessionText"),
  currentRound: document.querySelector("#currentRound"),
  nextBreak: document.querySelector("#nextBreak"),
  startPauseButton: document.querySelector("#startPauseButton"),
  resetButton: document.querySelector("#resetButton"),
  skipButton: document.querySelector("#skipButton"),
  ringProgress: document.querySelector("#ringProgress"),
  workInput: document.querySelector("#workInput"),
  shortInput: document.querySelector("#shortInput"),
  longInput: document.querySelector("#longInput"),
  intervalInput: document.querySelector("#intervalInput")
};

const inputs = {
  work: els.workInput,
  short: els.shortInput,
  long: els.longInput,
  interval: els.intervalInput
};

function init() {
  renderStyleCards();
  renderModeTabs();
  bindEvents();

  const initialStyleId = new URLSearchParams(window.location.search).get("style");
  const initialStyle = styles.find((style) => style.id === initialStyleId);
  if (initialStyle) {
    openTimer(initialStyle.id, false);
  } else {
    applyTheme(styles[0]);
  }
}

function renderStyleCards() {
  els.styleGrid.innerHTML = styles
    .map(
      (style) => `
        <button class="style-card theme-card-${style.id}" type="button" data-style="${style.id}" style="--card-bg: ${style.cardBg}">
          <h2>${style.name}</h2>
          <p>${style.description}</p>
          <span class="style-meta">${style.defaultMinutes.work} / ${style.defaultMinutes.short} 分钟</span>
          <span class="preview-art" aria-hidden="true"></span>
        </button>
      `
    )
    .join("");
}

function renderModeTabs() {
  els.modeTabs.innerHTML = Object.entries(modes)
    .map(
      ([mode, data]) => `
        <button class="mode-tab" type="button" role="tab" data-mode="${mode}" aria-selected="false">
          ${data.label}
        </button>
      `
    )
    .join("");
}

function bindEvents() {
  els.styleGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-style]");
    if (card) openTimer(card.dataset.style, true);
  });

  els.backButton.addEventListener("click", () => {
    stopTimer();
    showHome();
  });

  els.modeTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-mode]");
    if (tab) setMode(tab.dataset.mode, true);
  });

  els.startPauseButton.addEventListener("click", toggleTimer);
  els.resetButton.addEventListener("click", () => setMode(state.mode, true));
  els.skipButton.addEventListener("click", completeMode);
  els.soundButton.addEventListener("click", toggleSound);

  Object.values(inputs).forEach((input) => {
    input.addEventListener("change", handleSettingChange);
  });

  window.addEventListener("popstate", () => {
    const styleId = new URLSearchParams(window.location.search).get("style");
    if (styleId) {
      openTimer(styleId, false);
    } else {
      showHome(false);
    }
  });
}

function openTimer(styleId, pushHistory) {
  const selected = styles.find((style) => style.id === styleId) ?? styles[0];
  state.style = selected;
  state.mode = "work";
  state.completed = 0;
  state.round = 1;
  stopTimer();
  applyTheme(selected);
  loadStyleDefaults(selected);
  setMode("work", true);

  els.homeView.classList.add("is-hidden");
  els.timerView.classList.remove("is-hidden");

  if (pushHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set("style", selected.id);
    window.history.pushState({ style: selected.id }, "", url);
  }
}

function showHome(pushHistory = true) {
  els.timerView.classList.add("is-hidden");
  els.homeView.classList.remove("is-hidden");
  applyTheme(styles[0]);

  if (pushHistory) {
    const url = new URL(window.location.href);
    url.searchParams.delete("style");
    window.history.pushState({}, "", url);
  }
}

function applyTheme(style) {
  document.body.className = `theme-${style.id}`;
  els.timerTitle.textContent = style.name;
  els.timerTone.textContent = style.tone;
  els.styleName.textContent = style.name;
  els.styleDescription.textContent = style.description;
}

function loadStyleDefaults(style) {
  inputs.work.value = style.defaultMinutes.work;
  inputs.short.value = style.defaultMinutes.short;
  inputs.long.value = style.defaultMinutes.long;
  inputs.interval.value = style.defaultMinutes.interval;
}

function handleSettingChange(event) {
  const input = event.target;
  const min = Number(input.min);
  const max = Number(input.max);
  const nextValue = Math.min(max, Math.max(min, Number(input.value) || min));
  input.value = nextValue;
  setMode(state.mode, true);
}

function setMode(mode, resetRemaining) {
  stopTimer();
  state.mode = mode;
  state.duration = getDuration(mode);
  if (resetRemaining) state.remaining = state.duration;
  updateDisplay();
}

function getDuration(mode) {
  return Math.max(1, Number(inputs[mode].value)) * 60;
}

function toggleTimer() {
  if (state.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (state.remaining <= 0) {
    state.remaining = state.duration;
  }
  state.isRunning = true;
  state.endsAt = Date.now() + state.remaining * 1000;
  els.startPauseButton.textContent = "暂停";
  window.clearInterval(state.timerId);
  state.timerId = window.setInterval(tick, 250);
  tick();
}

function pauseTimer() {
  state.remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  stopTimer();
  updateDisplay();
}

function stopTimer() {
  state.isRunning = false;
  window.clearInterval(state.timerId);
  state.timerId = null;
  els.startPauseButton.textContent = "开始";
}

function tick() {
  state.remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  updateDisplay();
  if (state.remaining <= 0) {
    completeMode();
  }
}

function completeMode() {
  const completedMode = state.mode;
  stopTimer();
  ring();

  if (completedMode === "work") {
    state.completed += 1;
    state.round += 1;
    const interval = Math.max(2, Number(inputs.interval.value) || 4);
    setMode(state.completed % interval === 0 ? "long" : "short", true);
  } else {
    setMode("work", true);
  }
}

function updateDisplay() {
  const minutes = Math.floor(state.remaining / 60);
  const seconds = state.remaining % 60;
  const progress = state.duration > 0 ? state.remaining / state.duration : 0;
  const circumference = 2 * Math.PI * 96;

  els.timeReadout.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  els.modeLabel.textContent = modes[state.mode].label;
  els.sessionText.textContent = `已完成 ${state.completed} 个番茄`;
  els.currentRound.textContent = state.round;
  els.nextBreak.textContent = state.mode === "work" ? nextBreakLabel() : "专注";
  els.ringProgress.style.strokeDashoffset = String(circumference * (1 - progress));

  document.querySelectorAll(".mode-tab").forEach((tab) => {
    const active = tab.dataset.mode === state.mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  document.title = `${els.timeReadout.textContent} - ${modes[state.mode].label}`;
}

function nextBreakLabel() {
  const interval = Math.max(2, Number(inputs.interval.value) || 4);
  return (state.completed + 1) % interval === 0 ? "长休息" : "短休息";
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  els.soundButton.textContent = state.soundEnabled ? "声音开" : "声音关";
}

function ring() {
  if (!state.soundEnabled) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(720, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(460, context.currentTime + 0.32);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.38);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.4);
}

init();
