/* =========================================================
   STATE - Global state variables
========================================================= */

let startTime;
let stopped = false;
let showData = true;

// Cloud systems
let selfClouds = [];
let partnerClouds = [];

// Partner state
let partnerAlive = false;
let partnerHoverUntil = 0;
let partnerEntered = false;
let partnerBirthTime = 0;
let partnerLeaving = false;
let partnerLeaveStart = 0;
let partnerLeaveAlpha = 1.0;
let partnerTesting = true;

// Stage 2 state
let s2 = null;
let s2Field = null;

// Stage 3 relationship state
let relIdx = 0;
let relPhaseIdx = 0;
let relPhaseEnd = 0;
let rel = null;
let proximity = 0;

// Data model (smoothed values for display)
let data = { bpm: 72, arousal: 0.2, valence: 0.5, proximity: 0 };

// ECG scroll state
let ecgScroll = 0;
let lastFrameTime = 0;
