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
let timerInterval = null;
let orientationPermissionGranted = false;
let lastTilt = null;

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

  if (!landscape) {
    setStatus('Draai je telefoon naar landscape');
  } else if (statusText.textContent.includes('Draai je telefoon naar landscape')) {
    setStatus('Hou de telefoon op je voorhoofd');
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
  setStatus('Goed! Volgend woord');
  nextWord();
}

function handlePass() {
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
  setStatus('Hou de telefoon op je voorhoofd');
}

async function startGame() {
  if (!isLandscapeMode()) {
    showScreen(gameScreen);
    isRunning = false;
    orientationNotice.classList.remove('hidden');
    setStatus('Draai je telefoon naar landscape');
    return;
  }

  resetGame();
  showScreen(gameScreen);
  isRunning = true;
  orientationNotice.classList.add('hidden');
  wordCard.classList.add('hidden');
  startTimer();

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

  if (!orientationPermissionGranted && typeof DeviceOrientationEvent !== 'undefined') {
    setStatus('Tilt-sensor is ingeschakeld');
  }

  await lockLandscapeOrientation();
  updateOrientationState();
  await showCountdown();
  nextWord();
}

function endGame() {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  finalScore.textContent = String(score);
  showScreen(endScreen);
}

function stopGame() {
  if (!isRunning) return;
  endGame();
}

function handleOrientation(event) {
  if (!isRunning) {
    updateOrientationState();
    return;
  }

  if (!isLandscapeMode()) {
    updateOrientationState();
    return;
  }

  const beta = Number(event.beta ?? 0);
  const gamma = Number(event.gamma ?? 0);
  const portraitTilt = beta;
  const sideTilt = gamma;

  const isGoodTilt = (portraitTilt > 20 || sideTilt > 24) && Math.abs(sideTilt) < 55;
  const isPassTilt = (portraitTilt < -20 || sideTilt < -24) && Math.abs(sideTilt) < 55;

  if (isGoodTilt && lastTilt !== 'good') {
    lastTilt = 'good';
    setStatus('Goed! Volgend woord');
    handleCorrect();
  } else if (isPassTilt && lastTilt !== 'pass') {
    lastTilt = 'pass';
    setStatus('Pas! Geen punt');
    handlePass();
  } else if (Math.abs(portraitTilt) < 12 && Math.abs(sideTilt) < 12) {
    lastTilt = null;
  }
}

function attachListeners() {
  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  startButton.addEventListener('click', startGame);
  stopButton.addEventListener('click', stopGame);
  restartButton.addEventListener('click', () => {
    startGame();
  });
  homeButton.addEventListener('click', () => {
    showScreen(homeScreen);
  });

  window.addEventListener('deviceorientation', handleOrientation);
  window.addEventListener('orientationchange', updateOrientationState);
}

attachListeners();
