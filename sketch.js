/* =========================================================
   LIFE / RELATIONSHIP / HEART — Baseline-Preserving Revision v2
   (Built directly on your long baseline; only tuned per confirmations)

   Confirmed tweaks included:
   1) Heartbeat organic flash much larger in Stage 1; subtler in Stage 2–3; faint in Stage 4
   2) Stage 2 “mic shaker” fixed: persistent stage-2 blobs w/ smoothed centers (no jitter)
   3) Stage 3: two broken relationships before last; each entry hovers longer; exit as clear as entry
      - anxious hue more red (less yellow)
      - anxious+fear shorter (relationships 1–2), grief still readable, reset gap preserved
   4) Heartbeat flash present in Stage 4 too (fades during flatline hold)
   5) ECG in Stage 1 & 4 thicker / easier to see
      - fear in Stage 2 slightly lifted so it doesn’t vanish into background
   6) Stage 1 ECG scroll starts slower (less dizzy), ramps to normal over Stage 1, still bpm-driven

   Overlay bars preserved (toggle D). R to restart.
========================================================= */

let startTime;
let stopped = false;
let showData = true;

// ---------- CONFIG ----------
const CFG = {
  bg: { h: 240, s: 12, b: 6 },

  heart: {
    anchorX: 0.82,
    anchorY: 0.22,
    sigma: 0.045,
    baseAlpha: 0.18
  },

  // Heart flash visibility by stage (Stage 1 big; 2–3 subtle; 4 faint)
  heartFlash: {
    stage1: 0.70,
    stage2: 0.12,
    stage3: 0.14,
    stage4: 0.07
  },

  stage: {
    age: 18,
    emotion: 41,
    relationship: 160, // allows clearer resets + smoother into death
    deathTransition: 20,
    deathHold: 12,
    deathFade: 4
  }
};

const STAGE4 = CFG.stage.deathTransition + CFG.stage.deathHold + CFG.stage.deathFade;
const TOTAL = CFG.stage.age + CFG.stage.emotion + CFG.stage.relationship + STAGE4;

// ---------- AGE SEGMENTS (total 25s) ----------
const AGE_SEGMENTS = [
  { name: "infant", d: 3,  bpmBase: 120, sharp: 0.90, jitter: 10 },
  { name: "child",  d: 4,  bpmBase: 95,  sharp: 0.95, jitter: 8  },
  { name: "teen",   d: 5,  bpmBase: 78,  sharp: 1.05, jitter: 6  },
  { name: "adult",  d: 7,  bpmBase: 72,  sharp: 1.20, jitter: 3  },
  { name: "elder",  d: 6,  bpmBase: 68,  sharp: 1.05, jitter: 4  }
];

// ---------- EMOTIONS (scientific ranges preserved) ----------
const EMOTIONS = [
  { name: "comfort", v: [+0.35, +0.70], a: [0.10, 0.30] },
  { name: "excited", v: [+0.55, +0.95], a: [0.75, 0.95] },
  { name: "anxious", v: [-0.70, -0.35], a: [0.60, 0.85] },
  { name: "fear",    v: [-0.92, -0.60], a: [0.85, 1.00] },
  { name: "grief",   v: [-0.55, -0.20], a: [0.05, 0.25] }
];

// Stage 2 fixed order (sum 34)
const EMO_TIMELINE = [
  { emo: "comfort", d: 8 },
  { emo: "excited", d: 8  },
  { emo: "anxious", d: 8  },
  { emo: "fear",    d: 8  },
  { emo: "grief",   d: 9 }
];

// Relationship scripts (tuned durations: anxious+fear slightly shorter in first two)
// + reset gap preserved, each broken relationship ends in grief then reset
const REL_SCRIPTS = [
  // Relationship 1 (broken)
  [
    { emo: "comfort", d: 8 },
    { emo: "excited", d: 6 },
    { emo: "anxious", d: 8 },  // shorter
    { emo: "fear",    d: 6 },  // shorter
    { emo: "grief",   d: 15 }, // keep grief readable
    { emo: "reset",   d: 5  }
  ],
  // Relationship 2 (broken)
  [
    { emo: "comfort", d: 7 },
    { emo: "excited", d: 5 },
    { emo: "anxious", d: 7 },  // shorter
    { emo: "fear",    d: 8 },  // shorter
    { emo: "grief",   d: 13 },
    { emo: "reset",   d: 5 }
  ],
  // Final relationship (two rounds + long comfort ending)
  [
    { emo: "comfort", d: 7 },
    { emo: "excited", d: 5 },
    { emo: "anxious", d: 6 },
    { emo: "fear",    d: 5 },
    { emo: "anxious", d: 5 },
    { emo: "comfort", d: 6 },
    { emo: "anxious", d: 5 },
    { emo: "comfort", d: 8 },
    { emo: "anxious", d: 4 },
    { emo: "comfort", d: 14 },// longer final comfort
  ]
];

