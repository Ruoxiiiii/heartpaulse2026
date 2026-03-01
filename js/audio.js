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
  stage: 1,
  stageBlend: 0 // 0-1 blend factor for stage transitions
};

// Target state for smooth interpolation
let _targetState = {
  bpm: 72,
  arousal: 0.2,
  valence: 0.5,
  proximity: 0,
  stage: 1
};

// Track stage transition timing
let _lastStage = 1;
let _stageTransitionStart = 0;
const _stageTransitionDuration = 3.0; // seconds for smooth transition

// Stage 4 death timing (from config)
let _stage4StartTime = 0;

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
  _textureGain.gain.value = 0.03;

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
  if (!_audioCtx || !_audioEnabled || intensity <= 0) return;

  // Stethoscope heartbeat - muffled "lub-dub" through chest
  const volume = 0.12 * intensity;

  // Create a lowpass filter to simulate hearing through body tissue
  const bodyFilter = _audioCtx.createBiquadFilter();
  bodyFilter.type = 'lowpass';
  bodyFilter.frequency.value = 150; // Muffled, like through stethoscope
  bodyFilter.Q.value = 0.7;
  bodyFilter.connect(_masterGain);

  // === S1 "LUB" - Mitral/Tricuspid valve closure ===
  // Lower pitch, slightly longer, more prominent
  const lub1 = _audioCtx.createOscillator();
  const lubGain1 = _audioCtx.createGain();
  lub1.type = 'sine';
  lub1.frequency.setValueAtTime(45, time);
  lub1.frequency.exponentialRampToValueAtTime(30, time + 0.08);
  lubGain1.gain.setValueAtTime(0, time);
  lubGain1.gain.linearRampToValueAtTime(volume * 1.8, time + 0.01);
  lubGain1.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  lub1.connect(lubGain1);
  lubGain1.connect(bodyFilter);
  lub1.start(time);
  lub1.stop(time + 0.15);

  // Second harmonic for lub body
  const lub2 = _audioCtx.createOscillator();
  const lubGain2 = _audioCtx.createGain();
  lub2.type = 'sine';
  lub2.frequency.setValueAtTime(90, time);
  lub2.frequency.exponentialRampToValueAtTime(55, time + 0.06);
  lubGain2.gain.setValueAtTime(0, time);
  lubGain2.gain.linearRampToValueAtTime(volume * 0.8, time + 0.008);
  lubGain2.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  lub2.connect(lubGain2);
  lubGain2.connect(bodyFilter);
  lub2.start(time);
  lub2.stop(time + 0.12);

  // Thump noise component (realistic valve sound)
  const noiseBuffer = _audioCtx.createBuffer(1, _audioCtx.sampleRate * 0.05, _audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.15));
  }
  const lubNoise = _audioCtx.createBufferSource();
  lubNoise.buffer = noiseBuffer;
  const lubNoiseGain = _audioCtx.createGain();
  const lubNoiseFilter = _audioCtx.createBiquadFilter();
  lubNoiseFilter.type = 'bandpass';
  lubNoiseFilter.frequency.value = 60;
  lubNoiseFilter.Q.value = 2;
  lubNoiseGain.gain.value = volume * 0.5;
  lubNoise.connect(lubNoiseFilter);
  lubNoiseFilter.connect(lubNoiseGain);
  lubNoiseGain.connect(bodyFilter);
  lubNoise.start(time);

  // === S2 "DUB" - Aortic/Pulmonary valve closure ===
  // Higher pitch, shorter, slightly softer
  const dubTime = time + 0.12; // Short pause between lub and dub

  const dub1 = _audioCtx.createOscillator();
  const dubGain1 = _audioCtx.createGain();
  dub1.type = 'sine';
  dub1.frequency.setValueAtTime(65, dubTime);
  dub1.frequency.exponentialRampToValueAtTime(40, dubTime + 0.05);
  dubGain1.gain.setValueAtTime(0, dubTime);
  dubGain1.gain.linearRampToValueAtTime(volume * 1.2, dubTime + 0.008);
  dubGain1.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.07);
  dub1.connect(dubGain1);
  dubGain1.connect(bodyFilter);
  dub1.start(dubTime);
  dub1.stop(dubTime + 0.1);

  // Second harmonic for dub
  const dub2 = _audioCtx.createOscillator();
  const dubGain2 = _audioCtx.createGain();
  dub2.type = 'sine';
  dub2.frequency.setValueAtTime(120, dubTime);
  dub2.frequency.exponentialRampToValueAtTime(70, dubTime + 0.04);
  dubGain2.gain.setValueAtTime(0, dubTime);
  dubGain2.gain.linearRampToValueAtTime(volume * 0.5, dubTime + 0.006);
  dubGain2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.05);
  dub2.connect(dubGain2);
  dubGain2.connect(bodyFilter);
  dub2.start(dubTime);
  dub2.stop(dubTime + 0.08);

  // Dub noise component
  const dubNoise = _audioCtx.createBufferSource();
  const dubNoiseBuffer = _audioCtx.createBuffer(1, _audioCtx.sampleRate * 0.03, _audioCtx.sampleRate);
  const dubNoiseData = dubNoiseBuffer.getChannelData(0);
  for (let i = 0; i < dubNoiseData.length; i++) {
    dubNoiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (dubNoiseData.length * 0.12));
  }
  dubNoise.buffer = dubNoiseBuffer;
  const dubNoiseGain = _audioCtx.createGain();
  const dubNoiseFilter = _audioCtx.createBiquadFilter();
  dubNoiseFilter.type = 'bandpass';
  dubNoiseFilter.frequency.value = 80;
  dubNoiseFilter.Q.value = 2;
  dubNoiseGain.gain.value = volume * 0.35;
  dubNoise.connect(dubNoiseFilter);
  dubNoiseFilter.connect(dubNoiseGain);
  dubNoiseGain.connect(bodyFilter);
  dubNoise.start(dubTime);
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

  const now = _audioCtx.currentTime;

  // Detect stage change and start transition
  if (stage !== _lastStage) {
    _stageTransitionStart = now;
    _lastStage = stage;
  }

  // Track stage 4 start time
  if (stage === 4 && _stage4StartTime <= 0) {
    _stage4StartTime = now;
  }
  // Reset stage 4 time if we leave stage 4
  if (stage !== 4) {
    _stage4StartTime = 0;
  }

  // Calculate stage blend (0 = just entered new stage, 1 = fully in new stage)
  const timeSinceTransition = now - _stageTransitionStart;
  _audioState.stageBlend = Math.min(1, timeSinceTransition / _stageTransitionDuration);

  // Set target state
  _targetState.bpm = bpm;
  _targetState.arousal = arousal;
  _targetState.valence = valence;
  _targetState.proximity = proximity;
  _targetState.stage = stage;

  // Smooth interpolation - slower for smoother audio transitions
  const smoothing = 0.03;
  _audioState.bpm = _lerp(_audioState.bpm, _targetState.bpm, smoothing);
  _audioState.arousal = _lerp(_audioState.arousal, _targetState.arousal, smoothing);
  _audioState.valence = _lerp(_audioState.valence, _targetState.valence, smoothing);
  _audioState.proximity = _lerp(_audioState.proximity, _targetState.proximity, smoothing);
  _audioState.stage = stage;

  // Update drone based on valence and emotion
  _updateDrone(now);

  // Update texture based on arousal and emotion
  _updateTexture(now);

  // Schedule heartbeats
  _scheduleHeartbeats(now);

  // Update master volume based on stage with smooth transitions
  _updateMasterVolume(now);
}

