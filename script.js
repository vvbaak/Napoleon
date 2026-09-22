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

let selectedMode = 'kids';
let score = 0;
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

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
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
  score += 1;
  updateScore();
  ensureAudioContext();
  playTone(740, 0.12, 0.06, 'triangle');
  setStatus('Goed! Volgend woord');
  nextWord();
}

function handlePass() {
  ensureAudioContext();
  playTone(180, 0.16, 0.04, 'sawtooth');
  setStatus('Pas! Geen punt');
  nextWord();
}

function resetGame() {
  score = 0;
  timeLeft = 90;
  currentIndex = 0;
  currentWords = shuffle(MODE_WORDS[selectedMode]);
  scoreValue.textContent = '0';
  timerValue.textContent = '90';
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
}

attachListeners();
