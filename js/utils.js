/* =========================================================
   UTILS - Utility functions
========================================================= */

function clamp01(x) {
  return constrain(x, 0, 1);
}

function randRange(a, b) {
  return a + (b - a) * random();
}

function smoothNoise(t, seed, speed = 0.18) {
  return (noise(seed + t * speed) - 0.5) * 2;
}

function smoothstep(a, b, x) {
  x = constrain((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2;
}

function easeOutCubic(x) {
  x = constrain(x, 0, 1);
  return 1 - pow(1 - x, 3);
}

function updateData(bpmTarget, aTarget, vTarget, pTarget) {
  data.bpm = lerp(data.bpm, bpmTarget, 0.10);
  data.arousal = lerp(data.arousal, aTarget, 0.08);
  data.valence = lerp(data.valence, vTarget, 0.08);
  data.proximity = lerp(data.proximity, pTarget, 0.08);
}

function findEmotion(name) {
  return EMOTIONS.find(e => e.name === name);
}