function _updateDrone(now) {
  // Check if audio is fully paused (breaks/transitions)
  const audioPaused = (typeof _audioPaused !== 'undefined' && _audioPaused);

  const v = _audioState.valence;
  const a = _audioState.arousal;
  const stage = _audioState.stage;
  const prox = _audioState.proximity;
  const blend = _audioState.stageBlend;

  // Base frequencies - C major chord
  const baseFreqs = [65.41, 98.00, 130.81, 196.00]; // C2, G2, C3, G3

  for (let i = 0; i < _droneOscs.length; i++) {
    let freq = baseFreqs[i];

    // Emotion-based frequency modulation (stronger in stages 2 & 3)
    const emotionInfluence = (stage === 2 || stage === 3) ? 1.0 : 0.3;

    if (v < 0) {
      // Negative emotions: Minor/diminished feel with more tension
      const tension = Math.abs(v) * emotionInfluence;
      if (i === 1) freq *= _lerp(1.0, 0.89, tension); // Flatten to minor
      if (i === 2) freq *= _lerp(1.0, 0.94, tension); // Add dissonance
      if (i === 3) freq *= _lerp(1.0, 0.84, tension); // Tritone tension for fear/anxiety
    } else {
      // Positive emotions: Warm major feel
      const warmth = v * emotionInfluence;
      if (i === 2) freq *= _lerp(1.0, 1.04, warmth); // Brighten major third
      if (i === 3) freq *= _lerp(1.0, 1.08, warmth); // Perfect fifth shimmer
    }

    // Arousal adds slight pitch variation
    freq *= 1 + (a - 0.5) * 0.03 * emotionInfluence;

    // Stage 3: Proximity creates harmonic beating (two hearts)
    if (stage === 3 && prox > 0.1) {
      const beating = Math.sin(now * 0.5 + i) * prox * 0.02;
      freq *= 1 + beating;
    }

    _droneOscs[i].frequency.setTargetAtTime(freq, now, 0.8);

    // Volume based on stage with smooth transitions
    let vol = 0.06 / (i + 1);

    // Stage 1: Subtle drone, builds toward stage 2
    if (stage === 1) {
      vol *= _lerp(0.2, 0.5, blend);
    }
    // Stage 2 & 3: Full emotional expression
    else if (stage === 2 || stage === 3) {
      const stageVol = stage === 2 ? 1.0 : _lerp(0.9, 1.1, prox);
      vol *= _lerp(0.5, stageVol, blend);
    }
    // Stage 4: Continue from stage 3, then fade with death
    else if (stage === 4) {
      let timeSinceStart = now - _stage4StartTime;
      if (_stage4StartTime <= 0 || timeSinceStart < 0) {
        timeSinceStart = blend * 36;
      }

      const transitionDur = 20;
      const holdDur = 12;
      const fadeDur = 4;

      if (timeSinceStart < transitionDur) {
        // One dies - drop to 50%
        const dropProgress = Math.min(1, timeSinceStart / transitionDur);
        vol *= _lerp(1.0, 0.5, Math.pow(dropProgress, 0.5));
      } else if (timeSinceStart < transitionDur + holdDur) {
        vol *= 0.5;
      } else {
        // Both die - fade out
        const fadeProgress = Math.min(1, (timeSinceStart - transitionDur - holdDur) / fadeDur);
        vol *= _lerp(0.5, 0.05, Math.pow(fadeProgress, 0.7));
      }
    }

    // Arousal affects volume intensity
    vol *= 0.5 + a * 0.6;

    // Mute during audio pause
    if (audioPaused) vol = 0;

    _droneGains[i].gain.setTargetAtTime(vol, now, 0.5);
  }

  // Filter - emotional coloring
  // Negative = darker, Positive = brighter, Arousal = more presence
  let filterFreq = 250 + (v + 1) * 180 + a * 400;

  // Stage transitions affect filter
  if (stage === 1) filterFreq *= _lerp(0.6, 0.9, blend);

  // Stage 4: Gradually darken as death progresses
  if (stage === 4) {
    const timeSinceStart = now - _stage4StartTime;
    const totalDur = 36;
    const progress = Math.min(1, timeSinceStart / totalDur);
    filterFreq *= _lerp(1.0, 0.3, Math.pow(progress, 0.6));
  }

  _droneFilter.frequency.setTargetAtTime(filterFreq, now, 0.5);
}

