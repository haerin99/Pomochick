// ============================================================
// POMOCHICK - Renderer Process
// ============================================================

// ---- State ----
let appData = {
  totalFocusMinutes: 0,
  dailyBlocks: {},
  hunger: 50,
  lastHungerDate: null,
  birthDate: null,
  settings: {
    pomoDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    pomosPerSession: 4,
    hungerDecrease: 10,
    sessionsPerDay: 2,
    hungerPaused: false
  }
};

let hunger = 50;
let timerInterval = null;
let secondsLeft = 0;
let isRunning = false;
let currentPhase = 'pomo'; // 'pomo' | 'short' | 'long'
let currentPomo = 1;
let totalPomosInSession = 0;

// Pending settings (before save)
let pendingSettings = {};

// ---- DOM refs ----
const screens = {
  timer: document.getElementById('screen-timer'),
  stats: document.getElementById('screen-stats'),
  settings: document.getElementById('screen-settings')
};

const chickImg = document.getElementById('chick-img');
const hungerFill = document.getElementById('hunger-fill');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const timerText = document.getElementById('timer-text');
const phaseLabel = document.getElementById('phase-label');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');

// Chick images — local files
const CHICK_IMAGES = {
  happy:   'assets/happy_chick.png',
  neutral: 'assets/neutral_chick.png',
  sad:     'assets/sad_chick.png',
  dead:    'assets/dead_chick.png'
};

const PLAY_ICON = 'assets/play_icon.svg';

// ---- Audio (Web Audio API, no external files needed) ----
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freqs, duration, type = 'square') {
  try {
    const ctx = getAudio();
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    });
  } catch (e) {}
}

function playPomoCompleteSound() {
  // Cheerful ascending fanfare
  playTone([523, 659, 784, 1047], 0.25, 'square');
}

function playBreakCompleteSound() {
  // Lower, gentler chime
  playTone([392, 330, 262], 0.3, 'sine');
}

// ---- Init ----
async function init() {
  if (window.electronAPI) {
    const saved = await window.electronAPI.loadData();
    // Merge saved data, filling in any missing new fields with defaults
    appData = {
      ...appData,
      ...saved,
      settings: { ...appData.settings, ...(saved.settings || {}) }
    };
  }
  hunger = appData.hunger ?? 50;
  applyDailyHungerIncrement();
  pendingSettings = { ...appData.settings };
  applySettings();
  updateChick();
  updateHungerBar();
  updatePhaseLabel();
  setTimerDisplay(appData.settings.pomoDuration * 60);
  secondsLeft = appData.settings.pomoDuration * 60;
  renderChart();
  updateStatsDisplay();
  setupNavigation();
  document.getElementById('hunger-group').style.visibility = '';
  document.getElementById('status-badge').style.visibility = '';
  document.getElementById('chick-container').style.visibility = '';
  if (window.electronAPI) window.electronAPI.showWindow();
}

// ---- Daily hunger increment ----
function applyDailyHungerIncrement() {
  if (appData.settings.hungerPaused) return;
  const today = new Date().toISOString().split('T')[0];
  if (appData.lastHungerDate === today) return; // already applied today
  if (!appData.lastHungerDate) {
    // First launch ever — just record today, don't penalize
    appData.lastHungerDate = today;
    if (!appData.birthDate) appData.birthDate = today;
    saveAppData();
    return;
  }
  if (!appData.birthDate) appData.birthDate = appData.lastHungerDate;
  const daysSince = Math.floor((new Date(today) - new Date(appData.lastHungerDate)) / 86400000);
  const s = appData.settings;
  const dailyIncrease = (s.hungerDecrease * s.pomosPerSession * s.sessionsPerDay) / 2;
  hunger = Math.min(100, hunger + dailyIncrease * daysSince);
  appData.hunger = hunger;
  appData.lastHungerDate = today;
  if (hunger >= 100) {
    chickDied();
  }
  saveAppData();
}

// ---- Navigation ----
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  if (name === 'stats') {
    renderChart();
    updateStatsDisplay();
    // Restart bounce animation from scratch each time stats is opened
    const daysAliveEl = document.getElementById('stats-days-alive');
    daysAliveEl.style.animation = 'none';
    void daysAliveEl.offsetWidth; // force reflow
    daysAliveEl.style.animation = '';
  }
  if (name === 'settings') {
    renderSettingsValues();
  }
}

