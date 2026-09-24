const MODE_WORDS = {
  kids: [
    'Teddybeer', 'Pirate', 'Dino', 'Tuin', 'Banaan', 'Piraat', 'Auto', 'Luchtballon', 'Aap', 'Kikker',
    'Vliegtuig', 'Piano', 'Schoen', 'Juf', 'Kasteel', 'Maan', 'Zon', 'Vissen', 'Tijger', 'Olifant',
    'Puppy', 'Ballet', 'Puzzel', 'Sneeuwman', 'Zebra', 'Brandweer', 'Pasta', 'Kerstboom', 'Baker', 'School'
  ],
  adults: [
    'Film', 'Boodschap', 'Piano', 'Laptop', 'Zwemmen', 'Aloha', 'Berg', 'Restaurant', 'Koffie', 'Vakantie',
    'Sport', 'Bureau', 'Boot', 'Kerstmis', 'Aardbeien', 'Winkel', 'Parachute', 'Bruiloft', 'Trein', 'Taxi',
    'Muziek', 'Spiegel', 'Wolk', 'Regen', 'Hotel', 'Theater', 'Tennis', 'Bioscoop', 'Wandelen', 'Licht'
  ]
};

const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const passButton = document.getElementById('passButton');
const goodButton = document.getElementById('goodButton');
const restartButton = document.getElementById('restartButton');
const homeButton = document.getElementById('homeButton');
const scoreValue = document.getElementById('scoreValue');
const timerValue = document.getElementById('timerValue');
const wordText = document.getElementById('wordText');
const wordCard = document.getElementById('wordCard');
const countdownEl = document.getElementById('countdown');
const statusText = document.getElementById('statusText');
const finalScore = document.getElementById('finalScore');
const orientationNotice = document.getElementById('orientationNotice');
const modeButtons = document.querySelectorAll('.mode-btn');
const timerBox = document.querySelector('.timer-box');
const finalDetail = document.getElementById('finalDetail');
const finalRecord = document.getElementById('finalRecord');
const homeHighscore = document.getElementById('homeHighscore');
const timeButtons = document.querySelectorAll('.time-btn');

let selectedMode = 'kids';
let selectedTime = 90;
let score = 0;
let passCount = 0;
let timeLeft = 90;
let currentWords = [];
let currentIndex = 0;
let isRunning = false;
let roundActive = false;
let startingRound = false;
let timerInterval = null;
let orientationPermissionGranted = false;
let lastTilt = null;
let audioContext = null;

function highscoreKey(mode) {
  return `napoleon_highscore_${mode}`;
}

function getHighscore(mode) {
  try {
    return Number(localStorage.getItem(highscoreKey(mode))) || 0;
  } catch (error) {
    return 0;
  }
}

function setHighscore(mode, value) {
  try {
    localStorage.setItem(highscoreKey(mode), String(value));
  } catch (error) {
    // storage may be unavailable in private mode; ignore.
  }
}

function updateHighscoreDisplay() {
  if (homeHighscore) {
    homeHighscore.textContent = `Highscore: ${getHighscore(selectedMode)}`;
  }
}

function syncViewportMetrics() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
    }
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playTone(frequency, duration, volume, type = 'sine') {
  if (!audioContext) {
    ensureAudioContext();
  }

  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
}

function setMode(mode) {
  selectedMode = mode;
  modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
  updateHighscoreDisplay();
}

function setTime(seconds) {
  selectedTime = seconds;
  timeButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.time) === seconds);
  });
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(screen) {
  [homeScreen, gameScreen, endScreen].forEach((element) => {
    element.classList.toggle('visible', element === screen);
    element.classList.toggle('hidden', element !== screen);
  });
}

function isLandscapeMode() {
  if (window.matchMedia) {
    return window.matchMedia('(orientation: landscape)').matches;
  }

  return true;
}

function updateOrientationState() {
  if (!isRunning) {
    orientationNotice.classList.add('hidden');
    return;
  }

  const landscape = isLandscapeMode();
  orientationNotice.classList.toggle('hidden', landscape);

  if (landscape) {
    if (!roundActive && !startingRound) {
      beginRound();
    }
  } else {
    setStatus('Draai je telefoon naar landscape');
  }
}

async function lockLandscapeOrientation() {
  try {
    if (screen && screen.orientation && typeof screen.orientation.lock === 'function') {
      await screen.orientation.lock('landscape');
    }
  } catch (error) {
    // Safari may reject locking; this is safe to ignore.
  }
}

function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timerValue.textContent = String(Math.max(0, timeLeft));

    if (timerBox) {
      timerBox.classList.toggle('low', timeLeft <= 10);
    }

    if (timeLeft <= 10 && timeLeft > 0) {
      playTone(880, 0.05, 0.03, 'square');
    }

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function flashFeedback(type) {
  gameScreen.classList.remove('flash-good', 'flash-pass');
  // force reflow so the animation restarts on rapid taps
  void gameScreen.offsetWidth;
  gameScreen.classList.add(type === 'good' ? 'flash-good' : 'flash-pass');
  setTimeout(() => {
    gameScreen.classList.remove('flash-good', 'flash-pass');
  }, 260);
}

