/* =========================================================
   STAGE 3 - RELATIONSHIP
   Two cloud formations representing self and partner

   Visual mapping:
   - |valence| -> cloud count per entity
   - arousal -> movement intensity, spread, distortion
   - proximity -> distance between clouds (0=far, 1=close)

   Proximity rules:
   - Always starts from 0
   - Comfort: 0.4 (1st) -> 0.5 (2nd) -> 0.6 (3rd/final)
   - Excited, Anxious, Fear: 0.7
   - Grief: decreases toward 0.2
========================================================= */

// Track comfort occurrences for progressive proximity
let comfortCount = 0;

function initStage3(stage3LocalT) {
  relIdx = 0;
  relPhaseIdx = 0;
  relPhaseEnd = 0;
  rel = null;

  proximity = 0;
  comfortCount = 0;
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
  if (!script) { relPhaseEnd = 1e9; return; }

  const phase = script[relPhaseIdx];
  if (!phase) {
    relIdx++;
    relPhaseIdx = 0;

    if (relIdx >= REL_SCRIPTS.length) {
      rel = { emoName: "comfort", valence: 0.52, arousal: 0.22 };
      comfortCount++;
      relPhaseEnd = 1e9;
      return;
    }

    enterNewPartner(stage3T);
    return advanceRelPhase(stage3T);
  }

  if (phase.emo === "reset") {
    rel = { emoName: "reset", valence: 0.0, arousal: 0.12 };
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

  // IMPORTANT: Enter new partner BEFORE tracking comfort count
  // so comfortCount isn't reset after being incremented
  if (!partnerAlive) enterNewPartner(stage3T);

  // Track comfort count for progressive proximity (after partner setup)
  if (phase.emo === "comfort") {
    comfortCount++;
  }

  relPhaseEnd = stage3T + phase.d;
  relPhaseIdx++;
}

function enterNewPartner(stage3T) {
  partnerAlive = true;
  partnerEntered = false;
  partnerTesting = true;

  partnerHoverUntil = stage3T + 4.2;
  partnerBirthTime = stage3T;

  partnerLeaving = false;
  partnerLeaveStart = 0;
  partnerLeaveAlpha = 1.0;

  // Always start proximity from 0 for new relationship
  proximity = 0;
  // NOTE: comfortCount is NOT reset here - it accumulates across all relationships

  partnerClouds = [];
  const side = random() < 0.5 ? -1 : 1;

  for (let i = 0; i < 4; i++) {
    const x = side < 0 ? random(-820, -560) : random(width + 560, width + 820);
    const y = random(height * 0.30, height * 0.80);
    const c = makeCloud(x, y);
    c.life = 0.01;
    c.targetLife = 1;
    partnerClouds.push(c);
  }
}

// Get target proximity based on emotion
// Comfort: 0.4 -> 0.5 -> 0.6 (progressive)
// Excited, Anxious, Fear: 0.7
function getTargetProximity(emoName) {
  switch (emoName) {
    case "comfort":
      if (comfortCount <= 1) return 0.40;
      if (comfortCount === 2) return 0.50;
      return 0.60;
    case "excited":
      return 0.70;
    case "anxious":
      return 0.70;
    case "fear":
      return 0.70;
    case "grief":
      return 0.20;
    case "reset":
      return 0;
    default:
      return 0.40;
  }
}

function stageRelationship(t) {
  const stage3T = t - CFG.stage.age - CFG.stage.emotion;

  // Stage 3 -> 4 crossfade
  const crossFadeDur = 12.0;
  const timeToEnd = CFG.stage.relationship - stage3T;
  const stage3Fade = (timeToEnd < crossFadeDur) ? (timeToEnd / crossFadeDur) : 1.0;

  if (stage3T >= relPhaseEnd) advanceRelPhase(stage3T);

  // Safety: end in comfort before Stage 4
  const safetyWindow = 12.0;
  if (stage3T > CFG.stage.relationship - safetyWindow) {
    rel.emoName = "comfort";
    rel.valence = 0.52;
    rel.arousal = 0.22;
  }

  let emoName = rel.emoName;
  let v, aRaw;

  if (emoName === "reset") {
    v = 0;
    aRaw = 0.12;
  } else {
    v = constrain(rel.valence + smoothNoise(t, 700 + relIdx * 33 + relPhaseIdx, 0.06) * 0.08, -1, 1);
    aRaw = clamp01(rel.arousal + smoothNoise(t, 900 + relIdx * 33 + relPhaseIdx, 0.08) * 0.07);
  }

  const aVis = pow(aRaw, 2.2);
  const absV = abs(v);

  // Proximity dynamics - smoothly move toward target value
  const targetProx = getTargetProximity(emoName);
  const proxSpeed = 0.05;  // Fast enough to see changes clearly
  proximity = lerp(proximity, targetProx, proxSpeed);
  proximity = constrain(proximity, 0, 1);

  // Hover/testing + approach
  if (partnerAlive) {
    if (stage3T < partnerHoverUntil) {
      const hoverIntensity = lerp(0.3, 0.8, aRaw);
      for (let c of partnerClouds) {
        c.x += sin(t * 0.40 + c.seed) * hoverIntensity;
        c.y += cos(t * 0.36 + c.seed) * hoverIntensity * 0.75;
      }
    } else {
      partnerEntered = true;
    }
  }

  const bpm = computeBPM(72, aRaw, proximity, t, 31.9);
  updateData(bpm, aRaw, v, proximity);

  // Heart flash
  const stageScale = (emoName === "reset") ? 0.06 : CFG.heartFlash.stage3;
  drawHeartFlash(t, data.bpm, stageScale, aRaw, false);

  const emotionCol = colorFromValenceAndEmotion(v, emoName);
  const white = { h: 0, s: 0, b: 100 };
  const lightPink = { h: 340, s: 22, b: 98 };

  const inPre = (emoName === "reset") || (partnerAlive && stage3T < partnerHoverUntil);

  // Self clouds
  const selfCol = inPre ? white : lerpColorHSB(lightPink, emotionCol, 0.88);
  const selfAlpha = inPre ? 0.12 : alphaFromValence(v, emoName, 0.26);

  setCloudMass(selfClouds, absV, aRaw);
  applyCloudDynamicsNoShake(selfClouds, aRaw, aVis, t, true);
  drawClouds(selfClouds, selfCol, selfAlpha * stage3Fade, t);

  // Partner clouds
  if (partnerAlive) {
    setCloudMass(partnerClouds, absV * 1.05, aRaw);

    if (partnerEntered && !partnerLeaving) {
      movePartnerByProximity(proximity, t, aRaw);
    }

    applyCloudDynamicsNoShake(partnerClouds, aRaw, aVis, t, false);

    const colPartner = partnerColorBlend(stage3T, emoName, emotionCol);

    // Grief: retreat then fade
    if (emoName === "grief") {
      if (!partnerLeaving) {
        partnerLeaving = true;
        partnerLeaveStart = stage3T;
        partnerLeaveAlpha = 1.0;
      }

      const since = stage3T - partnerLeaveStart;
      const sx = width * 0.54;
      const sy = height * 0.52;

      const retreatSpd = lerp(0.4, 0.9, aRaw);
      for (let c of partnerClouds) {
        const dx = c.x - sx;
        const dy = c.y - sy;
        const m = max(1e-4, sqrt(dx * dx + dy * dy));
        c.x += (dx / m) * retreatSpd;
        c.y += (dy / m) * retreatSpd * 0.85;
      }

      const RETREAT_DUR = 8.5;
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
  const white = { h: 0, s: 0, b: 100 };
  const lightPink = { h: 340, s: 22, b: 98 };

  if (emoName === "reset") return white;
  if (stage3T < partnerHoverUntil) return white;

  const tSinceEnter = max(0, stage3T - partnerHoverUntil);

  const wToPink = smoothstep(0.0, 4.8, tSinceEnter);
  const pinkToEmo = smoothstep(3.6, 12.0, tSinceEnter);

  const mid = lerpColorHSB(white, lightPink, wToPink);
  return lerpColorHSB(mid, emotionCol, pinkToEmo);
}

// Move partner clouds based on proximity value
// proximity 0 = far apart (450px), proximity 1 = very close (50px)
function movePartnerByProximity(prox, t, arousal) {
  // Self clouds center around width * 0.46
  const selfCenterX = width * 0.46;
  const selfCenterY = height * 0.52;

  // Distance based on proximity: higher proximity = closer clouds
  const maxDist = 450;  // Distance when proximity = 0
  const minDist = 50;   // Distance when proximity = 1
  const targetDist = lerp(maxDist, minDist, prox);

  // Partner position to the right of self
  const partnerTargetX = selfCenterX + targetDist;
  const partnerTargetY = selfCenterY;

  // Movement speed - faster at higher arousal
  const baseK = lerp(0.012, 0.025, arousal);

  for (let c of partnerClouds) {
    // Individual cloud offset for natural cluster look
    const offsetX = sin(c.seed) * 40;
    const offsetY = cos(c.seed) * 30;

    c.x = lerp(c.x, partnerTargetX + offsetX, baseK);
    c.y = lerp(c.y, partnerTargetY + offsetY, baseK);
  }
}
