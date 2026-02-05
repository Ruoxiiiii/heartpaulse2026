/* =========================================================
   ECG - Electrocardiogram rendering
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

// Stage 1 ECG with integrated scroll
function drawECGLineIntegrated(t, sharp, jitterAmt, alpha01, weight) {
  const y0 = height * 0.52;
  stroke(0, 0, 96, alpha01);
  strokeWeight(weight);
  noFill();

  beginShape();
  for (let x = 0; x <= width; x += 4) {
    const u = x / width;
    const phase = (u * 3.0 + ecgScroll) % 1;
    const base = sin(u * TWO_PI * 1.0 + t * 0.22) * 3;
    const jit = (noise(u * 3.0, t * 0.25) - 0.5) * jitterAmt;
    const y = y0 + base + jit - ecgShape(phase, sharp) * 48;
    vertex(x, y);
  }
  endShape();
  noStroke();
}

// Stage 4 ECG trace
function drawECGTrace(t, bpm, y0, col, alpha, weight, amp) {
  stroke(col.h, col.s, col.b, alpha);
  strokeWeight(weight);
  noFill();

  beginShape();
  const windowBeats = 3.0;
  for (let x = 0; x <= width; x += 5) {
    const u = x / width;
    const phase = (u * windowBeats + (t * bpm) / 60) % 1;
    const y = y0 - ecgShape(phase, 1.15) * amp;
    vertex(x, y);
  }
  endShape();
  noStroke();
}