function _updateTexture(now) {
  // Check if audio is fully paused (breaks/transitions)
  const audioPaused = (typeof _audioPaused !== 'undefined' && _audioPaused);

  const a = _audioState.arousal;
  const v = _audioState.valence;
  const stage = _audioState.stage;
  const prox = _audioState.proximity;
  const blend = _audioState.stageBlend;

  // Base texture volume from arousal
  let vol = 0.01 + a * 0.08;

  // Stage-based volume with smooth transitions
  if (stage === 1) {
    vol *= _lerp(0.1, 0.3, blend); // Subtle, building
  } else if (stage === 2) {
    vol *= _lerp(0.3, 1.0, blend); // Full expression
  } else if (stage === 3) {
    // Proximity affects texture (intimacy reduces noise)
    vol *= _lerp(1.0, _lerp(1.0, 0.6, prox), blend);
  } else if (stage === 4) {
    // Continue from stage 3, then fade with death
    let timeSinceStart = now - _stage4StartTime;
    if (_stage4StartTime <= 0 || timeSinceStart < 0) {
      timeSinceStart = blend * 36;
    }

    const transitionDur = 20;
    const holdDur = 12;
    const fadeDur = 4;

    if (timeSinceStart < transitionDur) {
      const dropProgress = Math.min(1, timeSinceStart / transitionDur);
      vol *= _lerp(1.0, 0.5, Math.pow(dropProgress, 0.5));
    } else if (timeSinceStart < transitionDur + holdDur) {
      vol *= 0.5;
    } else {
      const fadeProgress = Math.min(1, (timeSinceStart - transitionDur - holdDur) / fadeDur);
      vol *= _lerp(0.5, 0.02, Math.pow(fadeProgress, 0.7));
    }
  }

  // Negative emotions add more texture/tension
  if (v < 0) {
    vol *= 1.0 + Math.abs(v) * 0.5;
  }

  // Mute during audio pause
  if (audioPaused) vol = 0;

  _textureGain.gain.setTargetAtTime(vol, now, 0.5);

  // Filter frequency - emotional character
  // High arousal = higher, more piercing (anxiety, excitement)
  // Low arousal = lower, softer (comfort, grief)
  let baseFreq = 300 + a * 1400;

  // Valence shifts the character
  // Positive = warmer, higher shimmer
  // Negative = harsher, lower rumble
  const valenceShift = v * 300;
  baseFreq += valenceShift;

  // Stage 1: More muted
  if (stage === 1) baseFreq *= _lerp(0.5, 0.8, blend);

  // Stage 4: Gradually darken with death
  if (stage === 4) {
    const timeSinceStart = now - _stage4StartTime;
    const totalDur = 36; // total stage 4 duration
    const progress = Math.min(1, timeSinceStart / totalDur);
    baseFreq *= _lerp(1.0, 0.3, Math.pow(progress, 0.5));
  }

  _textureFilter.frequency.setTargetAtTime(Math.max(100, baseFreq), now, 0.5);

  // Q (resonance) - negative emotions are sharper, more resonant
  let q = 0.3 + a * 1.2;
  if (v < 0) q += Math.abs(v) * 2.5; // Anxiety/fear gets piercing
  if (v > 0) q *= 0.7; // Comfort/joy is smoother

  _textureFilter.Q.setTargetAtTime(Math.min(q, 8), now, 0.5);
}

