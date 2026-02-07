/* =========================================================
   CONFIG - All configuration constants
========================================================= */

const CFG = {
  bg: { h: 240, s: 12, b: 6 },

  heart: {
    anchorX: 0.82,
    anchorY: 0.22,
    sigma: 0.045,
    baseAlpha: 0.18
  },

  // Heart flash visibility by stage (Stage 1 big; 2-3 subtle; 4 faint)
  heartFlash: {
    stage1: 0.70,
    stage2: 0.12,
    stage3: 0.14,
    stage4: 0.07
  },

  stage: {
    age: 18,
    emotion: 41,
    relationship: 160,
    deathTransition: 20,
    deathHold: 12,
    deathFade: 4
  }
};

const STAGE4 = CFG.stage.deathTransition + CFG.stage.deathHold + CFG.stage.deathFade;
const TOTAL = CFG.stage.age + CFG.stage.emotion + CFG.stage.relationship + STAGE4;

// Age segments (infant -> elder)
const AGE_SEGMENTS = [
  { name: "infant", d: 3,  bpmBase: 120, sharp: 0.90, jitter: 10 },
  { name: "child",  d: 4,  bpmBase: 95,  sharp: 0.95, jitter: 8  },
  { name: "teen",   d: 5,  bpmBase: 78,  sharp: 1.05, jitter: 6  },
  { name: "adult",  d: 7,  bpmBase: 72,  sharp: 1.20, jitter: 3  },
  { name: "elder",  d: 6,  bpmBase: 68,  sharp: 1.05, jitter: 4  }
];

// Emotions with valence/arousal ranges
const EMOTIONS = [
  { name: "comfort", v: [+0.35, +0.70], a: [0.10, 0.30] },
  { name: "excited", v: [+0.55, +0.95], a: [0.75, 0.95] },
  { name: "anxious", v: [-0.70, -0.35], a: [0.60, 0.85] },
  { name: "fear",    v: [-0.92, -0.60], a: [0.85, 1.00] },
  { name: "grief",   v: [-0.55, -0.20], a: [0.05, 0.25] }
];

// Stage 2 emotion timeline
const EMO_TIMELINE = [
  { emo: "comfort", d: 8 },
  { emo: "excited", d: 8 },
  { emo: "anxious", d: 8 },
  { emo: "fear",    d: 8 },
  { emo: "grief",   d: 9 }
];

// Relationship scripts for Stage 3
const REL_SCRIPTS = [
  // Relationship 1 (broken)
  [
    { emo: "comfort", d: 8 },
    { emo: "excited", d: 6 },
    { emo: "anxious", d: 8 },
    { emo: "fear",    d: 6 },
    { emo: "grief",   d: 15 },
    { emo: "reset",   d: 5  }
  ],
  // Relationship 2 (broken)
  [
    { emo: "comfort", d: 7 },
    { emo: "excited", d: 5 },
    { emo: "anxious", d: 7 },
    { emo: "fear",    d: 8 },
    { emo: "grief",   d: 13 },
    { emo: "reset",   d: 5 }
  ],
  // Final relationship (lasting)
  [
    { emo: "comfort", d: 7 },
    { emo: "excited", d: 5 },
    { emo: "anxious", d: 6 },
    { emo: "comfort", d: 6 },
    { emo: "anxious", d: 5 },
    { emo: "fear",    d: 5 },
    { emo: "comfort", d: 14 }
  ]
];
