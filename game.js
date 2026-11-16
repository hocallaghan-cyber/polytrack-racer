const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const lapValue = document.getElementById('lapValue');
const positionValue = document.getElementById('positionValue');
const speedValue = document.getElementById('speedValue');
const lapTimeValue = document.getElementById('lapTimeValue');
const fuelValue = document.getElementById('fuelValue');
const tyreValue = document.getElementById('tyreValue');
const statusText = document.getElementById('statusText');
const leaderboardEl = document.getElementById('leaderboard');
const trackSelect = document.getElementById('trackSelect');
const startRaceBtn = document.getElementById('startRaceBtn');

const lapsTotal = 10;
const trackDefinitions = [
  {
    name: 'Silverstone',
    width: 118,
    pitProgress: 0.74,
    points: [
      { x: -200, y: -190 },
      { x: 120, y: -300 },
      { x: 320, y: -260 },
      { x: 480, y: -120 },
      { x: 560, y: 70 },
      { x: 470, y: 240 },
      { x: 260, y: 310 },
      { x: 40, y: 260 },
      { x: -160, y: 320 },
      { x: -360, y: 200 },
      { x: -440, y: 0 },
      { x: -340, y: -180 }
    ]
  },
  {
    name: 'Monaco',
    width: 96,
    pitProgress: 0.52,
    points: [
      { x: 0, y: -260 },
      { x: 220, y: -200 },
      { x: 340, y: -100 },
      { x: 300, y: 120 },
      { x: 170, y: 260 },
      { x: 0, y: 310 },
      { x: -180, y: 240 },
      { x: -330, y: 110 },
      { x: -360, y: -80 },
      { x: -250, y: -220 }
    ]
  },
  {
    name: 'Suzuka',
    width: 120,
    pitProgress: 0.15,
    points: [
      { x: -60, y: -300 },
      { x: 180, y: -260 },
      { x: 350, y: -180 },
      { x: 450, y: -20 },
      { x: 420, y: 180 },
      { x: 260, y: 260 },
      { x: 80, y: 330 },
      { x: -120, y: 260 },
      { x: -260, y: 120 },
      { x: -300, y: -80 },
      { x: -220, y: -260 }
    ]
  },
  {
    name: 'Spa-Francorchamps',
    width: 124,
    pitProgress: 0.24,
    points: [
      { x: -260, y: -300 },
      { x: 30, y: -350 },
      { x: 290, y: -280 },
      { x: 450, y: -120 },
      { x: 480, y: 100 },
      { x: 300, y: 260 },
      { x: 40, y: 280 },
      { x: -160, y: 220 },
      { x: -320, y: 100 },
      { x: -430, y: -40 },
      { x: -430, y: -220 }
    ]
  },
  {
    name: 'Monza',
    width: 110,
    pitProgress: 0.66,
    points: [
      { x: -360, y: -120 },
      { x: -160, y: -240 },
      { x: 160, y: -240 },
      { x: 360, y: -120 },
      { x: 420, y: 80 },
      { x: 300, y: 200 },
      { x: 80, y: 250 },
      { x: -160, y: 230 },
      { x: -330, y: 160 },
      { x: -430, y: 0 }
    ]
  }
];

const colors = ['#74d3ff', '#ff9f43', '#90f17f', '#ff5c8a', '#f4d35e', '#9a7dff', '#9ee4d2', '#ff8d6b', '#ffe66d', '#8ac926'];

function padTime(value) {
  return value.toString().padStart(2, '0');
}

function formatLapTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${padTime(minutes)}:${padTime(seconds)}.${tenths}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function buildTrack(definition) {
  const points = definition.points;
  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segmentLength = Math.hypot(dx, dy);
    const nx = -dy / segmentLength;
    const ny = dx / segmentLength;
    segments.push({ a, b, dx, dy, segmentLength, nx, ny, start: totalLength });
    totalLength += segmentLength;
  }

  const track = {
    ...definition,
    segments,
    totalLength,
    imageCenter: { x: 0, y: 0 }
  };

  track.getPoint = function (progressValue, offset) {
    const progress = ((progressValue % this.totalLength) + this.totalLength) % this.totalLength;
    let seg = null;
    for (const item of this.segments) {
      if (progress >= item.start && progress <= item.start + item.segmentLength + 0.001) {
        seg = item;
        break;
      }
    }

    if (!seg) seg = this.segments[0];

    const localT = clamp((progress - seg.start) / seg.segmentLength, 0, 1);
    const x = lerp(seg.a.x, seg.b.x, localT);
    const y = lerp(seg.a.y, seg.b.y, localT);
    const px = x + seg.nx * offset;
    const py = y + seg.ny * offset;

    return {
      x: px,
      y: py,
      angle: Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x),
      normalX: seg.nx,
      normalY: seg.ny,
      tangentX: (seg.b.x - seg.a.x) / seg.segmentLength,
      tangentY: (seg.b.y - seg.a.y) / seg.segmentLength
    };
  };

  return track;
}

let selectedTrack = buildTrack(trackDefinitions[0]);

function populateTrackOptions() {
  trackSelect.innerHTML = '';
  for (const track of trackDefinitions) {
    const option = document.createElement('option');
    option.value = track.name;
    option.textContent = track.name;
    trackSelect.appendChild(option);
  }
  trackSelect.value = selectedTrack.name;
}

function createCar(name, color, startingProgress, isPlayer = false) {
  return {
    name,
    color,
    progress: startingProgress,
    lap: 1,
    raceDistance: startingProgress,
    speed: 0,
    maxSpeed: isPlayer ? 250 : 220 + Math.random() * 26,
    acceleration: isPlayer ? 180 : 150 + Math.random() * 28,
    brakePower: isPlayer ? 220 : 180,
    turnRate: isPlayer ? 1.2 : 0.85 + Math.random() * 0.25,
    offset: 0,
    steerInput: 0,
    lapTime: 0,
    totalTime: 0,
    bestLap: Infinity,
    lapTimes: [],
    fuel: 100,
    tyre: 100,
    pitting: false,
    pitTimer: 0,
    finished: false,
    status: isPlayer ? 'Ready' : 'Racing',
    needsPit: false,
    totalRaceTime: 0,
    AIControl: !isPlayer,
    isPlayer,
    completedLaps: 0
  };
}

const state = {
  running: false,
  finished: false,
  countdown: 0,
  elapsed: 0,
  player: null,
  ai: [],
  track: selectedTrack,
  camera: { x: 0, y: 0 }
};

const keyState = {};

function resetRace() {
  state.running = false;
  state.finished = false;
  state.elapsed = 0;
  state.player = createCar('Player', '#75d7ff', 0, true);
  state.ai = [];

  for (let i = 0; i < 9; i += 1) {
    const aiOffset = (i * 0.13) - 0.52;
    const car = createCar(`AI ${i + 1}`, colors[i % colors.length], 10 + i * 11.5, false);
    car.progress = (i * 20) % selectedTrack.totalLength;
    car.raceDistance = car.progress;
    car.offset = aiOffset * selectedTrack.width * 0.45;
    car.maxSpeed = 190 + Math.random() * 40;
    car.acceleration = 120 + Math.random() * 30;
    state.ai.push(car);
  }

  state.track = buildTrack(trackDefinitions.find((t) => t.name === trackSelect.value) || trackDefinitions[0]);
  state.player.status = 'Waiting';
  statusText.textContent = 'Grid formed. Press Start Race to begin.';
  updateHUD();
}

function setTrack(name) {
  const nextTrack = trackDefinitions.find((t) => t.name === name) || trackDefinitions[0];
  selectedTrack = nextTrack;
  state.track = buildTrack(nextTrack);
  resetRace();
}

trackSelect.addEventListener('change', (event) => {
  setTrack(event.target.value);
});

startRaceBtn.addEventListener('click', () => {
  if (!state.running && !state.finished) {
    beginRace();
  }
});