function setupNavigation() {
  // Timer screen nav
  document.getElementById('nav-timer').addEventListener('click', () => showScreen('timer'));
  document.getElementById('nav-stats').addEventListener('click', () => showScreen('stats'));
  document.getElementById('nav-settings').addEventListener('click', () => showScreen('settings'));
  // Stats screen nav
  document.getElementById('nav-timer-2').addEventListener('click', () => showScreen('timer'));
  document.getElementById('nav-stats-2').addEventListener('click', () => showScreen('stats'));
  document.getElementById('nav-settings-2').addEventListener('click', () => showScreen('settings'));
  // Settings screen nav
  document.getElementById('nav-timer-3').addEventListener('click', () => showScreen('timer'));
  document.getElementById('nav-stats-3').addEventListener('click', () => showScreen('stats'));
  document.getElementById('nav-settings-3').addEventListener('click', () => showScreen('settings'));

  // Play button
  playBtn.addEventListener('click', toggleTimer);

  // Save settings
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);

  // Reset chick button + modal
  document.getElementById('reset-chick-btn').addEventListener('click', () => {
    document.getElementById('reset-modal').classList.add('visible');
  });
  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('reset-modal').classList.remove('visible');
  });
  document.getElementById('modal-confirm').addEventListener('click', () => {
    document.getElementById('reset-modal').classList.remove('visible');
    resetChick();
  });
  document.getElementById('reset-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('reset-modal').classList.remove('visible');
    }
  });

  // Clear stats button + modal
  document.getElementById('clear-stats-btn').addEventListener('click', () => {
    document.getElementById('clear-stats-modal').classList.add('visible');
  });
  document.getElementById('clear-stats-cancel').addEventListener('click', () => {
    document.getElementById('clear-stats-modal').classList.remove('visible');
  });
  document.getElementById('clear-stats-confirm').addEventListener('click', () => {
    document.getElementById('clear-stats-modal').classList.remove('visible');
    clearStats();
  });
  document.getElementById('clear-stats-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('clear-stats-modal').classList.remove('visible');
    }
  });

  setupStepperEditing();

  // Hunger pause toggle
  document.getElementById('hunger-pause-btn').addEventListener('click', toggleHungerPause);
}

// ---- Timer Logic ----
function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  isRunning = true;
  showPauseIcon();
  timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
  isRunning = false;
  showPlayIcon();
  clearInterval(timerInterval);
}

function tick() {
  secondsLeft--;
  setTimerDisplay(secondsLeft);
  if (secondsLeft <= 0) {
    timerComplete();
  }
}

function timerComplete() {
  clearInterval(timerInterval);
  isRunning = false;
  showPlayIcon();

  if (currentPhase === 'pomo') {
    // Pomo complete!
    playPomoCompleteSound();
    sendDesktopNotification('🐣 Pomodoro Complete!', 'Great work! Time for a break.');
    triggerBob();
    recordFocusBlock(); // handles hunger decrease, chart update, save
    totalPomosInSession++;

    if (totalPomosInSession >= appData.settings.pomosPerSession) {
      totalPomosInSession = 0;
      currentPomo = 1;
      startPhase('long');
    } else {
      currentPomo++;
      startPhase('short');
    }
  } else {
    // Break complete
    playBreakCompleteSound();
    sendDesktopNotification('⏰ Break Over!', `Back to focus! Starting Pomodoro ${currentPomo}.`);
    startPhase('pomo');
  }
}

function startPhase(phase) {
  currentPhase = phase;
  const s = appData.settings;
  const durations = { pomo: s.pomoDuration, short: s.shortBreak, long: s.longBreak };
  secondsLeft = durations[phase] * 60;
  setTimerDisplay(secondsLeft);
  updatePhaseLabel();
  // Auto-start next phase
  isRunning = true;
  showPauseIcon();
  timerInterval = setInterval(tick, 1000);
}

