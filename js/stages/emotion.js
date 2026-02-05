/* =========================================================
   STAGE 2 - EMOTION
   Emotional states visualized as cloud formations
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
  for (let i = 0; i < 5; i++) {
    s2Field.blobs.push({
      x: width * 0.52 + random(-260, 260),
      y: height * 0.52 + random(-180, 180),
      tx: width * 0.52,
      ty: height * 0.52,
      baseR: random(210, 320),
      seed: 21000 + i * 113.7
    });
  }
}

function stageEmotion(t) {
  const stage2T = t - CFG.stage.age;
  if (!s2 || stage2T >= s2.end) initStage2(stage2T);

  const emo = findEmotion(s2.emoName);

  const v = constrain(s2.valence + smoothNoise(t, 200 + emo.name.length, 0.06) * 0.06, -1, 1);
  const aRaw = clamp01(s2.arousal + smoothNoise(t, 400 + emo.name.length, 0.07) * 0.05);
  const aVis = pow(aRaw, 2.8);

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

  const count = floor(lerp(2, 5, pow(absV, 0.8)));

  const spreadX = lerp(240, width * 0.55, pow(arousalRaw, 1.2));
  const spreadY = lerp(160, height * 0.40, pow(arousalRaw, 1.2));

  // Update targets at slow cadence
  if (t > s2Field.nextUpdateT) {
    s2Field.nextUpdateT = t + lerp(1.4, 0.55, pow(arousalRaw, 1.2));
    for (let i = 0; i < s2Field.blobs.length; i++) {
      const b = s2Field.blobs[i];
      const nx = (noise(b.seed * 0.01, t * 0.12) - 0.5) * 2;
      const ny = (noise(999 + b.seed * 0.01, t * 0.12) - 0.5) * 2;
      b.tx = width * 0.52 + nx * spreadX;
      b.ty = height * 0.52 + ny * spreadY;
    }
  }

  // Smoothly approach targets
  const follow = lerp(0.010, 0.030, pow(arousalRaw, 1.2));
  for (let i = 0; i < count; i++) {
    const b = s2Field.blobs[i];
    b.x = lerp(b.x, b.tx, follow);
    b.y = lerp(b.y, b.ty, follow);

    const c = {
      x: b.x,
      y: b.y,
      baseR: b.baseR * lerp(0.86, 1.10, pow(absV, 0.9)),
      seed: b.seed,
      life: 1,
      morphAmp: lerp(0.02, 1.10, arousalVis),
      morphSpeed: lerp(0.03, 1.85, arousalVis),
      drift: 0.0
    };

    drawClouds([c], col, alpha, t);
  }
}
