/* =========================================================
   MAIN - p5.js setup, draw loop, and event handlers

   LIFE / RELATIONSHIP / HEART

   Controls:
   - D: Toggle data overlay
   - M: Toggle audio (mute/unmute)
   - R: Start/Stop recording (downloads as video)
   - Shift+R: Restart
========================================================= */

// Recording state
let _isRecording = false;
let _mediaRecorder = null;
let _recordedChunks = [];
let _onRecordingStart = null; // Callback when recording starts
let _onRecordingStop = null;  // Callback when recording stops

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(window.devicePixelRatio || 2); // Use display's native resolution for crisp text
  colorMode(HSB, 360, 100, 100, 1);
  frameRate(60);
  noStroke();

  startTime = millis();
  lastFrameTime = 0;
  ecgScroll = 0;

  initSelfClouds();
  initStage2(0);
  initStage2Field();
  initStage3(0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  noiseLayer = null;
}

function keyPressed() {
  if (key === "d" || key === "D") showData = !showData;
  if (key === "m" || key === "M") toggleAudio();
  if (key === "r" || key === "R") {
    if (keyIsDown(SHIFT)) {
      restart();
    } else {
      toggleRecording();
    }
  }
}

function restart() {
  stopped = false;
  loop();
  startTime = millis();
  lastFrameTime = 0;
  ecgScroll = 0;

  proximity = 0;
  data = { bpm: 72, arousal: 0.2, valence: 0.5, proximity: 0 };

  initSelfClouds();
  initStage2(0);
  initStage2Field();
  initStage3(0);
}

function draw() {
  if (stopped) return;

  const t = (millis() - startTime) / 1000;
  background(CFG.bg.h, CFG.bg.s, CFG.bg.b);

  const dt = max(0, t - lastFrameTime);
  lastFrameTime = t;

  const t1 = CFG.stage.age;
  const t2 = t1 + CFG.stage.emotion;
  const t3 = t2 + CFG.stage.relationship;

  let currentStage = 1;

  if (t < t1) {
    stageAge(t, dt);
    if (showData) drawDataOverlay(1);
    currentStage = 1;
  } else if (t < t2) {
    stageEmotion(t);
    if (showData) drawDataOverlay(2);
    currentStage = 2;
  } else if (t < t3) {
    stageRelationship(t);
    if (showData) drawDataOverlay(3);
    currentStage = 3;
  } else if (t < TOTAL) {
    stageDeath(t);
    currentStage = 4;
  } else {
    stopped = true;
    noLoop();
  }

  // Update audio to match visual mood
  updateAudio(data.bpm, data.arousal, data.valence, data.proximity, currentStage);

  // Film grain overlay - high ISO photography effect
  drawFilmGrain(0.15);

  // Draw data overlay on canvas when recording (HTML overlay won't be captured)
  if (_isRecording) {
    drawDataOverlayOnCanvas(currentStage);
  }
}

/* =========================================================
   RECORDING - Capture canvas + audio as video
========================================================= */

// High-res offscreen canvas for sharp text rendering
let _overlayCanvas = null;
let _overlayCtx = null;
const _overlayScale = 6; // Render at 6x for very crisp text

function _ensureOverlayCanvas() {
  const w = 320;
  const h = 180;
  if (!_overlayCanvas) {
    _overlayCanvas = document.createElement('canvas');
    _overlayCanvas.width = w * _overlayScale;
    _overlayCanvas.height = h * _overlayScale;
    _overlayCtx = _overlayCanvas.getContext('2d', { alpha: true });
    // Enable font smoothing
    _overlayCtx.imageSmoothingEnabled = true;
    _overlayCtx.imageSmoothingQuality = 'high';
  }
  return { w, h };
}