function setTimerDisplay(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  timerText.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updatePhaseLabel() {
  const s = appData.settings;
  if (currentPhase === 'pomo') {
    phaseLabel.textContent = `POMODORO ${currentPomo}/${s.pomosPerSession}`;
  } else if (currentPhase === 'short') {
    phaseLabel.textContent = 'SHORT BREAK';
  } else {
    phaseLabel.textContent = 'LONG BREAK';
  }
}

// ---- Icons ----
function showPlayIcon() {
  playIcon.src = PLAY_ICON;
  playIcon.style.display = 'block';
  // Remove pause bars if any
  const existing = playBtn.querySelector('.pause-icon');
  if (existing) existing.remove();
  playIcon.style.display = 'block';
}

function showPauseIcon() {
  // Replace img with pause bars
  playIcon.style.display = 'none';
  if (!playBtn.querySelector('.pause-icon')) {
    const pauseEl = document.createElement('div');
    pauseEl.className = 'pause-icon';
    pauseEl.innerHTML = '<div class="pause-bar"></div><div class="pause-bar"></div>';
    playBtn.appendChild(pauseEl);
  }
}

// ---- Chick State ----
// High hunger = sad (chick is hungry!), low hunger = happy (chick has been fed)
function updateChick() {
  let state;
  if (hunger >= 100) state = 'dead';
  else if (hunger <= 30) state = 'happy';
  else if (hunger <= 70) state = 'neutral';
  else state = 'sad';
  chickImg.src = CHICK_IMAGES[state];
}

function updateHungerBar() {
  hungerFill.style.width = Math.min(hunger, 100) + '%';
  let color, statusColor, label;
  if (hunger >= 100) {
    color = '#1d1b16';
    statusColor = '#1d1b16';
    label = 'STATUS: DEAD';
  } else if (hunger <= 30) {
    color = '#006e29';
    statusColor = '#006e29';
    label = 'STATUS: HAPPY';
  } else if (hunger <= 70) {
    color = '#f2c819';
    statusColor = '#f2c819';
    label = 'STATUS: NEUTRAL';
  } else {
    color = '#ba1a1a';
    statusColor = '#93000a';
    label = 'STATUS: STARVING';
  }
  hungerFill.style.background = color;
  statusText.style.background = statusColor;
  statusText.textContent = label;
}

function triggerBob() {
  const container = document.getElementById('chick-container');
  container.classList.remove('bobbing');
  void container.offsetWidth; // reflow
  container.classList.add('bobbing');
  container.addEventListener('animationend', () => {
    container.classList.remove('bobbing');
  }, { once: true });
}

// ---- Notifications ----
async function sendDesktopNotification(title, body) {
  if (window.electronAPI) {
    await window.electronAPI.sendNotification({ title, body });
  }
}

// ---- Data Persistence ----
function recordFocusBlock() {
  if (hunger >= 100) return; // dead chick can't focus
  const today = new Date().toISOString().split('T')[0];
  if (!appData.dailyBlocks[today]) appData.dailyBlocks[today] = 0;
  appData.dailyBlocks[today]++;
  appData.totalFocusMinutes += appData.settings.pomoDuration;
  hunger = Math.max(0, hunger - appData.settings.hungerDecrease);
  appData.hunger = hunger;
  updateHungerBar();
  updateChick();
  saveAppData();
  renderChart();
  updateStatsDisplay();
}

async function saveAppData() {
  appData.hunger = hunger;
  if (window.electronAPI) {
    await window.electronAPI.saveData(appData);
  }
}

function chickDied() {
  hunger = 100;
  appData.hunger = 100;
  appData.totalFocusMinutes = 0;
  appData.dailyBlocks = {};
  appData.birthDate = new Date().toISOString().split('T')[0];
  updateChick();
  updateHungerBar();
  renderChart();
  updateStatsDisplay();
  sendDesktopNotification('💀 Your chick died!', 'Stats have been reset. Feed your chick!');
}

// ---- Settings ----
const SETTING_LIMITS = {
  pomoDuration:    [1, 90],
  shortBreak:      [1, 30],
  longBreak:       [1, 60],
  pomosPerSession: [1, 12],
  hungerDecrease:  [1, 100],
  sessionsPerDay:  [1, 24]
};

function renderSettingsValues() {
  const s = pendingSettings;
  document.getElementById('val-pomoDuration').textContent = s.pomoDuration;
  document.getElementById('val-shortBreak').textContent = s.shortBreak;
  document.getElementById('val-longBreak').textContent = s.longBreak;
  document.getElementById('val-pomosPerSession').textContent = s.pomosPerSession;
  document.getElementById('val-hungerDecrease').textContent = s.hungerDecrease;
  document.getElementById('val-sessionsPerDay').textContent = s.sessionsPerDay;
  const pauseBtn = document.getElementById('hunger-pause-btn');
  if (pauseBtn) pauseBtn.textContent = s.hungerPaused ? 'RESUME HUNGER' : 'PAUSE HUNGER';
}

function clampSetting(key, value) {
  const [min, max] = SETTING_LIMITS[key];
  const n = parseInt(value, 10);
  if (isNaN(n)) return pendingSettings[key];
  return Math.min(max, Math.max(min, n));
}

function adjustSetting(key, delta) {
  pendingSettings[key] = clampSetting(key, (pendingSettings[key] || appData.settings[key]) + delta);
  document.getElementById(`val-${key}`).textContent = pendingSettings[key];
}

function makeStepperEditable(el, key) {
  el.addEventListener('click', () => {
    el.contentEditable = 'true';
    el.focus();
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.blur();
    }
    // Allow only digits and control keys
    if (!/^\d$/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) {
      e.preventDefault();
    }
  });

  el.addEventListener('blur', () => {
    el.contentEditable = 'false';
    pendingSettings[key] = clampSetting(key, el.textContent.trim());
    el.textContent = pendingSettings[key];
  });
}

