/* =========================================================
   ECG - Electrocardiogram rendering
   Stable line, no dots, realistic speed
========================================================= */

function gauss(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return exp(-0.5 * z * z);
}

function ecgShape(phase, sharp = 1.0) {
  const s1 = 0.018 / sharp;
  const s2 = 0.010 / sharp;
  const s3 = 0.012 / sharp;
  const qrs =
    gauss(phase, 0.16, s1) * 1.55
    - gauss(phase, 0.13, s2) * 0.55
    - gauss(phase, 0.20, s3) * 0.45;
  const tWave = gauss(phase, 0.38, 0.060) * 0.35;
  return qrs + tWave;
}

// Stage 1 ECG - solid line using globalAlpha to prevent overdraw artifacts
function drawECGLineIntegrated(t, sharp, jitterAmt, alpha01, weight) {
  const y0 = height * 0.52;

  drawingContext.globalAlpha = alpha01;
  stroke(0, 0, 96);
  strokeWeight(weight);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  noFill();

  beginShape();
  for (let x = 0; x <= width; x += 2) {
    const u = x / width;
    const phase = (u * 3.0 + ecgScroll) % 1;
    const y = y0 - ecgShape(phase, sharp) * 48;
    vertex(x, y);
  }
  endShape();

  drawingContext.globalAlpha = 1.0;
  noStroke();
}

// Stage 4 ECG trace - solid line using globalAlpha to prevent overdraw artifacts
function drawECGTrace(t, bpm, y0, col, alpha, weight, amp) {
  drawingContext.globalAlpha = alpha;
  stroke(col.h, col.s, col.b);
  strokeWeight(weight);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  noFill();

  beginShape();
  const windowBeats = 3.0;
  for (let x = 0; x <= width; x += 2) {
    const u = x / width;
    const phase = (u * windowBeats + (t * bpm) / 60) % 1;
    const y = y0 - ecgShape(phase, 1.15) * amp;
    vertex(x, y);
  }
  endShape();

  drawingContext.globalAlpha = 1.0;
  noStroke();
}