function beginRace() {
  state.running = true;
  state.finished = false;
  state.countdown = 3.2;
  state.elapsed = 0;
  statusText.textContent = 'Lights out! Attack the first corner.';
  state.player.lapTime = 0;
  state.player.totalTime = 0;
  state.player.status = 'Racing';

  for (const car of state.ai) {
    car.lapTime = 0;
    car.totalTime = 0;
    car.status = 'Racing';
  }
}

function updatePlayerCar(dt) {
  const player = state.player;
  const track = state.track;

  if (!player) return;

  const throttle = keyState['KeyW'] || keyState['ArrowUp'] ? 1 : 0;
  const brake = keyState['KeyS'] || keyState['ArrowDown'] ? 1 : 0;
  const steerLeft = keyState['KeyA'] || keyState['ArrowLeft'] ? -1 : 0;
  const steerRight = keyState['KeyD'] || keyState['ArrowRight'] ? 1 : 0;
  const steerInput = steerLeft + steerRight;

  if (player.pitting) {
    player.speed *= 0.75;
    player.pitTimer -= dt;
    if (player.pitTimer <= 0) {
      player.pitting = false;
      player.fuel = 100;
      player.tyre = 100;
      player.needsPit = false;
      player.status = 'Pit stop complete';
      statusText.textContent = 'Pit stop complete. Tires & fuel topped up.';
    }
    return;
  }

  if (throttle) {
    player.speed += player.acceleration * dt;
  } else {
    player.speed -= 65 * dt;
  }

  if (brake) {
    player.speed -= player.brakePower * dt;
  }

  player.speed -= 18 * dt;
  player.speed = clamp(player.speed, 0, player.maxSpeed);

  if (player.fuel <= 0) {
    player.speed -= 85 * dt;
  }

  if (player.tyre <= 0.1) {
    player.speed -= 110 * dt;
  }

  const trackPoint = track.getPoint(player.progress, player.offset);
  const inPitZone = Math.abs(((player.progress - track.pitProgress * track.totalLength + track.totalLength) % track.totalLength) - 0.75 * track.totalLength) < 65;

  if (inPitZone && player.speed < 18 && (keyState['KeyP'] || player.needsPit)) {
    player.pitting = true;
    player.pitTimer = 2.6;
    player.status = 'Pit stop';
    statusText.textContent = 'Pit lane engaged. Hold position for a 2.6s stop.';
    return;
  }

  if (inPitZone && player.speed >= 18) {
    player.speed *= 0.97;
  }

  player.steerInput = steerInput;
  player.offset += steerInput * player.turnRate * (player.speed / Math.max(100, player.maxSpeed)) * 120 * dt;
  player.offset = clamp(player.offset, -(track.width * 0.57), track.width * 0.57);

  if (player.fuel > 0) {
    player.fuel -= dt * (0.9 + player.speed / 260);
  }
  player.fuel = clamp(player.fuel, 0, 100);

  if (player.tyre > 0) {
    player.tyre -= dt * (0.3 + Math.abs(player.speed) / 320);
  }
  player.tyre = clamp(player.tyre, 0, 100);

  if (player.fuel < 17 || player.tyre < 22) {
    player.needsPit = true;
    player.status = 'Pit required';
  } else {
    player.needsPit = false;
    if (player.speed > 10) player.status = 'Racing';
  }

  const lapSpeedFactor = 1 + (Math.abs(player.offset) / (track.width * 0.57)) * 0.4;
  player.progress += (player.speed * dt * 1.6) / lapSpeedFactor;
  player.progress = ((player.progress % track.totalLength) + track.totalLength) % track.totalLength;

  const previousLap = player.lap;
  if (player.progress < 50 && previousLap > 0 && player.totalTime > 0 && player.lapTime > 0) {
    const lapTime = player.totalTime;
    player.lapTimes.push(lapTime);
    player.bestLap = player.bestLap === Infinity ? lapTime : Math.min(player.bestLap, lapTime);
    player.completedLaps += 1;
    if (player.completedLaps >= lapsTotal) {
      player.finished = true;
      player.status = 'Finished';
      state.finished = true;
      state.running = false;
      statusText.textContent = 'Finish! You completed 10 laps.';
    }
    player.lap += 1;
    if (player.lap > lapsTotal) {
      player.lap = lapsTotal;
    }
    player.totalTime = 0;
  }

  if (player.finished) {
    return;
  }

  player.totalTime += dt * 1000;
  player.lapTime += dt * 1000;
  player.raceDistance = (player.lap - 1) * track.totalLength + player.progress;
  if (player.lap > lapsTotal) {
    player.lap = lapsTotal;
  }
}