// ---------- STATE ----------
let selfClouds = [];
let partnerClouds = [];
let partnerAlive = false;
let partnerHoverUntil = 0;
let partnerEntered = false;
let partnerBirthTime = 0;

let partnerLeaving = false;
let partnerLeaveStart = 0;
let partnerLeaveAlpha = 1.0;

// “testing/hesitation” in approach
let partnerTesting = true;

let s2 = null;
let relIdx = 0;
let relPhaseIdx = 0;
let relPhaseEnd = 0;
let rel = null;
let proximity = 0;

// Data model (smoothed)
let data = { bpm: 72, arousal: 0.2, valence: 0.5, proximity: 0 };

// ECG integrated scroll
let ecgScroll = 0;
let lastFrameTime = 0;

// Stage 2 persistent blob field (prevents “mic shaker”)
let s2Field = null; // { blobs: [{x,y,tx,ty,baseR,seed}], nextUpdateT }

// ---------- SETUP ----------
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
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

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

function keyPressed() {
  if (key === "d" || key === "D") showData = !showData;
  if (key === "r" || key === "R") restart();
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

// ---------- DRAW ----------
function draw() {
  if (stopped) return;

  const t = (millis() - startTime) / 1000;
  background(CFG.bg.h, CFG.bg.s, CFG.bg.b);

  const dt = max(0, t - lastFrameTime);
  lastFrameTime = t;

  const t1 = CFG.stage.age;
  const t2 = t1 + CFG.stage.emotion;
  const t3 = t2 + CFG.stage.relationship;

  if (t < t1) {
    stageAge(t, dt);
    if (showData) drawDataOverlay(1);
  } else if (t < t2) {
    stageEmotion(t);
    if (showData) drawDataOverlay(2);
  } else if (t < t3) {
    stageRelationship(t);
    if (showData) drawDataOverlay(3);
  } else if (t < TOTAL) {
    stageDeath(t);
  } else {
    stopped = true;
    noLoop();
  }
}

/* =========================================================
   UTIL
========================================================= */
function clamp01(x){ return constrain(x,0,1); }
function randRange(a,b){ return a + (b-a)*random(); }
function smoothNoise(t, seed, speed=0.18){ return (noise(seed + t*speed)-0.5)*2; }
function smoothstep(a,b,x){ x=constrain((x-a)/(b-a),0,1); return x*x*(3-2*x); }
function easeInOutQuad(t){ return t<0.5?2*t*t:1-pow(-2*t+2,2)/2; }
function easeOutCubic(x){ x=constrain(x,0,1); return 1 - pow(1-x,3); }

function updateData(bpmTarget, aTarget, vTarget, pTarget) {
  data.bpm = lerp(data.bpm, bpmTarget, 0.10);
  data.arousal = lerp(data.arousal, aTarget, 0.08);
  data.valence = lerp(data.valence, vTarget, 0.08);
  data.proximity = lerp(data.proximity, pTarget, 0.08);
}

function findEmotion(name){ return EMOTIONS.find(e=>e.name===name); }

/* =========================================================
   Color rules
   - anxious made more red (less yellow)
   - fear still deep purple-red but lifted slightly vs background
========================================================= */
function colorFromValenceAndEmotion(valence, emoName) {
  const absV = abs(valence);

  if (emoName === "reset") return { h: 0, s: 0, b: 100 };

  if (valence >= 0) {
    const h = (emoName === "excited") ? 330 : 340;
    const s = lerp(26, 88, absV);
    const b = lerp(86, 97, 0.55 + 0.45*absV);
    return { h, s, b };
  } else {
    if (emoName === "grief") {
      return { h: 200, s: lerp(18, 42, absV), b: lerp(52, 74, 1-absV*0.35) };
    }
    if (emoName === "fear") {
      // lift brightness a bit so it doesn't disappear into bg
      return { h: 342, s: lerp(82, 98, absV), b: lerp(12, 24, 1 - absV*0.55) };
    }
    // anxious: more true red (not yellow/orange)
    return { h: 356, s: lerp(74, 94, absV), b: lerp(22, 44, 0.35 + 0.65*absV) };
  }
}

// opacity: |V| controls presence, fear/anxious have strong floors
function alphaFromValence(valence, emoName, base=0.24) {
  const absV = abs(valence);
  const presence = pow(absV, 0.6);

  let a = base * lerp(0.35, 1.70, presence);

  let floorA = 0.10;
  if (emoName === "reset") floorA = 0.08;
  if (emoName === "comfort") floorA = 0.06;
  if (emoName === "excited") floorA = 0.08;
  if (emoName === "grief")   floorA = 0.16;
  if (emoName === "anxious") floorA = 0.30;
  if (emoName === "fear")    floorA = 0.38;

  if (valence < 0) a *= 1.08;
  a = max(a, floorA);
  return constrain(a, 0, 0.58);
}

/* =========================================================
   BPM model (scientific, with small noise)
========================================================= */
function computeBPM(bpmBase, arousalRaw, proximity, t, seed) {
  const kA = 26;
  const kP = 10;
  const n = smoothNoise(t, seed, 0.15) * 2.0; // +/-2 bpm
  return bpmBase + kA*arousalRaw + kP*proximity + n;
}

/* =========================================================
   Heart contraction / expansion flash (organic, body-located)
   - Larger in Stage 1 (fills most of frame)
   - Subtle in Stage 2–3
   - Faint in Stage 4, fades during flatline hold
========================================================= */
function pulseEnvelope(t, bpm) {
  const phase = ((t*bpm)/60) % 1;
  const g = exp(-sq((phase-0.16)/CFG.heart.sigma));
  return pow(g, 2.4);
}

function drawHeartFlash(t, bpm, stageScale, arousalRaw, bigMode=false) {
  const env = pulseEnvelope(t, bpm);
  if (env < 0.001) return;

  const x0 = width*CFG.heart.anchorX;
  const y0 = height*CFG.heart.anchorY;

  const sharp = lerp(1.4, 2.6, clamp01(arousalRaw));
  const e = pow(env, sharp);

  const baseA = CFG.heart.baseAlpha * stageScale * e;

  // Big in stage1: reaches majority of frame
  const rMax = max(width,height) * 0.16; // smaller, stays local
  const rMin = 8;
  const r0 = lerp(rMin, rMax, pow(e, 0.55));

  const wob = 0.68 + 0.32*noise(2000 + t*0.9);

  noStroke();
  // Draw a few large soft "tissue" washes
  const layers = bigMode ? 7 : 5;
  for (let i=0;i<layers;i++){
    const k = i/(layers);
    const rr = r0*(0.40 + 1.10*k)*wob;
    const a = baseA*(bigMode ? (0.45 - 0.05*i) : (0.75 - 0.12*i));
    fill(0,0,96, max(0,a));

    const ox = (noise(100+i, t*0.7)-0.5)*(bigMode? 20:6);
    const oy = (noise(200+i, t*0.7)-0.5)*(bigMode? 18:5);
    ellipse(x0+ox, y0+oy, rr*1.12, rr*0.92);
  }
}

/* =========================================================
   ECG helpers
========================================================= */
function gauss(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return exp(-0.5 * z * z);
}
function ecgShape(phase, sharp=1.0) {
  const s1 = 0.018 / sharp;
  const s2 = 0.010 / sharp;
  const s3 = 0.012 / sharp;
  const qrs =
    gauss(phase, 0.16, s1) * 1.55
    - gauss(phase, 0.13, s2) * 0.55
    - gauss(phase, 0.20, s3) * 0.45;
  const tWave = gauss(phase, 0.38, 0.060) * 0.35;
  return qrs + tWave;
}

// Stage 1 ECG: integrated scroll with ramp (start slower to reduce dizziness)
function drawECGLineIntegrated(t, sharp, jitterAmt, alpha01, weight) {
  const y0 = height * 0.52;
  stroke(0, 0, 96, alpha01);
  strokeWeight(weight);
  noFill();

  beginShape();
  for (let x=0; x<=width; x+=4){
    const u = x/width;
    const phase = (u*3.0 + ecgScroll) % 1;
    const base = sin(u*TWO_PI*1.0 + t*0.22) * 3;
    const jit = (noise(u*3.0, t*0.25) - 0.5) * jitterAmt;
    const y = y0 + base + jit - ecgShape(phase, sharp) * 48;
    vertex(x,y);
  }
  endShape();
  noStroke();
}

/* =========================================================
   AGE param blending
========================================================= */
function ageParamsAt(localT) {
  let acc = 0;
  for (let i=0;i<AGE_SEGMENTS.length;i++){
    const seg = AGE_SEGMENTS[i];
    const start = acc;
    const end = acc + seg.d;

    if (localT >= start && localT <= end) {
      const edge = 0.85;
      const tIn = localT - start;
      const tToEnd = end - localT;

      let bpm = seg.bpmBase;
      let sharp = seg.sharp;
      let jitter = seg.jitter;

      if (i > 0 && tIn < edge) {
        const prev = AGE_SEGMENTS[i-1];
        const k = smoothstep(0, edge, tIn);
        bpm = lerp(prev.bpmBase, bpm, k);
        sharp = lerp(prev.sharp, sharp, k);
        jitter = lerp(prev.jitter, jitter, k);
      }

      if (i < AGE_SEGMENTS.length-1 && tToEnd < edge) {
        const next = AGE_SEGMENTS[i+1];
        const k = smoothstep(edge, 0, tToEnd);
        bpm = lerp(bpm, next.bpmBase, k);
        sharp = lerp(sharp, next.sharp, k);
        jitter = lerp(jitter, next.jitter, k);
      }

      return { bpmBase: bpm, sharp, jitter };
    }
    acc = end;
  }
  const last = AGE_SEGMENTS[AGE_SEGMENTS.length-1];
  return { bpmBase: last.bpmBase, sharp: last.sharp, jitter: last.jitter };
}

/* =========================================================
   STAGE 1 — AGE
   - ECG thicker & easier to see
   - ECG scroll starts slower, ramps up over stage (less dizzy)
   - Huge heart flash early (fills frame), fades slightly by end of stage 1
========================================================= */
function stageAge(t, dt) {
  const u = t / CFG.stage.age;
  const p = ageParamsAt(t);

  const arousalRaw = lerp(0.16, 0.26, smoothstep(0,1,u));
  const valence = lerp(0.25, 0.45, 0.5 + 0.5*sin(u*PI));

  const bpm = computeBPM(p.bpmBase, arousalRaw, 0, t, 11.7);
  updateData(bpm, arousalRaw, valence, 0);

  // ECG scroll ramp: start slower, ramp to 1.0 by ~60% of stage
  const scrollMul = lerp(0.62, 1.0, easeOutCubic(clamp01(u/0.60)));
  ecgScroll += (data.bpm / 60) * dt * scrollMul;
  if (ecgScroll > 1e6) ecgScroll = ecgScroll % 1;

  // Big heart flash, especially early
  const flashA = CFG.heartFlash.stage1 * lerp(1.0, 0.75, easeInOutQuad(u));
  drawHeartFlash(t, data.bpm, flashA, arousalRaw, false);

  // ECG: thicker and readable, still fades across stage
  const lineAlpha = lerp(0.50, 0.10, easeInOutQuad(u));
  const weight = lerp(6.2, 4.2, easeInOutQuad(u));
  drawECGLineIntegrated(t, p.sharp, p.jitter, lineAlpha, weight);
}

/* =========================================================
   STAGE 2 — EMOTION (fixed sequence)
   - Persistent blob centers with smooth motion (no mic-shaker)
   - Spread increases with arousal (fills screen more) but centers move slowly
========================================================= */
function initStage2(stage2LocalT) {
  let acc=0;
  for (let seg of EMO_TIMELINE){
    const end = acc + seg.d;
    if (stage2LocalT < end){
      const emo = findEmotion(seg.emo);
      s2 = { emoName: seg.emo, valence: randRange(emo.v[0], emo.v[1]), arousal: randRange(emo.a[0], emo.a[1]), end };
      return;
    }
    acc=end;
  }
}

function initStage2Field(){
  // Create persistent blobs, 5 max; actual draw count depends on |valence|
  s2Field = {
    blobs: [],
    nextUpdateT: 0
  };
  for (let i=0;i<5;i++){
    s2Field.blobs.push({
      x: width*0.52 + random(-260,260),
      y: height*0.52 + random(-180,180),
      tx: width*0.52,
      ty: height*0.52,
      baseR: random(210, 320),
      seed: 21000 + i*113.7
    });
  }
}

function stageEmotion(t) {
  const stage2T = t - CFG.stage.age;
  if (!s2 || stage2T >= s2.end) initStage2(stage2T);

  const emo = findEmotion(s2.emoName);

  const v = constrain(s2.valence + smoothNoise(t, 200 + emo.name.length, 0.06)*0.06, -1, 1);
  const aRaw = clamp01(s2.arousal + smoothNoise(t, 400 + emo.name.length, 0.07)*0.05);
  const aVis = pow(aRaw, 2.8);

  const bpm = computeBPM(72, aRaw, 0, t, 21.3);
  updateData(bpm, aRaw, v, 0);

  // subtle heart flash (no ECG in stage 2)
  drawHeartFlash(t, data.bpm, CFG.heartFlash.stage2, aRaw, false);

  const col = colorFromValenceAndEmotion(v, emo.name);
  drawCloudFieldStage2Persistent(col, v, aRaw, aVis, emo.name, t);
}

// Persistent stage2 field to prevent jitter
function drawCloudFieldStage2Persistent(col, valence, arousalRaw, arousalVis, emoName, t) {
  const absV = abs(valence);
  const alpha = alphaFromValence(valence, emoName, 0.26);

  // fewer, larger blobs (as before)
  const count = floor(lerp(2, 5, pow(absV, 0.8)));

  // spread increases with arousal
  const spreadX = lerp(240, width*0.55, pow(arousalRaw, 1.2));
  const spreadY = lerp(160, height*0.40, pow(arousalRaw, 1.2));

  // Update targets at a slow cadence so centers don't jitter
  if (t > s2Field.nextUpdateT) {
    s2Field.nextUpdateT = t + lerp(1.4, 0.55, pow(arousalRaw, 1.2)); // faster at high arousal, still smooth
    for (let i=0;i<s2Field.blobs.length;i++){
      const b = s2Field.blobs[i];
      const nx = (noise(b.seed*0.01, t*0.12) - 0.5) * 2;
      const ny = (noise(999 + b.seed*0.01, t*0.12) - 0.5) * 2;
      b.tx = width*0.52 + nx * spreadX;
      b.ty = height*0.52 + ny * spreadY;
    }
  }

  // Smoothly approach targets (inertia) — this kills “mic-shaker”
  const follow = lerp(0.010, 0.030, pow(arousalRaw, 1.2));
  for (let i=0;i<count;i++){
    const b = s2Field.blobs[i];
    b.x = lerp(b.x, b.tx, follow);
    b.y = lerp(b.y, b.ty, follow);

    const c = {
      x: b.x,
      y: b.y,
      baseR: b.baseR * lerp(0.86, 1.10, pow(absV,0.9)),
      seed: b.seed,
      life: 1,
      morphAmp: lerp(0.02, 1.10, arousalVis),
      morphSpeed: lerp(0.03, 1.85, arousalVis),
      drift: 0.0
    };

    drawClouds([c], col, alpha, t);
  }
}

/* =========================================================
   STAGE 3 — RELATIONSHIP
   - Longer hover before overlap (testing)
   - Leave as clear as come: retreat (longer) then fade
   - Reset gap preserved
========================================================= */
function initStage3(stage3LocalT) {
  relIdx = 0;
  relPhaseIdx = 0;
  relPhaseEnd = 0;
  rel = null;

  proximity = 0;
  partnerAlive = false;
  partnerClouds = [];
  partnerHoverUntil = 0;
  partnerEntered = false;
  partnerBirthTime = 0;

  partnerLeaving = false;
  partnerLeaveStart = 0;
  partnerLeaveAlpha = 1.0;
  partnerTesting = true;

  advanceRelPhase(0);
}

function advanceRelPhase(stage3T) {
  const script = REL_SCRIPTS[relIdx];
  if (!script){ relPhaseEnd = 1e9; return; }

  const phase = script[relPhaseIdx];
  if (!phase){
    relIdx++;
    relPhaseIdx = 0;

    if (relIdx >= REL_SCRIPTS.length) {
      rel = { emoName:"comfort", valence:0.58, arousal:0.18 };
      relPhaseEnd = 1e9;
      return;
    }

    enterNewPartner(stage3T);
    return advanceRelPhase(stage3T);
  }

  if (phase.emo === "reset") {
    rel = { emoName:"reset", valence:0.0, arousal:0.12 };
    relPhaseEnd = stage3T + phase.d;
    relPhaseIdx++;

    partnerAlive = false;
    partnerClouds = [];
    partnerLeaving = false;
    partnerLeaveAlpha = 1.0;
    partnerEntered = false;
    return;
  }

  const emo = findEmotion(phase.emo);
  rel = {
    emoName: phase.emo,
    valence: randRange(emo.v[0], emo.v[1]),
    arousal: randRange(emo.a[0], emo.a[1])
  };

  if (!partnerAlive) enterNewPartner(stage3T);

  relPhaseEnd = stage3T + phase.d;
  relPhaseIdx++;
}

function enterNewPartner(stage3T) {
  partnerAlive = true;
  partnerEntered = false;
  partnerTesting = true;

  // Longer hover/testing before entering overlap
  partnerHoverUntil = stage3T + 4.2;
  partnerBirthTime = stage3T;

  partnerLeaving = false;
  partnerLeaveStart = 0;
  partnerLeaveAlpha = 1.0;

  partnerClouds = [];
  const side = random() < 0.5 ? -1 : 1;

  for (let i=0;i<4;i++){
    const x = side < 0 ? random(-820,-560) : random(width+560, width+820);
    const y = random(height*0.30, height*0.80);
    partnerClouds.push(makeCloud(x,y));
  }
  for (let c of partnerClouds) c.life = 1.0;

  proximity = lerp(0.16, 0.30, relIdx / 2);
}

function stageRelationship(t) {
  const stage3T = t - CFG.stage.age - CFG.stage.emotion;
  // --- Stage 3 -> 4 crossfade: final comfort pink fades out gradually
  const crossFadeDur = 12.0;
  const timeToEnd = CFG.stage.relationship - stage3T;
  const stage3Fade = (timeToEnd < crossFadeDur) ? (timeToEnd / crossFadeDur) : 1.0; // 1 -> 0

  if (stage3T >= relPhaseEnd) advanceRelPhase(stage3T);

  // Timing safety: always end comfort before Stage 4
  const safetyWindow = 12.0;
  if (stage3T > CFG.stage.relationship - safetyWindow) {
    rel.emoName = "comfort";
    rel.valence = 0.58;
    rel.arousal = 0.18;
    proximity = lerp(proximity, 0.70, 0.012);
  }

  let emoName = rel.emoName;
  let v, aRaw;

  if (emoName === "reset") {
    v = 0;
    aRaw = 0.12;
  } else {
    v = constrain(rel.valence + smoothNoise(t, 700 + relIdx*33 + relPhaseIdx, 0.06)*0.07, -1, 1);
    aRaw = clamp01(rel.arousal + smoothNoise(t, 900 + relIdx*33 + relPhaseIdx, 0.08)*0.06);
  }

  const aVis = pow(aRaw, 2.8);

  // emergent proximity dynamics
  let proxVel = 0;
  const maturity = clamp01(relIdx / 2);

  if (!partnerAlive) proxVel = -0.020;
  else if (emoName === "reset") proxVel = -0.030;
  else if (emoName === "grief") proxVel = -0.030;
  else if (emoName === "comfort") proxVel = +0.010;
  else if (emoName === "excited") proxVel = +0.014;
  else if (emoName === "anxious") proxVel = +0.012;
  else if (emoName === "fear") proxVel = lerp(-0.010, +0.006, maturity);

  proximity = constrain(proximity + proxVel * 0.020, 0, 1);

  const isFinal = (relIdx === 2);
  if (isFinal && emoName === "comfort") {
    proximity = lerp(proximity, 0.70, 0.004);
  }

  // hover/testing + approach
  if (partnerAlive) {
    if (stage3T < partnerHoverUntil) {
      for (let c of partnerClouds) {
        c.x += sin(t*0.40 + c.seed) * 0.40;
        c.y += cos(t*0.36 + c.seed) * 0.30;
      }
    } else {
      partnerEntered = true;
    }
  }

  const bpm = computeBPM(72, aRaw, proximity, t, 31.9);
  updateData(bpm, aRaw, v, proximity);

  // subtle heart flash
  const stageScale = (emoName === "reset") ? 0.06 : CFG.heartFlash.stage3;
  drawHeartFlash(t, data.bpm, stageScale, aRaw, false);

  const emotionCol = colorFromValenceAndEmotion(v, emoName);
  const white = { h:0, s:0, b:100 };
  const lightPink = { h:340, s:22, b:98 };

  const inPre = (emoName === "reset") || (partnerAlive && stage3T < partnerHoverUntil);

  // self is white during reset & hover; then pink->emotion
  const selfCol = inPre ? white : lerpColorHSB(lightPink, emotionCol, 0.88);
  const selfAlpha = inPre ? 0.12 : alphaFromValence(v, emoName, 0.26);

  // |v| -> count/presence visible
  setCloudMass(selfClouds, abs(v));
  applyCloudDynamicsNoShake(selfClouds, aRaw, aVis, t, true);
  drawClouds(selfClouds, selfCol, selfAlpha * stage3Fade, t);


  // partner
  if (partnerAlive) {
    setCloudMass(partnerClouds, abs(v)*1.05);

    if (partnerEntered && !partnerLeaving) {
      movePartnerTowardSelfTesting(proximity, t);
    }

    applyCloudDynamicsNoShake(partnerClouds, aRaw, aVis, t, false);

    const colPartner = partnerColorBlend(stage3T, emoName, emotionCol);

    // grief leave: retreat longer, then fade
    if (emoName === "grief") {
      if (!partnerLeaving) {
        partnerLeaving = true;
        partnerLeaveStart = stage3T;
        partnerLeaveAlpha = 1.0;
      }

      const since = stage3T - partnerLeaveStart;

      const sx = width * 0.54;
      const sy = height * 0.52;

      const retreatSpd = 0.62; // clearer retreat
      for (let c of partnerClouds) {
        const dx = c.x - sx;
        const dy = c.y - sy;
        const m = max(1e-4, sqrt(dx*dx + dy*dy));
        c.x += (dx / m) * retreatSpd;
        c.y += (dy / m) * retreatSpd * 0.85;
      }

      const RETREAT_DUR = 8.5; // longer so leaving is as clear as coming
      const FADE_DUR = 5.0;
      if (since > RETREAT_DUR) {
        const uf = clamp01((since - RETREAT_DUR) / FADE_DUR);
        partnerLeaveAlpha = 1 - smoothstep(0, 1, uf);
      }

      if (partnerLeaveAlpha <= 0.01) {
        partnerAlive = false;
        partnerClouds = [];
        proximity = 0;
        partnerLeaving = false;
        partnerLeaveAlpha = 1.0;
      }
    } else {
      partnerLeaving = false;
      partnerLeaveAlpha = 1.0;
    }

    const aP = inPre ? 0.12 : alphaFromValence(v, emoName, 0.28);
    drawClouds(partnerClouds, inPre ? white : colPartner, aP * partnerLeaveAlpha * stage3Fade, t);

  }
}

function partnerColorBlend(stage3T, emoName, emotionCol) {
  const white = { h:0, s:0, b:100 };
  const lightPink = { h:340, s:22, b:98 };

  if (emoName === "reset") return white;
  if (stage3T < partnerHoverUntil) return white;

  const tSinceEnter = max(0, stage3T - partnerHoverUntil);

  // longer white -> pink -> emotion
  const wToPink = smoothstep(0.0, 4.8, tSinceEnter);
  const pinkToEmo = smoothstep(3.6, 12.0, tSinceEnter);

  const mid = lerpColorHSB(white, lightPink, wToPink);
  return lerpColorHSB(mid, emotionCol, pinkToEmo);
}

function lerpColorHSB(c1, c2, k) {
  return {
    h: lerp(c1.h, c2.h, k),
    s: lerp(c1.s, c2.s, k),
    b: lerp(c1.b, c2.b, k)
  };
}

// slower approach with “testing/hesitation” (试探)
function movePartnerTowardSelfTesting(prox, t) {
  const tx = width*0.54;
  const ty = height*0.52;

  for (let c of partnerClouds) {
    const baseK = 0.0022 + 0.0044*prox; // slightly slower
    const hes = 0.55 * exp(-0.05 * max(0, (t*1.0))) * (sin(t*0.7 + c.seed)*0.5);
    c.x = lerp(c.x, tx + sin(c.seed)*44 + hes*18, baseK);
    c.y = lerp(c.y, ty + cos(c.seed)*30 + hes*10, baseK);
  }
}

/* =========================================================
   STAGE 4 — DEATH
   - ECG thicker
   - two lines coexist longer before partner vanishes
   - faint heart flash present and fades during flatline hold
========================================================= */
function stageDeath(t) {
  const stage4T = t - (CFG.stage.age + CFG.stage.emotion + CFG.stage.relationship);

  const trans = CFG.stage.deathTransition;
  const hold = CFG.stage.deathHold;
  const fade = CFG.stage.deathFade;

  const uTrans = clamp01(stage4T / trans);
  const ecgIn = smoothstep(0.0, 0.25, uTrans); // first quarter of transition
  const inHold = stage4T >= trans && stage4T < trans + hold;
  const inFade = stage4T >= trans + hold;

  const col = { h: 340, s: 35, b: 94 };

  // partner fade later (coexist longer)
  const partnerFade = smoothstep(0.34, 0.78, uTrans);
  const flatten = smoothstep(0.30, 1.00, uTrans);

  const wSelf = lerp(6.0, 1.8, flatten);
  const wPartner = lerp(5.4, 1.4, partnerFade);

  const ampSelf = (inHold || inFade) ? 0 : lerp(66, 0, flatten);
  const ampPartner = (inHold || inFade) ? 0 : ampSelf * (1 - partnerFade);

  let fadeOut = 1;
  if (inFade) {
    const u = clamp01((stage4T - (trans + hold)) / fade);
    fadeOut = 1 - smoothstep(0, 1, u);
  }

  const aBase = 0.22 * fadeOut* ecgIn;
  const aSelf = aBase;
  const aPartner = aBase * (1 - partnerFade);

  // Heartbeat stops when self is dead: no flash during flatline hold or after.
  if (!inHold && !inFade) {
    const heartScale = CFG.heartFlash.stage4; // very faint, only during transition
    drawHeartFlash(t, max(24, data.bpm), heartScale, 0.12, false);
  }

  const yMid = height*0.52;
  const yPartner = yMid - 22;
  const ySelf = yMid + 22;

  const bpm = 72;

  if (aPartner > 0.002) drawECGTrace(t, bpm, yPartner, col, aPartner, wPartner, ampPartner);
  if (aSelf > 0.002) drawECGTrace(t, bpm, ySelf, col, aSelf, wSelf, ampSelf);

  if (stage4T >= trans + hold + fade) {
    stopped = true;
    noLoop();
  }
}

function drawECGTrace(t, bpm, y0, col, alpha, weight, amp) {
  stroke(col.h, col.s, col.b, alpha);
  strokeWeight(weight);
  noFill();

  beginShape();
  const windowBeats = 3.0;
  for (let x=0; x<=width; x+=5) {
    const u = x/width;
    const phase = (u*windowBeats + (t*bpm)/60) % 1;
    const y = y0 - ecgShape(phase, 1.15) * amp;
    vertex(x,y);
  }
  endShape();
  noStroke();
}

/* =========================================================
   CLOUD SYSTEM — no-shake translation; arousal drives distortion
========================================================= */
function initSelfClouds() {
  selfClouds = [];
  for (let i=0;i<4;i++){
    selfClouds.push(makeCloud(width*0.50 + random(-40,40), height*0.52 + random(-30,30)));
  }
}

function makeCloud(x,y){
  return {
    x,y,
    baseR: random(135, 235),
    seed: random(10000),
    life: 1,
    morphAmp: 0.0,
    morphSpeed: 0.0,
    drift: 0.0
  };
}

// |valence| -> count + presence visible
function setCloudMass(arr, absV){
  const targetCount = floor(lerp(3, 10, pow(absV, 0.85)));
  while (arr.length < targetCount) {
    const ref = arr[0] || makeCloud(width*0.5,height*0.5);
    arr.push(makeCloud(ref.x + random(-220,220), ref.y + random(-160,160)));
  }
  while (arr.length > targetCount) arr.pop();

  const rScale = lerp(0.98, 1.18, absV);
  for (let c of arr) {
    c.baseR = constrain(c.baseR * (0.996 + 0.010*rScale), 95, 320);
  }
}

// translation clamped hard; distortion shows arousal
function applyCloudDynamicsNoShake(arr, arousalRaw, arousalVis, t, isSelf) {
  const amp = lerp(0.02, 1.10, arousalVis);
  const spd = lerp(0.03, 1.90, arousalVis);
  const drift = lerp(0.0015, 0.050, arousalVis);

  for (let c of arr){
    c.morphAmp = amp;
    c.morphSpeed = spd;
    c.drift = drift;

    const nx = (noise(c.seed + t*0.12*spd, c.y*0.002) - 0.5);
    const ny = (noise(3000 + c.seed + t*0.12*spd, c.x*0.002) - 0.5);

    const scale = isSelf ? 1.0 : 0.95;
    c.x += nx * drift * 0.9 * scale;
    c.y += ny * drift * 0.8 * scale;

    if (arousalRaw < 0.35) {
      c.x = lerp(c.x, width*0.52, 0.006);
      c.y = lerp(c.y, height*0.52, 0.006);
    }
  }
}

function drawClouds(arr, col, alpha, t){
  for (let c of arr){
    if (c.life < 0.02) continue;

    const n = 22;
    const a = alpha * c.life;

    // Precompute curve points
    const pts = [];
    for (let i=0;i<n;i++){
      const ang = (TWO_PI*i)/n;

      const wobble = noise(
        cos(ang)+1+c.seed,
        sin(ang)+1+c.seed*0.33,
        t*0.16*c.morphSpeed
      );

      const rr = c.baseR * (0.74 + 0.78*wobble*(0.85 + c.morphAmp));
      pts.push({
        x: c.x + cos(ang)*rr,
        y: c.y + sin(ang)*rr*0.92
      });
    }

    // Outer glow layers — soft illuminating edge
    const glow = [
      { sc: 1.28, ga: a * 0.03, db: 16 },
      { sc: 1.18, ga: a * 0.07, db: 11 },
      { sc: 1.10, ga: a * 0.14, db: 7  },
      { sc: 1.04, ga: a * 0.26, db: 3  },
    ];
    for (const g of glow) {
      fill(col.h, max(0, col.s - 8), min(100, col.b + g.db), g.ga);
      _cloudCurve(pts, c.x, c.y, n, g.sc);
    }

    // Main body with canvas glow
    const gc = color(col.h, max(0, col.s - 5), min(100, col.b + 10));
    gc.setAlpha(a * 0.45);
    drawingContext.shadowBlur = 22;
    drawingContext.shadowColor = gc.toString();
    fill(col.h, col.s, col.b, a);
    _cloudCurve(pts, c.x, c.y, n, 1.0);
    drawingContext.shadowBlur = 0;

    // Inner luminous core
    fill(col.h, max(0, col.s - 16), min(100, col.b + 15), a * 0.15);
    _cloudCurve(pts, c.x, c.y, n, 0.52);
  }
}

// Closed Catmull-Rom curve, points scaled from (cx,cy)
function _cloudCurve(pts, cx, cy, n, sc) {
  const px = i => cx + (pts[i].x - cx) * sc;
  const py = i => cy + (pts[i].y - cy) * sc;
  beginShape();
  curveVertex(px(n-1), py(n-1));
  for (let i = 0; i < n; i++) curveVertex(px(i), py(i));
  curveVertex(px(0), py(0));
  curveVertex(px(1), py(1));
  endShape(CLOSE);
}

/* =========================================================
   OVERLAY (no panel; text left, bars right)
========================================================= */
function drawBarRow(label, valueText, frac, x, y, barW) {
  fill(0,0,96,0.68);
  text(label, x, y);

  fill(0,0,96,0.55);
  text(valueText, x+64, y);

  const bx = x + 112;
  const by = y - 10;
  const h = 8;

  fill(0,0,96,0.14);
  rect(bx, by, barW, h, 4);

  fill(0,0,96,0.55);
  rect(bx, by, barW*constrain(frac,0,1), h, 4);
}

function drawDataOverlay(level) {
  push();
  resetMatrix();
  textFont('monospace');
  textSize(12);
  noStroke();

  const x = 18;
  let y = 28;
  const barW = 170;
  const gap = 18;

  drawBarRow("BPM", nf(data.bpm,3,0), map(constrain(data.bpm,40,140),40,140,0,1), x, y, barW);

  if (level >= 2) {
    y += gap;
    drawBarRow("Arousal", nf(data.arousal,1,2), data.arousal, x, y, barW);

    y += gap;
    const v = constrain(data.valence, -1, 1);

    fill(0,0,96,0.68);
    text("Valence", x, y);
    fill(0,0,96,0.55);
    text(nf(v,1,2), x+64, y);

    const bx = x + 112;
    const by = y - 10;
    const h = 8;

    fill(0,0,96,0.14);
    rect(bx, by, barW, h, 4);

    fill(0,0,96,0.22);
    rect(bx + barW/2 - 1, by, 2, h, 1);

    const half = barW/2;
    const mag = abs(v) * half;

    if (v >= 0) fill(340,35,94,0.58);
    else fill(0,85,40,0.60);

    if (v >= 0) rect(bx + half, by, mag, h, 4);
    else rect(bx + half - mag, by, mag, h, 4);
  }

  if (level >= 3) {
    y += gap;
    drawBarRow("Proxim", nf(data.proximity,1,2), data.proximity, x, y, barW);
  }

  pop();
}


