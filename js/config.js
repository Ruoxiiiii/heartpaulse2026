/* =========================================================
   CONFIG - All configuration constants
========================================================= */

const CFG = {
  bg: { h: 0, s: 0, b: 22 },

  heart: {
    anchorX: 0.82,
    anchorY: 0.22,
    sigma: 0.045,
    baseAlpha: 0.18
  },

  // Heart flash visibility by stage (Stage 1 subtle but visible; 2-4 faint)
  heartFlash: {
    stage1: 0.35,
    stage2: 0.12,
    stage3: 0.14,
    stage4: 0.07
  },

  stage: {
    age: 18,
    emotion: 41,
    relationship: 106,
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

// Emotions with valence/arousal ranges (based on Russell's Circumplex Model)
// Valence: -1 (unpleasant) to +1 (pleasant)
// Arousal: 0 (deactivated/calm) to 1 (activated/aroused)
const EMOTIONS = [
  { name: "comfort", v: [+0.40, +0.65], a: [0.15, 0.35] },  // Pleasant, calm
  { name: "excited", v: [+0.60, +0.85], a: [0.65, 0.85] },  // Pleasant, high arousal
  { name: "anxious", v: [-0.50, -0.30], a: [0.55, 0.75] },  // Unpleasant, moderate-high arousal
  { name: "fear",    v: [-0.80, -0.60], a: [0.75, 0.92] },  // Very unpleasant, very high arousal
  { name: "grief",   v: [-0.60, -0.40], a: [0.12, 0.30] }   // Unpleasant, low arousal (sadness)
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
  // Relationship 1 (broken) - 34s
  [
    { emo: "comfort", d: 6 },
    { emo: "excited", d: 6 },
    { emo: "anxious", d: 6 },
    { emo: "fear",    d: 6 },
    { emo: "grief",   d: 5 },
    { emo: "reset",   d: 5 }
  ],
  // Relationship 2 (broken) - 27s
  [
    { emo: "comfort", d: 6 },
    { emo: "excited", d: 5 },
    { emo: "anxious", d: 7 },
    { emo: "grief",   d: 5 },
    { emo: "reset",   d: 4 }
  ],
  // Final relationship (lasting) - 45s
  [
    { emo: "comfort", d: 6 },
    { emo: "excited", d: 6 },
    { emo: "anxious", d: 7 },
    { emo: "comfort", d: 6 },
    { emo: "anxious", d: 5 },
    { emo: "fear",    d: 5 },
    { emo: "comfort", d: 10 }
  ]
];