function setStatus(message) {
  statusText.textContent = message;
  statusText.classList.remove('good', 'pass');
  if (message.includes('Goed')) {
    statusText.classList.add('good');
  } else if (message.includes('Pas')) {
    statusText.classList.add('pass');
  }
}

function showCountdown() {
  return new Promise((resolve) => {
    countdownEl.classList.add('visible');
    const values = [3, 2, 1];
    let index = 0;

    function tick() {
      countdownEl.textContent = String(values[index]);
      if (index < values.length - 1) {
        index += 1;
        setTimeout(tick, 650);
      } else {
        setTimeout(() => {
          countdownEl.classList.remove('visible');
          resolve();
        }, 650);
      }
    }

    tick();
  });
}

function nextWord() {
  if (!isRunning) return;

  if (currentIndex >= currentWords.length) {
    currentWords = shuffle(MODE_WORDS[selectedMode]);
    currentIndex = 0;
  }

  wordText.textContent = currentWords[currentIndex];
  wordCard.classList.remove('hidden');
  currentIndex += 1;
}

function updateScore() {
  scoreValue.textContent = String(score);
}

function handleCorrect() {
  if (!roundActive) return;
  score += 1;
  updateScore();
  ensureAudioContext();
  playTone(660, 0.08, 0.06, 'triangle');
  playTone(990, 0.14, 0.05, 'triangle');
  flashFeedback('good');
  setStatus('Goed! Volgend woord');
  nextWord();
}

function handlePass() {
  if (!roundActive) return;
  passCount += 1;
  ensureAudioContext();
  playTone(220, 0.18, 0.05, 'sawtooth');
  playTone(160, 0.2, 0.04, 'sawtooth');
  flashFeedback('pass');
  setStatus('Pas! Geen punt');
  nextWord();
}

function resetGame() {
  score = 0;
  passCount = 0;
  timeLeft = selectedTime;
  currentIndex = 0;
  currentWords = shuffle(MODE_WORDS[selectedMode]);
  scoreValue.textContent = '0';
  timerValue.textContent = String(selectedTime);
  if (timerBox) {
    timerBox.classList.remove('low');
  }
  lastTilt = null;
  roundActive = false;
  startingRound = false;
  wordCard.classList.add('hidden');
  setStatus('Hou de telefoon op je voorhoofd');
}

async function beginRound() {
  if (roundActive || startingRound || !isRunning) return;
  if (!isLandscapeMode()) return;

  startingRound = true;
  orientationNotice.classList.add('hidden');
  wordCard.classList.add('hidden');
  await showCountdown();

  if (!isRunning) {
    startingRound = false;
    return;
  }

  roundActive = true;
  startingRound = false;
  setStatus('Hou de telefoon op je voorhoofd');
  nextWord();
  startTimer();
}

async function startGame() {
  resetGame();
  showScreen(gameScreen);
  isRunning = true;

  ensureAudioContext();

  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    if (!orientationPermissionGranted) {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        orientationPermissionGranted = response === 'granted';
      } catch (error) {
        orientationPermissionGranted = false;
      }
    }
  }

  await lockLandscapeOrientation();

  if (isLandscapeMode()) {
    orientationNotice.classList.add('hidden');
    beginRound();
  } else {
    orientationNotice.classList.remove('hidden');
    setStatus('Draai je telefoon naar landscape');
  }
}

function endGame() {
  isRunning = false;
  roundActive = false;
  startingRound = false;
  clearInterval(timerInterval);
  timerInterval = null;
  finalScore.textContent = String(score);
  if (finalDetail) {
    finalDetail.textContent = `${score} goed \u00b7 ${passCount} gepast`;
  }

  const previousBest = getHighscore(selectedMode);
  const isRecord = score > previousBest;
  if (isRecord) {
    setHighscore(selectedMode, score);
  }
  if (finalRecord) {
    finalRecord.classList.toggle('hidden', !isRecord || score === 0);
  }
  updateHighscoreDisplay();

  if (timerBox) {
    timerBox.classList.remove('low');
  }
  orientationNotice.classList.add('hidden');
  showScreen(endScreen);
}

function stopGame() {
  if (!isRunning) return;
  endGame();
}

function handleOrientation() {
  updateOrientationState();
}

function attachListeners() {
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  timeButtons.forEach((button) => {
    button.addEventListener('click', () => setTime(Number(button.dataset.time)));
  });

  startButton.addEventListener('click', startGame);
  stopButton.addEventListener('click', stopGame);
  passButton.addEventListener('click', handlePass);
  goodButton.addEventListener('click', handleCorrect);
  restartButton.addEventListener('click', () => {
    startGame();
  });
  homeButton.addEventListener('click', () => {
    if (isRunning) {
      endGame();
    }
    showScreen(homeScreen);
  });

  window.addEventListener('orientationchange', updateOrientationState);
  window.addEventListener('resize', () => {
    syncViewportMetrics();
    updateOrientationState();
  });

  syncViewportMetrics();
  updateHighscoreDisplay();
}

attachListeners();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
