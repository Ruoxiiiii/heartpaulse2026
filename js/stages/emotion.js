/* =========================================================
   STAGE 2 - EMOTION
   Emotional states visualized as cloud formations

   Visual mapping:
   - |valence| -> cloud count (neutral = few, strong = many)
   - arousal -> movement speed, spread, distortion
========================================================= */

function initStage2(stage2LocalT) {
  let acc = 0;
  for (let seg of EMO_TIMELINE) {
    const end = acc + seg.d;
    if (stage2LocalT < end) {
      const emo = findEmotion(seg.emo);
      s2 = {
        emoName: seg.emo,
        valence: randRange(emo.v[0], emo.v[1]),
        arousal: randRange(emo.a[0], emo.a[1]),
        end
      };
      return;
    }
    acc = end;
  }
}

function initStage2Field() {
  s2Field = {
    blobs: [],
    nextUpdateT: 0
  };
  // Start with max blobs, count will be controlled by valence
  for (let i = 0; i < 8; i++) {
    s2Field.blobs.push({
      x: width * 0.52 + random(-200, 200),
      y: height * 0.52 + random(-140, 140),
      tx: width * 0.52,
      ty: height * 0.52,
      baseR: random(180, 280),
      seed: 21000 + i * 113.7,
      life: 1,
      targetLife: 1
    });
  }
}

function stageEmotion(t) {
  const stage2T = t - CFG.stage.age;
  if (!s2 || stage2T >= s2.end) initStage2(stage2T);

  const emo = findEmotion(s2.emoName);

  // Smooth valence and arousal with organic noise
  const v = constrain(s2.valence + smoothNoise(t, 200 + emo.name.length, 0.06) * 0.08, -1, 1);
  const aRaw = clamp01(s2.arousal + smoothNoise(t, 400 + emo.name.length, 0.07) * 0.06);
  const aVis = pow(aRaw, 2.2); // Less aggressive power curve for smoother transitions

  const bpm = computeBPM(72, aRaw, 0, t, 21.3);
  updateData(bpm, aRaw, v, 0);

  // Heart flash (no ECG in stage 2)
  drawHeartFlash(t, data.bpm, CFG.heartFlash.stage2, aRaw, false);

  const col = colorFromValenceAndEmotion(v, emo.name);
  drawCloudFieldStage2Persistent(col, v, aRaw, aVis, emo.name, t);
}

function drawCloudFieldStage2Persistent(col, valence, arousalRaw, arousalVis, emoName, t) {
  const absV = abs(valence);
  const alpha = alphaFromValence(valence, emoName, 0.26);

  // Cloud count based on |valence| - neutral emotions show fewer clouds
  const minCount = 1;
  const maxCount = 8;
  const targetCount = floor(lerp(minCount, maxCount, pow(absV, 0.7)));

  // Spread increases dramatically with arousal
  const baseSpreadX = lerp(120, width * 0.50, pow(arousalRaw, 0.9));
  const baseSpreadY = lerp(80, height * 0.38, pow(arousalRaw, 0.9));

  // Target update cadence - faster updates at high arousal (more erratic)
  if (t > s2Field.nextUpdateT) {
    s2Field.nextUpdateT = t + lerp(1.8, 0.3, pow(arousalRaw, 1.1));

    const noiseSpeed = lerp(0.06, 0.20, arousalRaw);
    for (let i = 0; i < s2Field.blobs.length; i++) {
      const b = s2Field.blobs[i];
      const nx = (noise(b.seed * 0.01, t * noiseSpeed) - 0.5) * 2;
      const ny = (noise(999 + b.seed * 0.01, t * noiseSpeed) - 0.5) * 2;

      // More erratic movement at high arousal
      const jitter = arousalRaw > 0.6 ? (random() - 0.5) * 60 * arousalRaw : 0;
      b.tx = width * 0.52 + nx * baseSpreadX + jitter;
      b.ty = height * 0.52 + ny * baseSpreadY + jitter * 0.7;
    }
  }

  // Follow speed - faster at high arousal
  const follow = lerp(0.008, 0.06, pow(arousalRaw, 1.1));

  // Update target life based on count (valence controls visibility)
  for (let i = 0; i < s2Field.blobs.length; i++) {
    s2Field.blobs[i].targetLife = i < targetCount ? 1 : 0;
  }

  // Draw visible blobs
  for (let i = 0; i < s2Field.blobs.length; i++) {
    const b = s2Field.blobs[i];

    // Organic life fade
    b.life = lerp(b.life, b.targetLife, 0.035);
    if (b.life < 0.02) continue;

    // Smooth position following
    b.x = lerp(b.x, b.tx, follow);
    b.y = lerp(b.y, b.ty, follow);

    // Add subtle drift based on arousal
    const driftAmt = lerp(0.2, 1.5, arousalRaw);
    b.x += (noise(b.seed + t * 0.15) - 0.5) * driftAmt;
    b.y += (noise(b.seed + 500 + t * 0.15) - 0.5) * driftAmt * 0.8;

    const c = {
      x: b.x,
      y: b.y,
      baseR: b.baseR * lerp(0.90, 1.08, pow(absV, 0.8)),
      seed: b.seed,
      life: b.life,
      targetLife: b.targetLife,
      morphAmp: lerp(0.05, 1.60, arousalVis),
      morphSpeed: lerp(0.08, 2.80, arousalVis),
      drift: lerp(0.003, 0.15, arousalVis),
      arousal: arousalRaw
    };

    drawClouds([c], col, alpha * b.life, t);
  }
}