function updateAICars(dt) {
  for (const car of state.ai) {
    if (state.finished) break;

    if (car.finished) continue;

    const track = state.track;
    const targetSpeed = car.maxSpeed * (0.74 + Math.random() * 0.26);
    const driftBias = Math.sin((car.progress * 0.01) + car.name.length) * 0.7;

    car.speed += (targetSpeed - car.speed) * dt * 1.2;
    car.speed = clamp(car.speed, 80, car.maxSpeed);
    car.offset += driftBias * dt * 20;
    car.offset = clamp(car.offset, -(track.width * 0.5), track.width * 0.5);

    const lapFactor = 1 + ((Math.abs(car.offset) / (track.width * 0.5)) * 0.5);
    car.progress += (car.speed * dt * 1.5) / lapFactor;
    car.progress = ((car.progress % track.totalLength) + track.totalLength) % track.totalLength;

    const previousLap = car.lap;
    if (car.progress < 40 && previousLap > 0 && car.totalTime > 0 && car.lapTime > 0) {
      const lapTime = car.totalTime;
      car.lapTimes.push(lapTime);
      car.bestLap = car.bestLap === Infinity ? lapTime : Math.min(car.bestLap, lapTime);
      car.totalTime = 0;
      car.completedLaps += 1;
      car.lap += 1;
      if (car.completedLaps >= lapsTotal) {
        car.finished = true;
        car.status = 'Finished';
      }
    }

    car.totalTime += dt * 1000;
    car.lapTime += dt * 1000;
    car.raceDistance = (car.lap - 1) * track.totalLength + car.progress;
  }
}

function updateHUD() {
  const player = state.player;
  if (!player) return;

  lapValue.textContent = `${Math.min(player.lap, lapsTotal)} / ${lapsTotal}`;
  positionValue.textContent = `${getPlayerPosition()} / 10`;
  speedValue.textContent = `${Math.round(player.speed * 1.6)} km/h`;
  lapTimeValue.textContent = formatLapTime(player.lapTime);
  fuelValue.textContent = `${Math.round(player.fuel)}%`;
  tyreValue.textContent = `${Math.round(player.tyre)}%`;

  if (player.needsPit) {
    statusText.textContent = 'PIT NOW: fuel or tyres critically low.';
  }

  updateLeaderboard();
}

function getPlayerPosition() {
  const racers = [state.player, ...state.ai];
  const ranked = racers.slice().sort((a, b) => {
    const aValue = a.finished ? (lapsTotal + 1) * state.track.totalLength : (a.lap - 1) * state.track.totalLength + a.progress;
    const bValue = b.finished ? (lapsTotal + 1) * state.track.totalLength : (b.lap - 1) * state.track.totalLength + b.progress;
    return bValue - aValue;
  });

  return ranked.findIndex((car) => car === state.player) + 1;
}

function updateLeaderboard() {
  const racers = [state.player, ...state.ai].filter(Boolean);
  const ranked = racers.slice().sort((a, b) => {
    const aValue = a.finished ? (lapsTotal + 1) * state.track.totalLength : (a.lap - 1) * state.track.totalLength + a.progress;
    const bValue = b.finished ? (lapsTotal + 1) * state.track.totalLength : (b.lap - 1) * state.track.totalLength + b.progress;
    return bValue - aValue;
  });

  leaderboardEl.innerHTML = '';

  ranked.forEach((car, index) => {
    const li = document.createElement('li');
    li.className = car.isPlayer ? 'player' : '';

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = `${index + 1}. ${car.name}`;

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = car.isPlayer ? formatLapTime(car.lapTime) : `${car.lap - 1}/${lapsTotal}`;

    li.appendChild(name);
    li.appendChild(time);
    leaderboardEl.appendChild(li);
  });
}

