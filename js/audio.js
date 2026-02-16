/* =========================================================
   AUDIO - Ambient soundscape that reflects emotional state

   Sound Design Philosophy:
   - Heartbeat: Subtle, rhythmic pulse synced to BPM
   - Drone: Low frequency base that shifts with valence
     - Positive valence: Warm, major harmonics
     - Negative valence: Dark, minor/dissonant harmonics
   - Texture: High frequency content based on arousal
     - Low arousal: Soft, smooth, quiet
     - High arousal: Bright, active, intense
   - Stage transitions: Sounds evolve with life stages

   Stage 1 (Age): Simple heartbeat, grows more complex
   Stage 2 (Emotion): Full emotional soundscape
   Stage 3 (Relationship): Harmonics for two beings
   Stage 4 (Death): Fade to silence
========================================================= */

let _audioCtx = null;
let _audioInitialized = false;
let _audioEnabled = true;
let _masterGain = null;

// Sound components
let _heartbeatOsc = null;
let _heartbeatGain = null;
let _nextBeatTime = 0;

let _droneOscs = [];
let _droneGains = [];
let _droneFilter = null;

let _textureNoise = null;
let _textureGain = null;
let _textureFilter = null;

let _reverbConvolver = null;
let _reverbGain = null;

// Current audio state (smoothed)
let _audioState = {
  bpm: 72,
  arousal: 0.2,
  valence: 0.5,
  proximity: 0,
  stage: 1
};

// Target state for smooth interpolation
let _targetState = {
  bpm: 72,
  arousal: 0.2,
  valence: 0.5,
  proximity: 0,
  stage: 1
};

/* ============================================================
   INITIALIZATION
============================================================ */

function initAudio() {
  if (_audioInitialized) return;

  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain
    _masterGain = _audioCtx.createGain();
    _masterGain.gain.value = 0.35;
    _masterGain.connect(_audioCtx.destination);

    // Create reverb
    _createReverb();

    // Create drone (emotional base)
    _createDrone();

    // Create texture (arousal-based noise)
    _createTexture();

    // Create heartbeat
    _createHeartbeat();

    _audioInitialized = true;
    console.log('Audio initialized');

  } catch (e) {
    console.warn('Web Audio API not supported:', e);
    _audioEnabled = false;
  }
}

function _createReverb() {
  // Simple reverb using delay feedback
  _reverbConvolver = _audioCtx.createConvolver();
  _reverbGain = _audioCtx.createGain();
  _reverbGain.gain.value = 0.3;

  // Create impulse response for reverb
  const length = _audioCtx.sampleRate * 2.5;
  const impulse = _audioCtx.createBuffer(2, length, _audioCtx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Exponential decay with some randomness
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }

  _reverbConvolver.buffer = impulse;
  _reverbConvolver.connect(_reverbGain);
  _reverbGain.connect(_masterGain);
}

function _createDrone() {
  // Multiple oscillators for rich drone
  // Base frequencies based on a calm C major (positive) shifting to C minor (negative)
  const baseFreqs = [65.41, 98.00, 130.81, 196.00]; // C2, G2, C3, G3

  _droneFilter = _audioCtx.createBiquadFilter();
  _droneFilter.type = 'lowpass';
  _droneFilter.frequency.value = 400;
  _droneFilter.Q.value = 1;
  _droneFilter.connect(_reverbConvolver);
  _droneFilter.connect(_masterGain);

  for (let i = 0; i < baseFreqs.length; i++) {
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();

    osc.type = i < 2 ? 'sine' : 'triangle';
    osc.frequency.value = baseFreqs[i];
    gain.gain.value = 0.08 / (i + 1); // Quieter higher harmonics

    osc.connect(gain);
    gain.connect(_droneFilter);
    osc.start();

    _droneOscs.push(osc);
    _droneGains.push(gain);
  }
}

