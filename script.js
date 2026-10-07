const canvas = document.getElementById("plate-canvas");
const ctx = canvas.getContext("2d");

const modeReadout = document.getElementById("mode-readout");
const freqReadout = document.getElementById("freq-readout");
const freqSlider = document.getElementById("freq-slider");
const freqBadge = document.getElementById("freq-badge");
const ampSlider = document.getElementById("amplitude-slider");
const ampBadge = document.getElementById("amp-badge");
const dampSlider = document.getElementById("damping-slider");
const dampBadge = document.getElementById("damp-badge");
const presetButtons = document.querySelectorAll(".preset-btn");
const scatterBtn = document.getElementById("scatter-btn");
const audioBtn = document.getElementById("audio-btn");

// Plate Geometry (Square vibrating surface)
let plate = {
  size: 520,
  x: 0,
  y: 0
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  plate.size = Math.min(canvas.width, canvas.height) * 0.72;
  plate.x = (canvas.width - plate.size) / 2;
  plate.y = (canvas.height - plate.size) / 2;
}
window.addEventListener("resize", resize);
resize();

// Simulation State
let m = 3;
let n = 5;
let frequency = 432;
let amplitude = 1.4;
let damping = 0.92;
let wavePhase = 0;

// Cursor Local Damping
let cursorTouch = { x: -999, y: -999, active: false };

// Web Audio API Synthesizer (Acoustic Chladni Transducer)
let audioCtx = null;
let toneOsc = null;
let toneGain = null;
let isAudioActive = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  toneOsc = audioCtx.createOscillator();
  toneOsc.type = "sine";
  toneOsc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

  toneGain = audioCtx.createGain();
  toneGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

  toneOsc.connect(toneGain);
  toneGain.connect(audioCtx.destination);
  toneOsc.start();
}

function updateToneFrequency(f) {
  if (toneOsc && audioCtx) {
    toneOsc.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.05);
  }
}

// 2D Chladni Wave Equation: w(x, y) = a*sin(n*pi*x/L)*sin(m*pi*y/L) - b*sin(m*pi*x/L)*sin(n*pi*y/L)
function getPlateDisplacement(normX, normY) {
  const PI = Math.PI;
  const t1 = Math.sin(n * PI * normX) * Math.sin(m * PI * normY);
  const t2 = Math.sin(m * PI * normX) * Math.sin(n * PI * normY);
  return (t1 - t2);
}

// 25,000 Resonant Sand Grains
const NUM_GRAINS = 26000;
const grainX = new Float32Array(NUM_GRAINS);
const grainY = new Float32Array(NUM_GRAINS);
const grainVx = new Float32Array(NUM_GRAINS);
const grainVy = new Float32Array(NUM_GRAINS);

function scatterGrains() {
  for (let i = 0; i < NUM_GRAINS; i++) {
    grainX[i] = plate.x + Math.random() * plate.size;
    grainY[i] = plate.y + Math.random() * plate.size;
    grainVx[i] = (Math.random() - 0.5) * 1.5;
    grainVy[i] = (Math.random() - 0.5) * 1.5;
  }
}
scatterGrains();

