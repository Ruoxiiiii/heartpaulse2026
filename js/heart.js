/* =========================================================
   HEART - BPM computation and heart flash rendering
========================================================= */

function computeBPM(bpmBase, arousalRaw, proximity, t, seed) {
  const kA = 26;
  const kP = 10;
  const n = smoothNoise(t, seed, 0.15) * 2.0;
  return bpmBase + kA * arousalRaw + kP * proximity + n;
}

function pulseEnvelope(t, bpm) {
  const phase = ((t * bpm) / 60) % 1;
  const g = exp(-sq((phase - 0.16) / CFG.heart.sigma));
  return pow(g, 2.4);
}

function drawHeartFlash(t, bpm, stageScale, arousalRaw, bigMode = false) {
  const env = pulseEnvelope(t, bpm);
  if (env < 0.15) return;

  const x0 = width * CFG.heart.anchorX;
  const y0 = height * CFG.heart.anchorY;

  const sharp = lerp(1.4, 2.6, clamp01(arousalRaw));
  const e = pow(env, sharp);

  const baseA = CFG.heart.baseAlpha * stageScale * e;

  const rMax = max(width, height) * 0.16;
  const rMin = 0;
  const r0 = lerp(rMin, rMax, pow(e, 0.55));

  const wob = 0.68 + 0.32 * noise(2000 + t * 0.9);

  noStroke();
  const layers = bigMode ? 7 : 5;
  for (let i = 0; i < layers; i++) {
    const k = i / layers;
    const rr = r0 * (0.40 + 1.10 * k) * wob;
    const a = baseA * (bigMode ? (0.45 - 0.05 * i) : (0.75 - 0.12 * i));
    fill(0, 0, 96, max(0, a));

    const ox = (noise(100 + i, t * 0.7) - 0.5) * (bigMode ? 20 : 6);
    const oy = (noise(200 + i, t * 0.7) - 0.5) * (bigMode ? 18 : 5);
    ellipse(x0 + ox, y0 + oy, rr * 1.12, rr * 0.92);
  }
}