function _createTexture() {
  // Filtered noise for texture/atmosphere
  const bufferSize = 2 * _audioCtx.sampleRate;
  const noiseBuffer = _audioCtx.createBuffer(1, bufferSize, _audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  // Pink-ish noise (more natural than white noise)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  _textureNoise = _audioCtx.createBufferSource();
  _textureNoise.buffer = noiseBuffer;
  _textureNoise.loop = true;

  _textureGain = _audioCtx.createGain();
  _textureGain.gain.value = 0.02;

  _textureFilter = _audioCtx.createBiquadFilter();
  _textureFilter.type = 'bandpass';
  _textureFilter.frequency.value = 800;
  _textureFilter.Q.value = 0.5;

  _textureNoise.connect(_textureFilter);
  _textureFilter.connect(_textureGain);
  _textureGain.connect(_reverbConvolver);
  _textureGain.connect(_masterGain);

  _textureNoise.start();
}

function _createHeartbeat() {
  // Heartbeat is triggered rhythmically, not continuous
  _heartbeatGain = _audioCtx.createGain();
  _heartbeatGain.gain.value = 0;
  _heartbeatGain.connect(_masterGain);
}

/* ============================================================
   HEARTBEAT - Rhythmic pulse synced to BPM
============================================================ */

function _triggerHeartbeat(time, intensity) {
  if (!_audioCtx || !_audioEnabled) return;

  // Two-part heartbeat: "lub-dub"
  const attackTime = 0.02;
  const decayTime = 0.08;
  const volume = 0.15 * intensity;

  // First beat (lub) - lower frequency
  const osc1 = _audioCtx.createOscillator();
  const gain1 = _audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(55, time);
  osc1.frequency.exponentialRampToValueAtTime(35, time + 0.1);
  gain1.gain.setValueAtTime(0, time);
  gain1.gain.linearRampToValueAtTime(volume, time + attackTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

  osc1.connect(gain1);
  gain1.connect(_masterGain);
  osc1.start(time);
  osc1.stop(time + 0.15);

  // Second beat (dub) - slightly higher, slightly delayed
  const osc2 = _audioCtx.createOscillator();
  const gain2 = _audioCtx.createGain();
  const dubTime = time + 0.12;
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(70, dubTime);
  osc2.frequency.exponentialRampToValueAtTime(45, dubTime + 0.08);
  gain2.gain.setValueAtTime(0, dubTime);
  gain2.gain.linearRampToValueAtTime(volume * 0.7, dubTime + attackTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, dubTime + decayTime * 0.8);

  osc2.connect(gain2);
  gain2.connect(_masterGain);
  osc2.start(dubTime);
  osc2.stop(dubTime + 0.12);
}

/* ============================================================
   UPDATE - Called every frame to update audio state
============================================================ */

function updateAudio(bpm, arousal, valence, proximity, stage) {
  if (!_audioInitialized || !_audioEnabled) return;

  // Resume audio context if suspended (browser autoplay policy)
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }

  // Set target state
  _targetState.bpm = bpm;
  _targetState.arousal = arousal;
  _targetState.valence = valence;
  _targetState.proximity = proximity;
  _targetState.stage = stage;

  // Smooth interpolation
  const smoothing = 0.05;
  _audioState.bpm = _lerp(_audioState.bpm, _targetState.bpm, smoothing);
  _audioState.arousal = _lerp(_audioState.arousal, _targetState.arousal, smoothing);
  _audioState.valence = _lerp(_audioState.valence, _targetState.valence, smoothing);
  _audioState.proximity = _lerp(_audioState.proximity, _targetState.proximity, smoothing);
  _audioState.stage = stage;

  const now = _audioCtx.currentTime;

  // Update drone based on valence
  _updateDrone(now);

  // Update texture based on arousal
  _updateTexture(now);

  // Schedule heartbeats
  _scheduleHeartbeats(now);

  // Update master volume based on stage
  _updateMasterVolume(now);
}

function _updateDrone(now) {
  const v = _audioState.valence;
  const a = _audioState.arousal;
  const stage = _audioState.stage;

  // Base frequencies shift based on valence
  // Positive valence: Major feel (C-E-G)
  // Negative valence: Minor/diminished feel (C-Eb-Gb)
  const baseFreqs = [65.41, 98.00, 130.81, 196.00];

  for (let i = 0; i < _droneOscs.length; i++) {
    let freq = baseFreqs[i];

    // Valence affects harmonic content
    if (v < 0) {
      // Negative: Flatten thirds, create tension
      if (i === 1) freq *= 0.944; // Flatten to minor third region
      if (i === 2) freq *= 0.97;
      if (i === 3) freq *= 0.89; // Create dissonance
    } else {
      // Positive: Brighten slightly
      if (i === 2) freq *= 1.02;
      if (i === 3) freq *= 1.05;
    }

    // Arousal affects pitch slightly (higher arousal = slightly sharper)
    freq *= 1 + (a - 0.5) * 0.02;

    _droneOscs[i].frequency.setTargetAtTime(freq, now, 0.5);

    // Volume based on stage and arousal
    let vol = 0.06 / (i + 1);
    if (stage === 1) vol *= 0.3; // Subtle in age stage
    if (stage === 4) vol *= Math.max(0, 1 - (_audioCtx.currentTime % 30) / 30); // Fade in death
    vol *= 0.5 + a * 0.5; // Arousal affects volume

    _droneGains[i].gain.setTargetAtTime(vol, now, 0.3);
  }

  // Filter based on valence and arousal
  // Negative valence = darker (lower cutoff)
  // High arousal = brighter (higher cutoff)
  const filterFreq = 200 + (v + 1) * 150 + a * 300;
  _droneFilter.frequency.setTargetAtTime(filterFreq, now, 0.3);
}

function _updateTexture(now) {
  const a = _audioState.arousal;
  const v = _audioState.valence;
  const stage = _audioState.stage;

  // Texture volume increases with arousal
  let vol = 0.01 + a * 0.06;
  if (stage === 1) vol *= 0.2;
  if (stage === 4) vol *= 0.1;

  // Negative emotions get more texture
  if (v < 0) vol *= 1.3;

  _textureGain.gain.setTargetAtTime(vol, now, 0.3);

  // Filter frequency based on arousal and valence
  // High arousal = higher, more piercing
  // Negative valence = slightly lower, more ominous
  const baseFreq = 400 + a * 1200;
  const valenceShift = v * 200;
  _textureFilter.frequency.setTargetAtTime(baseFreq + valenceShift, now, 0.3);

  // Q (resonance) increases with negative emotion
  const q = 0.5 + Math.max(0, -v) * 2 + a * 1.5;
  _textureFilter.Q.setTargetAtTime(q, now, 0.3);
}

function _scheduleHeartbeats(now) {
  const bpm = _audioState.bpm;
  const beatInterval = 60 / bpm;
  const stage = _audioState.stage;

  // Schedule beats ahead of time for precise timing
  while (_nextBeatTime < now + 0.1) {
    if (_nextBeatTime < now) {
      _nextBeatTime = now;
    }

    // Heartbeat intensity varies by stage
    let intensity = 0.8;
    if (stage === 1) intensity = 0.5 + (_audioState.arousal * 0.3);
    if (stage === 4) intensity = Math.max(0.1, 1 - (_audioCtx.currentTime % 20) / 20);

    _triggerHeartbeat(_nextBeatTime, intensity);
    _nextBeatTime += beatInterval;
  }
}

function _updateMasterVolume(now) {
  const stage = _audioState.stage;
  let vol = 0.35;

  // Stage 4: Fade to silence
  if (stage === 4) {
    // Gradual fade over the death stage
    vol *= 0.3;
  }

  _masterGain.gain.setTargetAtTime(vol, now, 0.5);
}

/* ============================================================
   UTILITIES
============================================================ */

function _lerp(a, b, t) {
  return a + (b - a) * t;
}

function setAudioEnabled(enabled) {
  _audioEnabled = enabled;
  if (_masterGain) {
    _masterGain.gain.setTargetAtTime(enabled ? 0.35 : 0, _audioCtx.currentTime, 0.1);
  }
}

function toggleAudio() {
  setAudioEnabled(!_audioEnabled);
  return _audioEnabled;
}

function isAudioEnabled() {
  return _audioEnabled;
}

// User interaction required to start audio (browser policy)
function startAudioOnInteraction() {
  if (!_audioInitialized) {
    initAudio();
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
}

// Add click listener to start audio
document.addEventListener('click', startAudioOnInteraction, { once: true });
document.addEventListener('keydown', startAudioOnInteraction, { once: true });
