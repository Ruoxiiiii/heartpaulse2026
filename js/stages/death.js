/* =========================================================
   STAGE 4 - DEATH
   ECG flatline transition
========================================================= */

function stageDeath(t) {
  const stage4T = t - (CFG.stage.age + CFG.stage.emotion + CFG.stage.relationship);

  const trans = CFG.stage.deathTransition;
  const hold = CFG.stage.deathHold;
  const fade = CFG.stage.deathFade;

  const uTrans = clamp01(stage4T / trans);
  const ecgIn = smoothstep(0.0, 0.25, uTrans);
  const inHold = stage4T >= trans && stage4T < trans + hold;
  const inFade = stage4T >= trans + hold;

  const col = { h: 340, s: 35, b: 94 };

  // Partner fades later
  const partnerFade = smoothstep(0.34, 0.78, uTrans);
  const flatten = smoothstep(0.30, 1.00, uTrans);

  // THICKER weights
  const wSelf = lerp(9.0, 3.0, flatten);
  const wPartner = lerp(8.0, 2.5, partnerFade);

  const ampSelf = (inHold || inFade) ? 0 : lerp(66, 0, flatten);
  const ampPartner = (inHold || inFade) ? 0 : ampSelf * (1 - partnerFade);

  let fadeOut = 1;
  if (inFade) {
    const u = clamp01((stage4T - (trans + hold)) / fade);
    fadeOut = 1 - smoothstep(0, 1, u);
  }

  // MORE OPAQUE alpha
  const aBase = 0.45 * fadeOut * ecgIn;
  const aSelf = aBase;
  const aPartner = aBase * (1 - partnerFade);

  // Heart flash stops during flatline
  if (!inHold && !inFade) {
    const heartScale = CFG.heartFlash.stage4;
    drawHeartFlash(t, max(24, data.bpm), heartScale, 0.12, false);
  }

  const yMid = height * 0.52;
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