function _scheduleHeartbeats(now) {
  const bpm = _audioState.bpm;
  const beatInterval = 60 / bpm;
  const stage = _audioState.stage;
  const blend = _audioState.stageBlend;
  const a = _audioState.arousal;
  const prox = _audioState.proximity;

  // Check if heartbeat is paused (breaks between stages or reset phases)
  if (typeof _heartbeatPaused !== 'undefined' && _heartbeatPaused) {
    _nextBeatTime = now + 0.1; // Keep time moving but don't trigger beats
    return;
  }

  // Schedule beats ahead of time for precise timing
  while (_nextBeatTime < now + 0.1) {
    if (_nextBeatTime < now) {
      _nextBeatTime = now;
    }

    // Heartbeat intensity varies by stage with smooth transitions
    let intensity = 0.8;

    if (stage === 1) {
      // Stage 1: Prominent heartbeat, fades slightly toward stage 2
      intensity = _lerp(19.2, 15.0, blend);
    } else if (stage === 2) {
      // Stage 2: Strong heartbeat, arousal affects intensity
      intensity = _lerp(15.0, 9.0 + a * 6.0, blend);
    } else if (stage === 3) {
      // Stage 3: Strong heartbeat, proximity and arousal affect intensity
      const proxIntensity = 9.0 + prox * 4.5 + a * 4.5;
      intensity = _lerp(12.0, proxIntensity, blend);
    } else if (stage === 4) {
      // Stage 4: Death progression - one dies (50%), then both die (no beats)
      let timeSinceStart = now - _stage4StartTime;

      // Safety check - if stage4StartTime not set properly, use blend
      if (_stage4StartTime <= 0 || timeSinceStart < 0) {
        timeSinceStart = blend * 36; // Estimate based on blend
      }

      const transitionDur = 20;
      const holdDur = 12;

      // Start consistent with end of stage 3 - use high base intensity
      const baseIntensity = 15.0;

      if (timeSinceStart < transitionDur) {
        // One dies - drop to 50%
        const dropProgress = Math.min(1, timeSinceStart / transitionDur);
        intensity = baseIntensity * _lerp(1.0, 0.5, Math.pow(dropProgress, 0.5));
      } else if (timeSinceStart < transitionDur + holdDur) {
        // Hold at 50%
        intensity = baseIntensity * 0.5;
      } else {
        // Flatline - NO heartbeats at all
        intensity = 0;
      }
    }

    _triggerHeartbeat(_nextBeatTime, intensity);
    _nextBeatTime += beatInterval;
  }
}

