/* =========================================================
   STAGE 1 - AGE
   ECG visualization showing life stages from infant to elder
========================================================= */

function ageParamsAt(localT) {
  let acc = 0;
  for (let i = 0; i < AGE_SEGMENTS.length; i++) {
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
        const prev = AGE_SEGMENTS[i - 1];
        const k = smoothstep(0, edge, tIn);
        bpm = lerp(prev.bpmBase, bpm, k);
        sharp = lerp(prev.sharp, sharp, k);
        jitter = lerp(prev.jitter, jitter, k);
      }

      if (i < AGE_SEGMENTS.length - 1 && tToEnd < edge) {
        const next = AGE_SEGMENTS[i + 1];
        const k = smoothstep(edge, 0, tToEnd);
        bpm = lerp(bpm, next.bpmBase, k);
        sharp = lerp(sharp, next.sharp, k);
        jitter = lerp(jitter, next.jitter, k);
      }

      return { bpmBase: bpm, sharp, jitter };
    }
    acc = end;
  }
  const last = AGE_SEGMENTS[AGE_SEGMENTS.length - 1];
  return { bpmBase: last.bpmBase, sharp: last.sharp, jitter: last.jitter };
}

function stageAge(t, dt) {
  const u = t / CFG.stage.age;
  const p = ageParamsAt(t);

  const arousalRaw = lerp(0.16, 0.26, smoothstep(0, 1, u));
  const valence = lerp(0.25, 0.45, 0.5 + 0.5 * sin(u * PI));

  const bpm = computeBPM(p.bpmBase, arousalRaw, 0, t, 11.7);
  updateData(bpm, arousalRaw, valence, 0);

  // ECG scroll ramp: start slower, ramp to 1.0 by ~60% of stage
  const scrollMul = lerp(0.62, 1.0, easeOutCubic(clamp01(u / 0.60)));
  ecgScroll += (data.bpm / 60) * dt * scrollMul;
  if (ecgScroll > 1e6) ecgScroll = ecgScroll % 1;

  // Heart flash
  const flashA = CFG.heartFlash.stage1 * lerp(1.0, 0.75, easeInOutQuad(u));
  drawHeartFlash(t, data.bpm, flashA, arousalRaw, false);

  // ECG line
  const lineAlpha = lerp(0.50, 0.10, easeInOutQuad(u));
  const weight = lerp(6.2, 4.2, easeInOutQuad(u));
  drawECGLineIntegrated(t, p.sharp, p.jitter, lineAlpha, weight);
}