function setupStepperEditing() {
  Object.keys(SETTING_LIMITS).forEach(key => {
    const el = document.getElementById(`val-${key}`);
    if (el) makeStepperEditable(el, key);
  });
}

function saveSettings() {
  appData.settings = { ...pendingSettings };
  saveAppData();
  applySettings();
  showScreen('timer');
}

function resetChick() {
  hunger = 50;
  appData.hunger = 50;
  appData.lastHungerDate = new Date().toISOString().split('T')[0];
  appData.birthDate = appData.lastHungerDate;
  updateHungerBar();
  updateChick();
  saveAppData();
}

function toggleHungerPause() {
  appData.settings.hungerPaused = !appData.settings.hungerPaused;
  pendingSettings.hungerPaused = appData.settings.hungerPaused;
  saveAppData();
  const pauseBtn = document.getElementById('hunger-pause-btn');
  if (pauseBtn) pauseBtn.textContent = appData.settings.hungerPaused ? 'RESUME HUNGER' : 'PAUSE HUNGER';
}

function clearStats() {
  appData.totalFocusMinutes = 0;
  appData.dailyBlocks = {};
  saveAppData();
  renderChart();
  updateStatsDisplay();
}

function applySettings() {
  pendingSettings = { ...appData.settings };
  // Reset timer if not running
  if (!isRunning) {
    secondsLeft = appData.settings.pomoDuration * 60;
    setTimerDisplay(secondsLeft);
  }
  updatePhaseLabel();
}

// ---- Stats ----
function updateStatsDisplay() {
  const total = appData.totalFocusMinutes;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  document.getElementById('stats-hours').textContent = hours;
  document.getElementById('stats-minutes').textContent = mins;
  const total_pomos = Object.values(appData.dailyBlocks).reduce((a, b) => a + b, 0);
  document.getElementById('stats-pomos').textContent = `${total_pomos} POMODOROS COMPLETED`;
  const birth = appData.birthDate;
  const daysAlive = birth
    ? Math.floor((new Date() - new Date(birth)) / 86400000) + 1
    : 1;
  document.getElementById('stats-days-alive').textContent = `${daysAlive} DAYS ALIVE`;
}

function renderChart() {
  const chartArea = document.getElementById('chart-area');
  chartArea.innerHTML = '';

  // Get past 7 days
  const days = [];
  const today = new Date();
  const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({
      key,
      label: dayNames[d.getDay()],
      count: appData.dailyBlocks[key] || 0,
      isToday: i === 0
    });
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);

  days.forEach(day => {
    const group = document.createElement('div');
    group.className = 'chart-bar-group';

    const countEl = document.createElement('div');
    countEl.className = 'chart-bar-count';
    countEl.textContent = day.count > 0 ? day.count : '';

    const barEl = document.createElement('div');
    barEl.className = 'chart-bar' + (day.isToday ? ' today' : '');
    const pct = day.count / maxCount;
    barEl.style.height = Math.max(pct * 80, day.count > 0 ? 4 : 2) + 'px';

    const dayEl = document.createElement('div');
    dayEl.className = 'chart-day';
    dayEl.textContent = day.label;

    group.appendChild(countEl);
    group.appendChild(barEl);
    group.appendChild(dayEl);
    chartArea.appendChild(group);
  });
}

// ---- Start ----
init();

// Expose globals used by inline onclick in HTML
window.adjustSetting = adjustSetting;
window.toggleHungerPause = toggleHungerPause;