function _updateMasterVolume(now) {
  const stage = _audioState.stage;
  const blend = _audioState.stageBlend;
  const a = _audioState.arousal;
  let vol = 0.35;

  // Stage-based volume with smooth transitions
  if (stage === 1) {
    // Stage 1: Start moderate, build slightly
    vol *= _lerp(0.7, 0.85, blend);
  } else if (stage === 2) {
    // Stage 2: Full expression, arousal affects intensity
    vol *= _lerp(0.85, 0.9 + a * 0.15, blend);
  } else if (stage === 3) {
    // Stage 3: Similar to stage 2
    vol *= 0.9 + a * 0.15;
  } else if (stage === 4) {
    // Stage 4: Death progression
    let timeSinceStart = now - _stage4StartTime;
    if (_stage4StartTime <= 0 || timeSinceStart < 0) {
      timeSinceStart = blend * 36;
    }

    const transitionDur = 20;
    const holdDur = 12;
    const fadeDur = 4;

    if (timeSinceStart < transitionDur) {
      // One person dies - smooth drop to 50%
      const dropProgress = Math.min(1, timeSinceStart / transitionDur);
      vol *= _lerp(1.0, 0.5, Math.pow(dropProgress, 0.5));
    } else if (timeSinceStart < transitionDur + holdDur) {
      // Hold at 50%
      vol *= 0.5;
    } else {
      // Final fade - both die
      const fadeProgress = Math.min(1, (timeSinceStart - transitionDur - holdDur) / fadeDur);
      vol *= _lerp(0.5, 0.05, Math.pow(fadeProgress, 0.7));
    }
  }

  _masterGain.gain.setTargetAtTime(vol, now, 0.8);
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