function drawTrack(track) {
  ctx.save();

  const trackPoints = track.points.map((point) => {
    const world = worldToScreen(point.x, point.y);
    return world;
  });

  ctx.beginPath();
  ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
  for (let i = 1; i < trackPoints.length; i += 1) {
    ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = '#3f8f46';
  ctx.fill();

  ctx.lineWidth = track.width + 18;
  ctx.strokeStyle = '#2b2b2b';
  ctx.stroke();

  ctx.lineWidth = track.width;
  ctx.strokeStyle = '#d8d8d8';
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffdb5e';
  ctx.setLineDash([20, 18]);
  ctx.stroke();
  ctx.setLineDash([]);

  const pitProgress = track.pitProgress * track.totalLength;
  const pitA = track.getPoint(pitProgress, 0);
  const pitB = track.getPoint(pitProgress + 45, 0);
  const screenA = worldToScreen(pitA.x, pitA.y);
  const screenB = worldToScreen(pitB.x, pitB.y);
  ctx.beginPath();
  ctx.moveTo(screenA.x, screenA.y);
  ctx.lineTo(screenB.x, screenB.y);
  ctx.strokeStyle = '#ff9f1c';
  ctx.lineWidth = 9;
  ctx.stroke();

  ctx.restore();
}

function worldToScreen(x, y) {
  const cam = state.camera;
  return {
    x: x - cam.x + canvas.width / 2,
    y: y - cam.y + canvas.height / 2
  };
}

function renderCar(car, isPlayer = false) {
  const track = state.track;
  const pos = track.getPoint(car.progress, car.offset);
  const screen = worldToScreen(pos.x, pos.y);
  const angle = Math.atan2(pos.tangentY, pos.tangentX) + Math.PI / 2;

  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(angle);

  ctx.fillStyle = car.color;
  ctx.fillRect(-12, -18, 24, 36);

  ctx.fillStyle = '#10181f';
  ctx.fillRect(-6, -22, 12, 6);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-8, 14, 16, 4);

  if (isPlayer) {
    ctx.strokeStyle = '#f5f4d0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -20, 28, 40);
  }

  ctx.restore();
}

function drawHUDMarkers() {
  const player = state.player;
  if (!player) return;

  const p = state.track.getPoint(player.progress, player.offset);
  const screen = worldToScreen(p.x, p.y);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText('YOU', screen.x + 18, screen.y - 20);
  ctx.restore();
}

function drawFinishBanner() {
  if (!state.finished) return;

  const playerRank = getPlayerPosition();
  const message = playerRank === 1 ? 'Victory! You beat the 9 AI.' : 'Race complete. You finished ' + playerRank + 'th.';

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(canvas.width / 2 - 220, 30, 440, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message, canvas.width / 2, 82);
  ctx.restore();
}

function updateCamera() {
  const player = state.player;
  if (!player) return;
  const pos = state.track.getPoint(player.progress, player.offset);
  state.camera.x = pos.x;
  state.camera.y = pos.y;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#7cd07d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTrack(state.track);

  for (const car of state.ai) {
    renderCar(car, false);
  }

  if (state.player) {
    renderCar(state.player, true);
    drawHUDMarkers();
  }

  drawFinishBanner();
}

function update(dt) {
  if (state.running) {
    if (state.countdown > 0) {
      state.countdown -= dt;
      if (state.countdown <= 0) {
        state.countdown = 0;
      }
      return;
    }

    state.elapsed += dt;
    updatePlayerCar(dt);
    updateAICars(dt);
    updateCamera();
    updateHUD();

    if (state.finished) {
      state.running = false;
      updateLeaderboard();
    }
  } else {
    updateHUD();
  }

  render();
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;
  update(dt);
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  keyState[event.code] = true;
});

window.addEventListener('keyup', (event) => {
  keyState[event.code] = false;
});

populateTrackOptions();
resetRace();
requestAnimationFrame(gameLoop);