// Draw data overlay directly on canvas for recording capture
function drawDataOverlayOnCanvas(level) {
  const { w, h } = _ensureOverlayCanvas();
  const ctx = _overlayCtx;
  const s = _overlayScale;

  // Clear
  ctx.clearRect(0, 0, w * s, h * s);

  // Scale up for high-res rendering
  ctx.save();
  ctx.scale(s, s);

  // Better text rendering
  ctx.textRendering = 'optimizeLegibility';

  const x = 14;
  let y = 20;
  const rowHeight = 20;
  const barWidth = 110;
  const barHeight = 8;
  const labelWidth = 62;
  const valueWidth = 42;

  // Match HTML overlay font exactly - use system font weight
  ctx.font = '500 11px -apple-system, "SF Mono", "Fira Code", "Consolas", "Monaco", monospace';
  ctx.textBaseline = 'middle';

  // Helper to draw rounded rect (compatible version)
  function roundRect(rx, ry, rw, rh, radius) {
    if (rw <= 0) return;
    const r = Array.isArray(radius) ? radius : [radius, radius, radius, radius];
    ctx.beginPath();
    ctx.moveTo(rx + r[0], ry);
    ctx.lineTo(rx + rw - r[1], ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r[1]);
    ctx.lineTo(rx + rw, ry + rh - r[2]);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r[2], ry + rh);
    ctx.lineTo(rx + r[3], ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r[3]);
    ctx.lineTo(rx, ry + r[0]);
    ctx.quadraticCurveTo(rx, ry, rx + r[0], ry);
    ctx.closePath();
    ctx.fill();
  }

  // Helper to draw a row
  function drawRow(label, value, fraction, isValence = false) {
    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y);

    // Value
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'right';
    ctx.fillText(value, x + labelWidth + valueWidth, y);

    // Bar background
    const barX = x + labelWidth + valueWidth + 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(barX, y - barHeight/2, barWidth, barHeight, 4);

    // Bar fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    if (isValence) {
      // Valence bar with center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(barX + barWidth/2, y - barHeight/2);
      ctx.lineTo(barX + barWidth/2, y + barHeight/2);
      ctx.stroke();

      const v = Math.max(-1, Math.min(1, fraction));
      const vMag = Math.abs(v) * (barWidth/2);
      if (vMag > 0) {
        if (v >= 0) {
          roundRect(barX + barWidth/2, y - barHeight/2, vMag, barHeight, [0, 4, 4, 0]);
        } else {
          roundRect(barX + barWidth/2 - vMag, y - barHeight/2, vMag, barHeight, [4, 0, 0, 4]);
        }
      }
    } else {
      roundRect(barX, y - barHeight/2, Math.max(0, fraction * barWidth), barHeight, 4);
    }

    y += rowHeight;
  }

  // BPM (always shown)
  const bpmFrac = Math.max(0, Math.min(1, (data.bpm - 40) / 100));
  drawRow('BPM', Math.round(data.bpm).toString(), bpmFrac);

  if (level >= 2) {
    // Arousal
    drawRow('Arousal', data.arousal.toFixed(2), data.arousal);

    // Valence
    drawRow('Valence', data.valence.toFixed(2), data.valence, true);
  }

  if (level >= 3) {
    // Proximity
    drawRow('Proximity', data.proximity.toFixed(2), data.proximity);
  }

  // Emotion table (stage 2 only)
  if (level === 2 && s2 && s2.emoName) {
    const emo = findEmotion(s2.emoName);
    if (emo) {
      y += 6;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 200, y);
      ctx.stroke();
      y += 14;

      // Header
      ctx.font = '500 10px "SF Mono", "Fira Code", "Consolas", "Monaco", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.textAlign = 'left';
      ctx.fillText('Emotion', x, y);
      ctx.textAlign = 'center';
      ctx.fillText('Valence', x + 100, y);
      ctx.fillText('Arousal', x + 170, y);

      y += 16;

      // Data
      ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
      ctx.textAlign = 'left';
      ctx.fillText(s2.emoName, x, y);

      const vSign = emo.v[0] >= 0 ? '+' : '-';
      const vMin = Math.abs(emo.v[0]).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      const vMax = Math.abs(emo.v[1]).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      ctx.textAlign = 'center';
      ctx.fillText(`${vSign}${vMin}~${vSign}${vMax}`, x + 100, y);

      const aMin = emo.a[0].toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      const aMax = emo.a[1].toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      ctx.fillText(`${aMin}~${aMax}`, x + 170, y);
    }
  }

  ctx.restore();

  // Draw the high-res overlay canvas onto the main p5 canvas
  push();
  resetMatrix();
  // Use high quality scaling when drawing
  drawingContext.imageSmoothingEnabled = true;
  drawingContext.imageSmoothingQuality = 'high';
  drawingContext.drawImage(_overlayCanvas, 0, 0, w, h);
  pop();
}

function toggleRecording() {
  if (_isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (_isRecording) return;

  // Ensure audio is initialized
  if (!_audioInitialized) {
    initAudio();
  }

  // Get canvas stream (video)
  const canvas = document.querySelector('canvas');
  const canvasStream = canvas.captureStream(60); // 60 FPS

  // Get audio stream from Web Audio API
  let combinedStream;
  if (_audioCtx && _audioEnabled) {
    const audioDestination = _audioCtx.createMediaStreamDestination();
    _masterGain.connect(audioDestination);

    // Combine video and audio tracks
    const videoTrack = canvasStream.getVideoTracks()[0];
    const audioTrack = audioDestination.stream.getAudioTracks()[0];
    combinedStream = new MediaStream([videoTrack, audioTrack]);
  } else {
    // No audio, just video
    combinedStream = canvasStream;
  }

  // Determine best supported format
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/mp4';
  }

  _recordedChunks = [];
  _mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: mimeType,
    videoBitsPerSecond: 25000000 // 25 Mbps for high quality
  });

  _mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      _recordedChunks.push(event.data);
    }
  };

  _mediaRecorder.onstop = () => {
    downloadRecording();
  };

  _mediaRecorder.start(100); // Collect data every 100ms
  _isRecording = true;
  console.log('Recording started...');

  // Hide HTML overlay (we draw it on canvas during recording)
  const htmlOverlay = document.getElementById('data-overlay');
  if (htmlOverlay) htmlOverlay.style.display = 'none';

  // Call callback to hide dev UI etc.
  if (_onRecordingStart) _onRecordingStart();
}

function stopRecording() {
  if (!_isRecording || !_mediaRecorder) return;

  _mediaRecorder.stop();
  _isRecording = false;
  console.log('Recording stopped.');

  // Restore HTML overlay
  const htmlOverlay = document.getElementById('data-overlay');
  if (htmlOverlay) htmlOverlay.style.display = '';

  // Call callback to restore dev UI etc.
  if (_onRecordingStop) _onRecordingStop();
}

function downloadRecording() {
  const blob = new Blob(_recordedChunks, {
    type: _mediaRecorder.mimeType
  });

  // Determine file extension from mime type
  let extension = 'webm';
  if (_mediaRecorder.mimeType.includes('mp4')) {
    extension = 'mp4';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `heart-pulse-${Date.now()}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  _recordedChunks = [];
  console.log('Recording downloaded.');
}