// Update Physics & Render
function animate() {
  wavePhase += (frequency * 0.0001);

  // Soft clear with dark steel backdrop
  ctx.fillStyle = "rgba(3, 4, 8, 0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Resonating Metallic Plate
  ctx.save();
  ctx.fillStyle = "#070b14";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 18;
  ctx.strokeRect(plate.x, plate.y, plate.size, plate.size);
  ctx.fillRect(plate.x, plate.y, plate.size, plate.size);
  ctx.restore();

  // 2. Physics Update for Sand Grains
  const delta = 0.008;
  const pSize = plate.size;
  const px = plate.x;
  const py = plate.y;

  ctx.fillStyle = "#38bdf8";
  for (let i = 0; i < NUM_GRAINS; i++) {
    const x = grainX[i];
    const y = grainY[i];

    // Normalized coordinates on plate [0, 1]
    const nx = (x - px) / pSize;
    const ny = (y - py) / pSize;

    if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
      // Numerical gradient of wave vibration displacement
      const wCenter = getPlateDisplacement(nx, ny);
      const wRight = getPlateDisplacement(nx + delta, ny);
      const wDown = getPlateDisplacement(nx, ny + delta);

      // Force pushes grains away from high vibration (anti-nodes) toward nodal lines (w = 0)
      const gradX = (Math.abs(wRight) - Math.abs(wCenter)) / delta;
      const gradY = (Math.abs(wDown) - Math.abs(wCenter)) / delta;

      const vibrationForce = amplitude * 3.6;
      grainVx[i] -= gradX * vibrationForce;
      grainVy[i] -= gradY * vibrationForce;

      // Stochastic Brownian jitter when on vibrating surface
      const jitter = Math.abs(wCenter) * amplitude * 1.8;
      grainVx[i] += (Math.random() - 0.5) * jitter;
      grainVy[i] += (Math.random() - 0.5) * jitter;

      // Finger contact local damping
      if (cursorTouch.active) {
        const d = Math.hypot(x - cursorTouch.x, y - cursorTouch.y);
        if (d < 45) {
          grainVx[i] *= 0.7;
          grainVy[i] *= 0.7;
        }
      }
    }

    // Velocity integration with plate friction damping
    grainVx[i] *= damping;
    grainVy[i] *= damping;
    grainX[i] += grainVx[i];
    grainY[i] += grainVy[i];

    // Boundary bounces inside plate borders
    if (grainX[i] < px) { grainX[i] = px; grainVx[i] *= -0.5; }
    if (grainX[i] > px + pSize) { grainX[i] = px + pSize; grainVx[i] *= -0.5; }
    if (grainY[i] < py) { grainY[i] = py; grainVy[i] *= -0.5; }
    if (grainY[i] > py + pSize) { grainY[i] = py + pSize; grainVy[i] *= -0.5; }

    // Direct pixel rendering for 26,000 particles at 60 FPS
    ctx.fillRect(grainX[i], grainY[i], 1.4, 1.4);
  }

  // Draw Finger Damping Indicator
  if (cursorTouch.active) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cursorTouch.x, cursorTouch.y, 45, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  requestAnimationFrame(animate);
}
animate();

// Pointer Events for Damping
canvas.addEventListener("mousedown", (e) => {
  if (e.target.closest(".control-deck, .hud-top")) return;
  cursorTouch.active = true;
  cursorTouch.x = e.clientX;
  cursorTouch.y = e.clientY;
});

window.addEventListener("mousemove", (e) => {
  if (cursorTouch.active) {
    cursorTouch.x = e.clientX;
    cursorTouch.y = e.clientY;
  }
});

window.addEventListener("mouseup", () => {
  cursorTouch.active = false;
});

// Touch Device Support
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    cursorTouch.active = true;
    cursorTouch.x = e.touches[0].clientX;
    cursorTouch.y = e.touches[0].clientY;
  }
});

window.addEventListener("touchmove", (e) => {
  if (cursorTouch.active && e.touches.length === 1) {
    cursorTouch.x = e.touches[0].clientX;
    cursorTouch.y = e.touches[0].clientY;
  }
});

window.addEventListener("touchend", () => {
  cursorTouch.active = false;
});

// UI Event Handlers
freqSlider.addEventListener("input", (e) => {
  frequency = parseInt(e.target.value);
  freqBadge.textContent = `${frequency} Hz`;
  freqReadout.textContent = `${frequency} Hz`;
  updateToneFrequency(frequency);

  // Dynamically map frequency to nearest modal harmonics
  m = 1 + Math.floor((frequency / 1100) * 6);
  n = 2 + Math.floor((frequency / 1100) * 8);
  modeReadout.textContent = `m=${m}, n=${n}`;
});

ampSlider.addEventListener("input", (e) => {
  amplitude = parseFloat(e.target.value);
  ampBadge.textContent = `${amplitude.toFixed(1)}x`;
});

dampSlider.addEventListener("input", (e) => {
  damping = parseFloat(e.target.value);
  dampBadge.textContent = damping.toFixed(2);
});

presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    presetButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    m = parseInt(btn.dataset.m);
    n = parseInt(btn.dataset.n);
    frequency = parseInt(btn.dataset.freq);

    freqSlider.value = frequency;
    freqBadge.textContent = `${frequency} Hz`;
    freqReadout.textContent = `${frequency} Hz`;
    modeReadout.textContent = `m=${m}, n=${n}`;
    updateToneFrequency(frequency);
  });
});

scatterBtn.addEventListener("click", scatterGrains);

audioBtn.addEventListener("click", () => {
  initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();

  isAudioActive = !isAudioActive;
  audioBtn.textContent = isAudioActive ? "🔊 Tone: ON" : "🔇 Tone: OFF";
  audioBtn.classList.toggle("active-audio", isAudioActive);

  if (!isAudioActive && toneGain) {
    toneGain.gain.setValueAtTime(0, audioCtx.currentTime);
  } else if (toneGain) {
    toneGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  }
});